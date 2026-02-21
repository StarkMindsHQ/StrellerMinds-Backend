import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as Handlebars from 'handlebars';
import { EmailTemplate, TemplateStatus } from './entities/email-template.entity';
import {
  TemplateAnalyticsEvent,
  TemplateEventType,
} from './entities/template-analytics-event.entity';
import {
  AbTestStatus,
  AbTestVariant,
  AbTestWinnerCriteria,
  EmailAbTest,
} from './entities/email-ad-test.entity';
import { EmailTemplateVersion } from './entities/email-template-version.entity';
import {
  CreateAbTestDto,
  CreateTemplateDto,
  CreateTemplateVersionDto,
  PublishVersionDto,
  RenderTemplateDto,
  RollbackVersionDto,
  TemplateAnalyticsQueryDto,
  TestSendDto,
  UpdateTemplateDto,
} from './dto/email-template.dto';
import juice from 'juice';

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
  preheader: string;
  templateId: string;
  templateVersionId: string;
  abTestId?: string;
  variantId?: string;
  locale: string;
}

export interface TemplatePerformance {
  templateId: string;
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  spamRate: number;
  byLocale: Record<string, { sent: number; openRate: number; clickRate: number }>;
  byVersion: Array<{ version: number; sent: number; openRate: number }>;
  timeline: Array<{ date: string; sent: number; opened: number; clicked: number }>;
}

// Register custom Handlebars helpers
Handlebars.registerHelper('formatDate', (date: string, format: string) => {
  if (!date) return '';
  const d = new Date(date);
  if (format === 'short') return d.toLocaleDateString();
  if (format === 'long') return d.toLocaleDateString(undefined, { dateStyle: 'full' });
  return d.toISOString();
});

Handlebars.registerHelper('currency', (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
});

Handlebars.registerHelper('truncate', (str: string, len: number) => {
  if (!str || str.length <= len) return str;
  return str.slice(0, len) + '…';
});

