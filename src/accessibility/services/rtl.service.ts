import { Injectable } from '@nestjs/common';

/**
 * RTL (Right-to-Left) language support service
 * Handles directionality, styling, and layout for RTL languages
 */
@Injectable()
export class RTLService {
  /**
   * RTL languages
   */
  private readonly RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'ji']);

  /**
   * Check if language is RTL
   */
  isRTL(language: string): boolean {
    return this.RTL_LANGUAGES.has(language.toLowerCase().split('-')[0]);
  }

  /**
   * Get text direction for a language
   */
  getDirection(language: string): 'ltr' | 'rtl' {
    return this.isRTL(language) ? 'rtl' : 'ltr';
  }

  /**
   * Get HTML lang attribute with direction
   */
  getHtmlAttributes(language: string) {
    return {
      lang: language,
      dir: this.getDirection(language),
    };
  }

  /**
   * Build CSS classes for RTL/LTR
   */
  buildDirectionalClasses(language: string, baseClass?: string) {
    const direction = this.getDirection(language);
    const directionClass = direction === 'rtl' ? 'rtl' : 'ltr';

    return baseClass ? `${baseClass} ${directionClass}` : directionClass;
  }

  /**
   * Flip margin/padding based on direction
   */
  flipSpacing(
    language: string,
    spacing: { top?: number; right?: number; bottom?: number; left?: number },
  ) {
    if (!this.isRTL(language)) {
      return spacing;
    }

    return {
      top: spacing.top,
      right: spacing.left,
      bottom: spacing.bottom,
      left: spacing.right,
    };
  }

  /**
   * Get positioning for RTL/LTR
   */
  getPosition(language: string, position: { left?: string; right?: string }) {
    if (!this.isRTL(language)) {
      return position;
    }

    return {
      left: position.right,
      right: position.left,
    };
  }

  /**
   * Rotate values based on direction
   */
  rotateValues(language: string, start: any, end: any) {
    return this.isRTL(language) ? [end, start] : [start, end];
  }

  /**
   * Get text alignment based on direction
   */
  getTextAlign(language: string): 'left' | 'right' {
    return this.isRTL(language) ? 'right' : 'left';
  }

  /**
   * Transform logical properties to physical properties
   * @param language Language code
   * @param logicalProps Logical CSS properties (start, end, block, inline)
   */
  transformLogicalProperties(
    language: string,
    logicalProps: {
      blockStart?: string;
      blockEnd?: string;
      inlineStart?: string;
      inlineEnd?: string;
    },
  ) {
    const direction = this.getDirection(language);

    if (direction === 'ltr') {
      return {
        top: logicalProps.blockStart,
        bottom: logicalProps.blockEnd,
        left: logicalProps.inlineStart,
        right: logicalProps.inlineEnd,
      };
    } else {
      return {
        top: logicalProps.blockStart,
        bottom: logicalProps.blockEnd,
        right: logicalProps.inlineStart,
        left: logicalProps.inlineEnd,
      };
    }
  }

  /**
   * Get number formatting based on language
   */
  formatNumber(language: string, value: number, options?: Intl.NumberFormatOptions) {
    const locale = this.getLocaleFromLanguage(language);
    return new Intl.NumberFormat(locale, options).format(value);
  }

  /**
   * Get date formatting based on language
   */
  formatDate(language: string, date: Date, options?: Intl.DateTimeFormatOptions) {
    const locale = this.getLocaleFromLanguage(language);
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  /**
   * Get currency formatting based on language
   */
  formatCurrency(
    language: string,
    value: number,
    currency: string = 'USD',
    options?: Intl.NumberFormatOptions,
  ) {
    const locale = this.getLocaleFromLanguage(language);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...options,
    }).format(value);
  }

  /**
   * Get list formatting based on language
   */
  formatList(language: string, items: string[], type: 'conjunction' | 'disjunction' = 'conjunction') {
    const locale = this.getLocaleFromLanguage(language);
    
    // Use Intl.ListFormat if available (Node.js 12.0+)
    if (typeof (Intl as any).ListFormat !== 'undefined') {
      return new (Intl as any).ListFormat(locale, { type }).format(items);
    }
    
    // Fallback: simple comma-separated list
    if (type === 'conjunction') {
      if (items.length === 0) return '';
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} and ${items[1]}`;
      return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
    } else {
      return items.join(' or ');
    }
  }

  /**
   * Get relative time formatting based on language
   */
  formatRelativeTime(language: string, value: number, unit: Intl.RelativeTimeFormatUnit) {
    const locale = this.getLocaleFromLanguage(language);
    return new Intl.RelativeTimeFormat(locale).format(value, unit);
  }

  private getLocaleFromLanguage(language: string): string {
    const regionMap: { [key: string]: string } = {
      ar: 'ar-SA',
      he: 'he-IL',
      fa: 'fa-IR',
      ur: 'ur-PK',
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ru: 'ru-RU',
      ja: 'ja-JP',
      zh: 'zh-CN',
      ko: 'ko-KR',
      th: 'th-TH',
      vi: 'vi-VN',
      tr: 'tr-TR',
      hi: 'hi-IN',
    };

    return regionMap[language] || language;
  }

  /**
   * Get HTML attributes for RTL/LTR including lang and dir
   */
  getFullHTMLAttributes(language: string) {
    return {
      lang: language,
      dir: this.getDirection(language),
      'data-lang': language,
      'data-rtl': this.isRTL(language),
    };
  }
}
