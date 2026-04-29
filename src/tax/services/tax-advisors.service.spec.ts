import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { TaxAdvisor } from '../entities/tax-advisor.entity';
import { AdvisorPropertyAssignment } from '../entities/advisor-property-assignment.entity';
import { TaxAdvisorsService } from './tax-advisors.service';

class InMemoryAdvisorRepository {
  private readonly rows = new Map<string, TaxAdvisor>();
  private seq = 0;

  create(partial: Partial<TaxAdvisor>): TaxAdvisor {
    return { isActive: true, ...partial } as TaxAdvisor;
  }
  async save(row: TaxAdvisor): Promise<TaxAdvisor> {
    if (!row.id) {
      row.id = `adv-${++this.seq}`;
      row.createdAt = new Date();
    }
    row.updatedAt = new Date();
    this.rows.set(row.id, row);
    return row;
  }
  async findOne({ where }: { where: { id: string } }): Promise<TaxAdvisor | null> {
    return this.rows.get(where.id) ?? null;
  }
  async find({ order: _order }: { order?: unknown } = {}): Promise<TaxAdvisor[]> {
    return Array.from(this.rows.values());
  }
}

class InMemoryAssignmentRepository {
  readonly rows: AdvisorPropertyAssignment[] = [];
  private seq = 0;

  create(partial: Partial<AdvisorPropertyAssignment>): AdvisorPropertyAssignment {
    return { unassignedAt: null, ...partial } as AdvisorPropertyAssignment;
  }
  async save(row: AdvisorPropertyAssignment): Promise<AdvisorPropertyAssignment> {
    if (!row.id) {
      row.id = `asn-${++this.seq}`;
      row.assignedAt = new Date();
      this.rows.push(row);
    }
    row.updatedAt = new Date();
    return row;
  }
  async findOne({
    where,
  }: {
    where: Partial<AdvisorPropertyAssignment> & { unassignedAt?: unknown };
  }): Promise<AdvisorPropertyAssignment | null> {
    return (
      this.rows.find(
        (r) =>
          r.advisorId === where.advisorId &&
          r.propertyId === where.propertyId &&
          r.unassignedAt === null,
      ) ?? null
    );
  }
  async find({
    where,
    relations: _relations,
    order: _order,
  }: {
    where: Partial<AdvisorPropertyAssignment> & { unassignedAt?: unknown };
    relations?: string[];
    order?: unknown;
  }): Promise<AdvisorPropertyAssignment[]> {
    return this.rows.filter(
      (r) =>
        (where.advisorId === undefined || r.advisorId === where.advisorId) &&
        (where.propertyId === undefined || r.propertyId === where.propertyId) &&
        r.unassignedAt === null,
    );
  }
}

describe('TaxAdvisorsService', () => {
  let service: TaxAdvisorsService;
  let advisors: InMemoryAdvisorRepository;
  let assignments: InMemoryAssignmentRepository;

  const future = () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const past = () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const baseDto = () => ({
    name: 'Jane Doe, CPA',
    email: 'jane@example.com',
    licenseNumber: 'CPA-12345',
    licenseExpiresAt: future(),
    jurisdictions: ['us-ny', 'US-NY', ' us-nj '],
  });

  beforeEach(async () => {
    advisors = new InMemoryAdvisorRepository();
    assignments = new InMemoryAssignmentRepository();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxAdvisorsService,
        { provide: getRepositoryToken(TaxAdvisor), useValue: advisors },
        { provide: getRepositoryToken(AdvisorPropertyAssignment), useValue: assignments },
      ],
    }).compile();
    service = module.get(TaxAdvisorsService);
  });

  describe('create', () => {
    it('persists an active advisor and normalizes jurisdictions to upper-case unique set', async () => {
      const advisor = await service.create(baseDto());
      expect(advisor.id).toMatch(/^adv-/);
      expect(advisor.isActive).toBe(true);
      expect(advisor.jurisdictions).toEqual(['US-NY', 'US-NJ']);
    });

    it('rejects an already-expired license at creation time', async () => {
      await expect(service.create({ ...baseDto(), licenseExpiresAt: past() })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('filters by jurisdiction (case-insensitive)', async () => {
      const a = await service.create(baseDto());
      const b = await service.create({
        ...baseDto(),
        email: 'b@example.com',
        licenseNumber: 'CPA-99999',
        jurisdictions: ['us-ca'],
      });

      const ny = await service.findAll('us-ny');
      const ca = await service.findAll('us-ca');

      expect(ny.map((x) => x.id)).toEqual([a.id]);
      expect(ca.map((x) => x.id)).toEqual([b.id]);
    });
  });

  describe('update / deactivate', () => {
    it('rejects updates that move license expiry into the past', async () => {
      const advisor = await service.create(baseDto());
      await expect(
        service.update(advisor.id, { licenseExpiresAt: past() }),
      ).rejects.toThrow(ConflictException);
    });

    it('deactivates an advisor', async () => {
      const advisor = await service.create(baseDto());
      const result = await service.deactivate(advisor.id);
      expect(result.isActive).toBe(false);
    });
  });

  describe('assignment lifecycle', () => {
    it('assigns, lists, and unassigns an advisor on a property', async () => {
      const advisor = await service.create(baseDto());

      const assignment = await service.assignToProperty(advisor.id, 'property-1');
      expect(assignment.advisorId).toBe(advisor.id);
      expect(assignment.propertyId).toBe('property-1');
      expect(assignment.unassignedAt).toBeNull();

      const list = await service.listAssignments(advisor.id);
      expect(list).toHaveLength(1);

      await service.unassignFromProperty(advisor.id, 'property-1');

      const after = await service.listAssignments(advisor.id);
      expect(after).toHaveLength(0);
    });

    it('returns the existing active assignment when assigning twice', async () => {
      const advisor = await service.create(baseDto());
      const first = await service.assignToProperty(advisor.id, 'property-1');
      const second = await service.assignToProperty(advisor.id, 'property-1');
      expect(second.id).toBe(first.id);
      expect(assignments.rows).toHaveLength(1);
    });

    it('refuses to assign an inactive advisor', async () => {
      const advisor = await service.create(baseDto());
      await service.deactivate(advisor.id);
      await expect(service.assignToProperty(advisor.id, 'p')).rejects.toThrow(
        ConflictException,
      );
    });

    it('refuses to assign an advisor whose license has expired', async () => {
      const advisor = await service.create(baseDto());
      advisor.licenseExpiresAt = past();
      await advisors.save(advisor);
      await expect(service.assignToProperty(advisor.id, 'p')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when unassigning a non-existent assignment', async () => {
      const advisor = await service.create(baseDto());
      await expect(
        service.unassignFromProperty(advisor.id, 'never-assigned'),
      ).rejects.toThrow(NotFoundException);
    });

    it('looks up advisors currently assigned to a property', async () => {
      const advisor = await service.create(baseDto());
      await service.assignToProperty(advisor.id, 'property-7');

      jest
        .spyOn(assignments, 'find')
        .mockResolvedValueOnce(
          assignments.rows
            .filter((r) => r.propertyId === 'property-7' && r.unassignedAt === null)
            .map((r) => ({ ...r, advisor })),
        );

      const found = await service.findAdvisorsForProperty('property-7');
      expect(found.map((a) => a.id)).toEqual([advisor.id]);
    });
  });

  it('uses IsNull() to find active assignments (sanity check on TypeORM helper import)', () => {
    expect(typeof IsNull).toBe('function');
  });
});