Handlebars.registerHelper('ifEquals', function (a, b, opts) {
  return a === b ? opts.fn(this) : opts.inverse(this);
});

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  // In-memory compiled template cache: `${templateId}:${version}:${locale}` → compiled fn
  private compiledCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepo: Repository<EmailTemplate>,

    @InjectRepository(EmailTemplateVersion)
    private versionRepo: Repository<EmailTemplateVersion>,

    @InjectRepository(EmailAbTest)
    private abTestRepo: Repository<EmailAbTest>,

    @InjectRepository(TemplateAnalyticsEvent)
    private analyticsRepo: Repository<TemplateAnalyticsEvent>,
  ) {}

  // ─── Template CRUD ────────────────────────────────────────────────────────

  async createTemplate(dto: CreateTemplateDto, userId: string): Promise<EmailTemplate> {
    const existing = await this.templateRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Template slug '${dto.slug}' already exists`);

    const template = this.templateRepo.create({
      ...dto,
      availableLocales: dto.availableLocales ?? ['en'],
      defaultLocale: dto.defaultLocale ?? 'en',
      createdById: userId,
    });

    return this.templateRepo.save(template);
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string): Promise<EmailTemplate> {
    const template = await this.findTemplateOrFail(id);
    Object.assign(template, { ...dto, updatedById: userId });
    return this.templateRepo.save(template);
  }

  async listTemplates(filters?: {
    status?: TemplateStatus;
    category?: string;
    search?: string;
  }): Promise<EmailTemplate[]> {
    const qb = this.templateRepo.createQueryBuilder('t').orderBy('t.updatedAt', 'DESC');

    if (filters?.status) qb.andWhere('t.status = :status', { status: filters.status });
    if (filters?.category) qb.andWhere('t.category = :category', { category: filters.category });
    if (filters?.search) {
      qb.andWhere('(t.name ILIKE :q OR t.slug ILIKE :q OR t.description ILIKE :q)', {
        q: `%${filters.search}%`,
      });
    }

    return qb.getMany();
  }

  async getTemplate(id: string): Promise<EmailTemplate> {
    return this.findTemplateOrFail(id);
  }

  async getTemplateBySlug(slug: string): Promise<EmailTemplate> {
    const t = await this.templateRepo.findOne({ where: { slug } });
    if (!t) throw new NotFoundException(`Template '${slug}' not found`);
    return t;
  }

  async archiveTemplate(id: string): Promise<void> {
    await this.findTemplateOrFail(id);
    await this.templateRepo.update(id, { status: TemplateStatus.ARCHIVED });
  }

  // ─── Versioning ───────────────────────────────────────────────────────────

  async createVersion(
    templateId: string,
    dto: CreateTemplateVersionDto,
    userId: string,
  ): Promise<EmailTemplateVersion> {
    const template = await this.findTemplateOrFail(templateId);
    const locale = dto.locale ?? template.defaultLocale;

    // Next version number for this template+locale
    const latest = await this.versionRepo.findOne({
      where: { templateId, locale },
      order: { version: 'DESC' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const version = this.versionRepo.create({
      templateId,
      locale,
      version: nextVersion,
      subject: dto.subject,
      htmlBody: dto.htmlBody,
      textBody: dto.textBody ?? this.htmlToText(dto.htmlBody),
      preheader: dto.preheader,
      mjmlSource: dto.mjmlSource,
      changeNotes: dto.changeNotes,
      isPublished: false,
      createdById: userId,
    });

    const saved = await this.versionRepo.save(version);

    // Invalidate cache for this template+locale
    this.invalidateCache(templateId, locale);

    return saved;
  }

  async listVersions(templateId: string, locale?: string): Promise<EmailTemplateVersion[]> {
    await this.findTemplateOrFail(templateId);
    const where: any = { templateId };
    if (locale) where.locale = locale;
    return this.versionRepo.find({ where, order: { version: 'DESC' } });
  }

  async publishVersion(templateId: string, dto: PublishVersionDto): Promise<EmailTemplateVersion> {
    const template = await this.findTemplateOrFail(templateId);
    const locale = dto.locale ?? template.defaultLocale;

    const version = await this.versionRepo.findOne({
      where: { templateId, version: dto.version, locale },
    });
    if (!version) {
      throw new NotFoundException(`Version ${dto.version} (${locale}) not found`);
    }

    // Unpublish all other versions for this template+locale
    await this.versionRepo.update({ templateId, locale }, { isPublished: false });

    version.isPublished = true;
    await this.versionRepo.save(version);

    // Bump template's currentVersion and activate it
    await this.templateRepo.update(templateId, {
      currentVersion: dto.version,
      status: TemplateStatus.ACTIVE,
    });

    this.invalidateCache(templateId, locale);
    return version;
  }

  async rollbackVersion(
    templateId: string,
    dto: RollbackVersionDto,
    userId: string,
  ): Promise<EmailTemplateVersion> {
    const template = await this.findTemplateOrFail(templateId);

    const target = await this.versionRepo.findOne({
      where: { templateId, version: dto.targetVersion },
    });
    if (!target) throw new NotFoundException(`Version ${dto.targetVersion} not found`);

    // Create a new version copying the target's content (preserves history)
    return this.createVersion(
      templateId,
      {
        locale: target.locale,
        subject: target.subject,
        htmlBody: target.htmlBody,
        textBody: target.textBody,
        preheader: target.preheader,
        mjmlSource: target.mjmlSource,
        changeNotes: `Rollback to v${dto.targetVersion}${dto.reason ? ': ' + dto.reason : ''}`,
      },
      userId,
    );
  }

  async diffVersions(
    templateId: string,
    versionA: number,
    versionB: number,
    locale: string,
  ): Promise<{ field: string; from: string; to: string }[]> {
    const [a, b] = await Promise.all([
      this.versionRepo.findOne({ where: { templateId, version: versionA, locale } }),
      this.versionRepo.findOne({ where: { templateId, version: versionB, locale } }),
    ]);

    if (!a || !b) throw new NotFoundException('One or both versions not found');

    const diffs: { field: string; from: string; to: string }[] = [];
    const fields: (keyof EmailTemplateVersion)[] = ['subject', 'htmlBody', 'textBody', 'preheader'];

    for (const field of fields) {
      const from = String(a[field] ?? '');
      const to = String(b[field] ?? '');
      if (from !== to) diffs.push({ field, from, to });
    }

    return diffs;
  }

  // ─── Rendering Engine ─────────────────────────────────────────────────────

  async render(dto: RenderTemplateDto): Promise<RenderedEmail> {
    const template = await this.getTemplateBySlug(dto.slug);
    const locale = this.resolveLocale(template, dto.locale);

    let versionRecord: EmailTemplateVersion;
    let abTestId: string | undefined;
    let variantId: string | undefined;

    // If A/B test is running, pick a variant
    if (template.abTestingEnabled && template.activeAbTestId && dto.recipientId) {
      const abTest = await this.abTestRepo.findOne({
        where: { id: template.activeAbTestId, status: AbTestStatus.RUNNING },
      });

      if (abTest) {
        const variant = this.selectVariant(abTest.variants, dto.recipientId);
        versionRecord = await this.versionRepo.findOne({
          where: { id: variant.templateVersionId },
        });
        abTestId = abTest.id;
        variantId = variant.id;
      }
    }

    // Fall back to published version
    if (!versionRecord) {
      versionRecord = await this.versionRepo.findOne({
        where: { templateId: template.id, locale, isPublished: true },
      });
    }

    // Fall back to default locale if locale-specific not found
    if (!versionRecord && locale !== template.defaultLocale) {
      versionRecord = await this.versionRepo.findOne({
        where: { templateId: template.id, locale: template.defaultLocale, isPublished: true },
      });
    }

    if (!versionRecord) {
      throw new NotFoundException(
        `No published version found for template '${dto.slug}' (${locale})`,
      );
    }

    const cacheKey = `${template.id}:${versionRecord.version}:${locale}`;
    let compiledSubject = this.compiledCache.get(`subject:${cacheKey}`);
    let compiledHtml = this.compiledCache.get(`html:${cacheKey}`);
    let compiledText = this.compiledCache.get(`text:${cacheKey}`);

    if (!compiledSubject) {
      compiledSubject = Handlebars.compile(versionRecord.subject);
      compiledHtml = Handlebars.compile(versionRecord.htmlBody);
      compiledText = Handlebars.compile(versionRecord.textBody ?? '');
      this.compiledCache.set(`subject:${cacheKey}`, compiledSubject);
      this.compiledCache.set(`html:${cacheKey}`, compiledHtml);
      this.compiledCache.set(`text:${cacheKey}`, compiledText);
    }

    const ctx = { ...dto.variables, currentYear: new Date().getFullYear() };

    const renderedHtml = juice(compiledHtml(ctx)); // inline CSS

    return {
      subject: compiledSubject(ctx),
      htmlBody: renderedHtml,
      textBody: compiledText(ctx),
      preheader: versionRecord.preheader ? Handlebars.compile(versionRecord.preheader)(ctx) : '',
      templateId: template.id,
      templateVersionId: versionRecord.id,
      abTestId,
      variantId,
      locale,
    };
  }

  async previewTemplate(
    templateId: string,
    version: number,
    locale: string,
    variables: Record<string, any>,
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const v = await this.versionRepo.findOne({
      where: { templateId, version, locale },
    });
    if (!v) throw new NotFoundException('Version not found');

    const ctx = { ...variables, currentYear: new Date().getFullYear() };

    return {
      subject: Handlebars.compile(v.subject)(ctx),
      htmlBody: juice(Handlebars.compile(v.htmlBody)(ctx)),
      textBody: Handlebars.compile(v.textBody ?? '')(ctx),
    };
  }

  async testSend(dto: TestSendDto): Promise<{ success: boolean; rendered: RenderedEmail }> {
    const rendered = await this.render({
      slug: dto.slug,
      variables: dto.variables,
      locale: dto.locale,
    });

    // Actual sending is handled by the email service — here we just return the rendered payload
    this.logger.log(`Test send for template '${dto.slug}' to ${dto.toEmail}`);
    return { success: true, rendered };
  }

  // ─── A/B Testing ──────────────────────────────────────────────────────────

  async createAbTest(
    templateId: string,
    dto: CreateAbTestDto,
    userId: string,
  ): Promise<EmailAbTest> {
    await this.findTemplateOrFail(templateId);

    const totalWeight = dto.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      throw new BadRequestException('Variant weights must sum to 100');
    }

    const abTest = this.abTestRepo.create({
      templateId,
      name: dto.name,
      hypothesis: dto.hypothesis,
      winnerCriteria: dto.winnerCriteria ?? AbTestWinnerCriteria.OPEN_RATE,
      variants: dto.variants.map((v) => ({
        ...v,
        stats: { sent: 0, opened: 0, clicked: 0, converted: 0, unsubscribed: 0, bounced: 0 },
      })),
      confidenceThreshold: dto.confidenceThreshold ?? 95,
      minSampleSize: dto.minSampleSize ?? 100,
      scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null,
      status: AbTestStatus.DRAFT,
      createdById: userId,
    });

    return this.abTestRepo.save(abTest);
  }

  async startAbTest(abTestId: string, templateId: string): Promise<EmailAbTest> {
    const abTest = await this.findAbTestOrFail(abTestId, templateId);

    if (abTest.status !== AbTestStatus.DRAFT) {
      throw new BadRequestException(`Cannot start test in '${abTest.status}' status`);
    }

    // Check if another test is already running
    const running = await this.abTestRepo.findOne({
      where: { templateId, status: AbTestStatus.RUNNING },
    });
    if (running) {
      throw new ConflictException('Another A/B test is already running for this template');
    }

    abTest.status = AbTestStatus.RUNNING;
    abTest.startedAt = new Date();
    await this.abTestRepo.save(abTest);

    await this.templateRepo.update(templateId, {
      abTestingEnabled: true,
      activeAbTestId: abTestId,
    });

    return abTest;
  }

  async stopAbTest(abTestId: string, templateId: string, winnerId?: string): Promise<EmailAbTest> {
    const abTest = await this.findAbTestOrFail(abTestId, templateId);

    abTest.status = AbTestStatus.COMPLETED;
    abTest.endedAt = new Date();

    if (winnerId) {
      const winnerExists = abTest.variants.find((v) => v.id === winnerId);
      if (!winnerExists) throw new BadRequestException(`Variant '${winnerId}' not found`);
      abTest.winnerId = winnerId;
    } else {
      // Auto-determine winner
      abTest.winnerId = this.determineWinner(abTest);
    }

    await this.abTestRepo.save(abTest);

    await this.templateRepo.update(templateId, {
      abTestingEnabled: false,
      activeAbTestId: null,
    });

    return abTest;
  }

  async getAbTest(abTestId: string, templateId: string): Promise<EmailAbTest> {
    return this.findAbTestOrFail(abTestId, templateId);
  }

  async listAbTests(templateId: string): Promise<EmailAbTest[]> {
    return this.abTestRepo.find({
      where: { templateId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async trackEvent(
    templateId: string,
    templateVersionId: string,
    recipientId: string,
    recipientEmail: string,
    eventType: TemplateEventType,
    opts?: {
      abTestId?: string;
      variantId?: string;
      locale?: string;
      clickedUrl?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await this.analyticsRepo.save(
      this.analyticsRepo.create({
        templateId,
        templateVersionId,
        recipientId,
        recipientEmail,
        eventType,
        abTestId: opts?.abTestId,
        variantId: opts?.variantId,
        locale: opts?.locale,
        clickedUrl: opts?.clickedUrl,
        metadata: opts?.metadata,
      }),
    );

    // If part of an A/B test, update variant stats
    if (opts?.abTestId && opts?.variantId) {
      await this.updateVariantStats(opts.abTestId, opts.variantId, eventType);
    }
  }

  async getPerformance(
    templateId: string,
    query: TemplateAnalyticsQueryDto,
  ): Promise<TemplatePerformance> {
    await this.findTemplateOrFail(templateId);

    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 86_400_000);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const events = await this.analyticsRepo.find({
      where: { templateId, createdAt: Between(start, end) },
    });

    const counts = this.countEvents(events);
    const sent = counts[TemplateEventType.SENT] ?? 0;

    const rate = (n: number) => (sent > 0 ? Math.round((n / sent) * 10000) / 100 : 0);

    // By locale
    const localeMap: Record<string, { sent: number; opened: number; clicked: number }> = {};
    for (const e of events) {
      const loc = e.locale ?? 'en';
      if (!localeMap[loc]) localeMap[loc] = { sent: 0, opened: 0, clicked: 0 };
      if (e.eventType === TemplateEventType.SENT) localeMap[loc].sent++;
      if (e.eventType === TemplateEventType.OPENED) localeMap[loc].opened++;
      if (e.eventType === TemplateEventType.CLICKED) localeMap[loc].clicked++;
    }

    const byLocale = Object.fromEntries(
      Object.entries(localeMap).map(([loc, s]) => [
        loc,
        {
          sent: s.sent,
          openRate: rate(s.opened),
          clickRate: rate(s.clicked),
        },
      ]),
    );

    // By version (from versionId → version number mapping)
    const versionIds = [...new Set(events.map((e) => e.templateVersionId))];
    const versions = await this.versionRepo.findByIds(versionIds);
    const versionMap = new Map(versions.map((v) => [v.id, v.version]));

    const versionStats: Record<number, { sent: number; opened: number }> = {};
    for (const e of events) {
      const vn = versionMap.get(e.templateVersionId) ?? 0;
      if (!versionStats[vn]) versionStats[vn] = { sent: 0, opened: 0 };
      if (e.eventType === TemplateEventType.SENT) versionStats[vn].sent++;
      if (e.eventType === TemplateEventType.OPENED) versionStats[vn].opened++;
    }

    const byVersion = Object.entries(versionStats).map(([vn, s]) => ({
      version: Number(vn),
      sent: s.sent,
      openRate: s.sent > 0 ? Math.round((s.opened / s.sent) * 10000) / 100 : 0,
    }));

    // Daily timeline
    const dayMap: Record<string, { sent: number; opened: number; clicked: number }> = {};
    for (const e of events) {
      const day = e.createdAt.toISOString().split('T')[0];
      if (!dayMap[day]) dayMap[day] = { sent: 0, opened: 0, clicked: 0 };
      if (e.eventType === TemplateEventType.SENT) dayMap[day].sent++;
      if (e.eventType === TemplateEventType.OPENED) dayMap[day].opened++;
      if (e.eventType === TemplateEventType.CLICKED) dayMap[day].clicked++;
    }

    const timeline = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, s]) => ({ date, ...s }));

    return {
      templateId,
      totalSent: sent,
      deliveryRate: rate(counts[TemplateEventType.DELIVERED] ?? 0),
      openRate: rate(counts[TemplateEventType.OPENED] ?? 0),
      clickRate: rate(counts[TemplateEventType.CLICKED] ?? 0),
      conversionRate: rate(counts[TemplateEventType.CONVERTED] ?? 0),
      bounceRate: rate(counts[TemplateEventType.BOUNCED] ?? 0),
      unsubscribeRate: rate(counts[TemplateEventType.UNSUBSCRIBED] ?? 0),
      spamRate: rate(counts[TemplateEventType.SPAM_REPORTED] ?? 0),
      byLocale,
      byVersion,
      timeline,
    };
  }

  async getAbTestResults(abTestId: string, templateId: string) {
    const abTest = await this.findAbTestOrFail(abTestId, templateId);

    return {
      abTestId,
      status: abTest.status,
      winnerId: abTest.winnerId,
      variants: abTest.variants.map((v) => ({
        id: v.id,
        label: v.label,
        weight: v.weight,
        stats: v.stats,
        openRate: v.stats.sent > 0 ? (v.stats.opened / v.stats.sent) * 100 : 0,
        clickRate: v.stats.sent > 0 ? (v.stats.clicked / v.stats.sent) * 100 : 0,
        conversionRate: v.stats.sent > 0 ? (v.stats.converted / v.stats.sent) * 100 : 0,
        isWinner: v.id === abTest.winnerId,
      })),
      statisticalSignificance: this.calculateSignificance(abTest),
      startedAt: abTest.startedAt,
      endedAt: abTest.endedAt,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async findTemplateOrFail(id: string): Promise<EmailTemplate> {
    const t = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Template '${id}' not found`);
    return t;
  }

  private async findAbTestOrFail(id: string, templateId: string): Promise<EmailAbTest> {
    const t = await this.abTestRepo.findOne({ where: { id, templateId } });
    if (!t) throw new NotFoundException(`A/B test '${id}' not found`);
    return t;
  }

  private resolveLocale(template: EmailTemplate, requestedLocale?: string): string {
    const locale = requestedLocale ?? template.defaultLocale;
    if (template.availableLocales.includes(locale)) return locale;
    return template.defaultLocale;
  }

  /**
   * Deterministic variant selection based on recipientId hash.
   * Same recipient always gets the same variant within a test.
   */
  private selectVariant(variants: AbTestVariant[], recipientId: string): AbTestVariant {
    let hash = 0;
    for (let i = 0; i < recipientId.length; i++) {
      hash = ((hash << 5) - hash + recipientId.charCodeAt(i)) | 0;
    }
    const bucket = Math.abs(hash) % 100;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) return variant;
    }
    return variants[variants.length - 1];
  }

  private determineWinner(abTest: EmailAbTest): string {
    const sorted = [...abTest.variants].sort((a, b) => {
      const getMetric = (v: AbTestVariant) => {
        if (v.stats.sent === 0) return 0;
        switch (abTest.winnerCriteria) {
          case AbTestWinnerCriteria.OPEN_RATE:
            return v.stats.opened / v.stats.sent;
          case AbTestWinnerCriteria.CLICK_RATE:
            return v.stats.clicked / v.stats.sent;
          case AbTestWinnerCriteria.CONVERSION_RATE:
            return v.stats.converted / v.stats.sent;
          default:
            return 0;
        }
      };
      return getMetric(b) - getMetric(a);
    });
    return sorted[0].id;
  }

  /**
   * Simplified two-proportion z-test for significance.
   * Returns confidence % (0-100).
   */
  private calculateSignificance(abTest: EmailAbTest): number {
    if (abTest.variants.length < 2) return 0;

    const [control, variant] = abTest.variants;
    const n1 = control.stats.sent;
    const n2 = variant.stats.sent;
    if (n1 === 0 || n2 === 0) return 0;

    const p1 = control.stats.opened / n1;
    const p2 = variant.stats.opened / n2;
    const p = (control.stats.opened + variant.stats.opened) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    if (se === 0) return 0;

    const z = Math.abs(p1 - p2) / se;
    // Approximate two-tailed p-value → confidence
    const confidence = (1 - Math.exp(-0.717 * z - 0.416 * z * z)) * 100;
    return Math.min(99.9, Math.round(confidence * 10) / 10);
  }

  private async updateVariantStats(
    abTestId: string,
    variantId: string,
    eventType: TemplateEventType,
  ): Promise<void> {
    const abTest = await this.abTestRepo.findOne({ where: { id: abTestId } });
    if (!abTest) return;

    const variant = abTest.variants.find((v) => v.id === variantId);
    if (!variant) return;

    const fieldMap: Partial<Record<TemplateEventType, keyof AbTestVariant['stats']>> = {
      [TemplateEventType.SENT]: 'sent',
      [TemplateEventType.OPENED]: 'opened',
      [TemplateEventType.CLICKED]: 'clicked',
      [TemplateEventType.CONVERTED]: 'converted',
      [TemplateEventType.UNSUBSCRIBED]: 'unsubscribed',
      [TemplateEventType.BOUNCED]: 'bounced',
    };

    const field = fieldMap[eventType];
    if (field) {
      variant.stats[field]++;
      await this.abTestRepo.save(abTest);

      // Check if we can auto-determine a winner
      if (abTest.status === AbTestStatus.RUNNING && abTest.minSampleSize) {
        const allMeetSample = abTest.variants.every((v) => v.stats.sent >= abTest.minSampleSize);
        if (allMeetSample && this.calculateSignificance(abTest) >= abTest.confidenceThreshold) {
          await this.stopAbTest(abTestId, abTest.templateId);
        }
      }
    }
  }

  private countEvents(
    events: TemplateAnalyticsEvent[],
  ): Partial<Record<TemplateEventType, number>> {
    return events.reduce(
      (acc, e) => {
        acc[e.eventType] = (acc[e.eventType] ?? 0) + 1;
        return acc;
      },
      {} as Partial<Record<TemplateEventType, number>>,
    );
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private invalidateCache(templateId: string, locale: string): void {
    for (const key of this.compiledCache.keys()) {
      if (key.startsWith(`${templateId}:`) && key.endsWith(`:${locale}`)) {
        this.compiledCache.delete(key);
      }
    }
  }
}
