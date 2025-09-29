import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface AccessibilityHeaders {
  'X-Accessibility-Features'?: string;
  'X-Screen-Reader-Optimized'?: string;
  'X-High-Contrast-Available'?: string;
  'X-Keyboard-Navigation'?: string;
  'X-Reduced-Motion'?: string;
}

@Injectable()
export class AccessibilityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Add accessibility-related headers to all responses
    this.addAccessibilityHeaders(res);
    
    // Check for accessibility preferences in request headers
    this.processAccessibilityPreferences(req, res);
    
    next();
  }

  private addAccessibilityHeaders(res: Response): void {
    const accessibilityHeaders: AccessibilityHeaders = {
      'X-Accessibility-Features': 'keyboard-navigation,screen-reader,high-contrast,reduced-motion,captions',
      'X-Screen-Reader-Optimized': 'true',
      'X-High-Contrast-Available': 'true',
      'X-Keyboard-Navigation': 'true',
      'X-Reduced-Motion': 'supported'
    };

    Object.entries(accessibilityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Add CORS headers for accessibility tools
    res.setHeader('Access-Control-Expose-Headers', 
      'X-Accessibility-Features,X-Screen-Reader-Optimized,X-High-Contrast-Available'
    );
  }

  private processAccessibilityPreferences(req: Request, res: Response): void {
    // Check for accessibility preferences in request headers
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const prefersReducedMotion = req.get('Sec-CH-Prefers-Reduced-Motion');
    const prefersColorScheme = req.get('Sec-CH-Prefers-Color-Scheme');

    // Detect screen readers
    const isScreenReader = this.detectScreenReader(userAgent);
    if (isScreenReader) {
      res.setHeader('X-Screen-Reader-Detected', 'true');
      // Add structured data headers for screen readers
      res.setHeader('X-Content-Structure', 'semantic-html,aria-labels,landmarks');
    }

    // Handle reduced motion preference
    if (prefersReducedMotion === 'reduce') {
      res.setHeader('X-Reduced-Motion-Requested', 'true');
    }

    // Handle color scheme preference
    if (prefersColorScheme) {
      res.setHeader('X-Preferred-Color-Scheme', prefersColorScheme);
    }

    // Add language direction information
    const isRTL = this.isRightToLeftLanguage(acceptLanguage);
    if (isRTL) {
      res.setHeader('X-Text-Direction', 'rtl');
    }
  }

  private detectScreenReader(userAgent: string): boolean {
    const screenReaderPatterns = [
      /NVDA/i,
      /JAWS/i,
      /VoiceOver/i,
      /TalkBack/i,
      /Orca/i,
      /Dragon/i,
      /ZoomText/i,
      /MAGic/i
    ];

    return screenReaderPatterns.some(pattern => pattern.test(userAgent));
  }

  private isRightToLeftLanguage(acceptLanguage: string): boolean {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
    const primaryLanguage = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    return rtlLanguages.includes(primaryLanguage);
  }
}

// Accessibility response interceptor
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class AccessibilityResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map(data => {
        // Add accessibility metadata to API responses
        if (data && typeof data === 'object') {
          return this.enhanceResponseWithAccessibilityData(data, request);
        }
        return data;
      })
    );
  }

  private enhanceResponseWithAccessibilityData(data: any, request: any): any {
    // Don't modify the original data, create a new object
    const enhancedData = { ...data };

    // Add accessibility metadata for screen readers
    if (this.isScreenReaderRequest(request)) {
      enhancedData._accessibility = {
        screenReaderOptimized: true,
        structuredContent: true,
        alternativeFormats: ['audio', 'braille'],
        keyboardShortcuts: this.getKeyboardShortcuts(request.path)
      };
    }

    // Add pagination accessibility info
    if (data.pagination) {
      enhancedData.pagination.accessibilityInfo = {
        totalItems: data.pagination.total,
        currentPage: data.pagination.page,
        totalPages: data.pagination.totalPages,
        itemsPerPage: data.pagination.limit,
        navigationInstructions: 'Use arrow keys or page numbers to navigate'
      };
    }

    // Add form accessibility info
    if (data.form || data.fields) {
      enhancedData._formAccessibility = {
        requiredFields: this.getRequiredFields(data),
        validationRules: this.getValidationRules(data),
        keyboardInstructions: 'Use Tab to navigate between fields, Enter to submit'
      };
    }

    return enhancedData;
  }

  private isScreenReaderRequest(request: any): boolean {
    const userAgent = request.get('User-Agent') || '';
    const acceptHeader = request.get('Accept') || '';
    
    return userAgent.includes('NVDA') || 
           userAgent.includes('JAWS') || 
           userAgent.includes('VoiceOver') ||
           acceptHeader.includes('application/vnd.accessibility+json');
  }

  private getKeyboardShortcuts(path: string): string[] {
    const shortcuts: { [key: string]: string[] } = {
      '/courses': ['Tab: Navigate courses', 'Enter: View course details', 'Space: Enroll in course'],
      '/lessons': ['Tab: Navigate lessons', 'Enter: Start lesson', 'Arrow keys: Navigate content'],
      '/forum': ['Tab: Navigate posts', 'Enter: View post', 'R: Reply to post'],
      '/profile': ['Tab: Navigate settings', 'Enter: Edit field', 'Escape: Cancel editing']
    };

    return shortcuts[path] || ['Tab: Navigate', 'Enter: Activate', 'Escape: Cancel'];
  }

  private getRequiredFields(data: any): string[] {
    // Extract required field information from form data
    if (data.fields) {
      return data.fields
        .filter((field: any) => field.required)
        .map((field: any) => field.name);
    }
    return [];
  }

  private getValidationRules(data: any): { [key: string]: string } {
    // Extract validation rules for accessibility announcements
    const rules: { [key: string]: string } = {};
    
    if (data.fields) {
      data.fields.forEach((field: any) => {
        if (field.validation) {
          rules[field.name] = field.validation.message || 'Please enter a valid value';
        }
      });
    }
    
    return rules;
  }
}

// Accessibility decorator for controllers
import { SetMetadata } from '@nestjs/common';

export const ACCESSIBILITY_KEY = 'accessibility';

export interface AccessibilityOptions {
  screenReaderOptimized?: boolean;
  keyboardNavigable?: boolean;
  highContrast?: boolean;
  reducedMotion?: boolean;
  alternativeFormats?: string[];
  description?: string;
}

export const Accessible = (options: AccessibilityOptions) => 
  SetMetadata(ACCESSIBILITY_KEY, options);

// Usage example:
// @Accessible({
//   screenReaderOptimized: true,
//   keyboardNavigable: true,
//   description: 'Course enrollment form with full accessibility support'
// })
// @Post('enroll')
// async enrollInCourse(@Body() enrollmentData: EnrollmentDto) {
//   // Controller logic
// }
