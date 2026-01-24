import { SetMetadata } from '@nestjs/common';

export const ARIA_ROLE_KEY = 'aria_role';
export const ARIA_LABEL_KEY = 'aria_label';
export const KEYBOARD_SHORTCUT_KEY = 'keyboard_shortcut';
export const ACCESSIBLE_NAME_KEY = 'accessible_name';

/**
 * Decorator to specify ARIA role for a method's response
 */
export const AriaRole = (role: string) => SetMetadata(ARIA_ROLE_KEY, role);

/**
 * Decorator to specify ARIA label for a method's response
 */
export const AriaLabel = (label: string) => SetMetadata(ARIA_LABEL_KEY, label);

/**
 * Decorator to define keyboard shortcuts
 */
export const KeyboardShortcut = (keys: string[], handler: string) =>
  SetMetadata(KEYBOARD_SHORTCUT_KEY, { keys, handler });

/**
 * Decorator to specify accessible name for component
 */
export const AccessibleName = (name: string) => SetMetadata(ACCESSIBLE_NAME_KEY, name);

/**
 * Decorator to mark a controller/method as screen reader optimized
 */
export const ScreenReaderOptimized = () => SetMetadata('screen_reader_optimized', true);

/**
 * Decorator to mark content as requiring alt text
 */
export const RequiresAltText = () => SetMetadata('requires_alt_text', true);

/**
 * Decorator to mark content as keyboard navigable
 */
export const KeyboardNavigable = (skipLinkTarget?: string) =>
  SetMetadata('keyboard_navigable', { enabled: true, skipLinkTarget });

/**
 * Decorator to enable WCAG compliance checking
 */
export const WCAGCompliance = (level: 'A' | 'AA' | 'AAA' = 'AA') =>
  SetMetadata('wcag_compliance_level', level);
