import { Injectable } from '@nestjs/common';

/**
 * ARIA (Accessible Rich Internet Applications) roles
 * Reference: https://www.w3.org/TR/wai-aria-1.2/
 */
export enum AriaRole {
  ALERT = 'alert',
  ALERTDIALOG = 'alertdialog',
  APPLICATION = 'application',
  BUTTON = 'button',
  CHECKBOX = 'checkbox',
  COLUMNHEADER = 'columnheader',
  COMBOBOX = 'combobox',
  COMPLEMENTARY = 'complementary',
  CONTENTINFO = 'contentinfo',
  DEFINITION = 'definition',
  DIALOG = 'dialog',
  DIRECTORY = 'directory',
  DOCUMENT = 'document',
  FEED = 'feed',
  FIGURE = 'figure',
  FORM = 'form',
  GRID = 'grid',
  GRIDCELL = 'gridcell',
  GROUP = 'group',
  HEADING = 'heading',
  IMG = 'img',
  LINK = 'link',
  LIST = 'list',
  LISTBOX = 'listbox',
  LISTITEM = 'listitem',
  LOG = 'log',
  MAIN = 'main',
  MARQUEE = 'marquee',
  MATH = 'math',
  MENU = 'menu',
  MENUBAR = 'menubar',
  MENUITEM = 'menuitem',
  MENUITEMCHECKBOX = 'menuitemcheckbox',
  MENUITEMRADIO = 'menuitemradio',
  NAVIGATION = 'navigation',
  NONE = 'none',
  NOTE = 'note',
  OPTION = 'option',
  PRESENTATION = 'presentation',
  PROGRESSBAR = 'progressbar',
  RADIO = 'radio',
  RADIOGROUP = 'radiogroup',
  REGION = 'region',
  ROWHEADER = 'rowheader',
  SCROLLBAR = 'scrollbar',
  SEARCH = 'search',
  SEARCHBOX = 'searchbox',
  SEPARATOR = 'separator',
  SLIDER = 'slider',
  SPINBUTTON = 'spinbutton',
  STATUS = 'status',
  SWITCH = 'switch',
  TAB = 'tab',
  TABLIST = 'tablist',
  TABPANEL = 'tabpanel',
  TERM = 'term',
  TEXTBOX = 'textbox',
  TIMER = 'timer',
  TOOLBAR = 'toolbar',
  TOOLTIP = 'tooltip',
  TREE = 'tree',
  TREEGRID = 'treegrid',
  TREEITEM = 'treeitem',
}

/**
 * ARIA live region politeness levels
 */
export enum AriaPoliteness {
  OFF = 'off',
  POLITE = 'polite',
  ASSERTIVE = 'assertive',
}

/**
 * ARIA attributes builder
 */
export interface AriaAttributes {
  [key: string]: string | number | boolean;
}

/**
 * Keyboard key codes for common navigation
 */
export enum KeyCode {
  ESCAPE = 27,
  TAB = 9,
  ENTER = 13,
  SPACE = 32,
  ARROW_LEFT = 37,
  ARROW_UP = 38,
  ARROW_RIGHT = 39,
  ARROW_DOWN = 40,
  HOME = 36,
  END = 35,
  PAGE_UP = 33,
  PAGE_DOWN = 34,
}

/**
 * Service for managing ARIA attributes and accessibility features
 */
@Injectable()
export class AccessibilityService {
  /**
   * Build ARIA attributes for a component
   */
  buildAriaAttributes(options: {
    role?: AriaRole;
    label?: string;
    labelledBy?: string;
    describedBy?: string;
    ariaLive?: AriaPoliteness;
    ariaAtomic?: boolean;
    ariaRelevant?: string;
    ariaHidden?: boolean;
    ariaDisabled?: boolean;
    ariaPressed?: boolean;
    ariaChecked?: boolean | 'mixed';
    ariaExpanded?: boolean;
    ariaSelected?: boolean;
    ariaRequired?: boolean;
    ariaInvalid?: boolean;
    ariaSort?: 'ascending' | 'descending' | 'none' | 'other';
    ariaLevel?: number;
    ariaValueMin?: number;
    ariaValueMax?: number;
    ariaValueNow?: number;
    ariaValueText?: string;
    ariaControls?: string;
    ariaFlowTo?: string;
    ariaOwns?: string;
    ariaPosinset?: number;
    ariaSetsize?: number;
    ariaColindex?: number;
    ariaRowindex?: number;
    ariaColspan?: number;
    ariaRowspan?: number;
  }): AriaAttributes {
    const attributes: AriaAttributes = {};

    if (options.role) attributes['role'] = options.role;
    if (options.label) attributes['aria-label'] = options.label;
    if (options.labelledBy) attributes['aria-labelledby'] = options.labelledBy;
    if (options.describedBy) attributes['aria-describedby'] = options.describedBy;
    if (options.ariaLive) attributes['aria-live'] = options.ariaLive;
    if (options.ariaAtomic !== undefined) attributes['aria-atomic'] = options.ariaAtomic;
    if (options.ariaRelevant) attributes['aria-relevant'] = options.ariaRelevant;
    if (options.ariaHidden !== undefined) attributes['aria-hidden'] = options.ariaHidden;
    if (options.ariaDisabled !== undefined) attributes['aria-disabled'] = options.ariaDisabled;
    if (options.ariaPressed !== undefined) attributes['aria-pressed'] = options.ariaPressed;
    if (options.ariaChecked !== undefined) attributes['aria-checked'] = options.ariaChecked;
    if (options.ariaExpanded !== undefined) attributes['aria-expanded'] = options.ariaExpanded;
    if (options.ariaSelected !== undefined) attributes['aria-selected'] = options.ariaSelected;
    if (options.ariaRequired !== undefined) attributes['aria-required'] = options.ariaRequired;
    if (options.ariaInvalid !== undefined) attributes['aria-invalid'] = options.ariaInvalid;
    if (options.ariaSort) attributes['aria-sort'] = options.ariaSort;
    if (options.ariaLevel) attributes['aria-level'] = options.ariaLevel;
    if (options.ariaValueMin !== undefined) attributes['aria-valuemin'] = options.ariaValueMin;
    if (options.ariaValueMax !== undefined) attributes['aria-valuemax'] = options.ariaValueMax;
    if (options.ariaValueNow !== undefined) attributes['aria-valuenow'] = options.ariaValueNow;
    if (options.ariaValueText) attributes['aria-valuetext'] = options.ariaValueText;
    if (options.ariaControls) attributes['aria-controls'] = options.ariaControls;
    if (options.ariaFlowTo) attributes['aria-flowto'] = options.ariaFlowTo;
    if (options.ariaOwns) attributes['aria-owns'] = options.ariaOwns;
    if (options.ariaPosinset) attributes['aria-posinset'] = options.ariaPosinset;
    if (options.ariaSetsize) attributes['aria-setsize'] = options.ariaSetsize;
    if (options.ariaColindex) attributes['aria-colindex'] = options.ariaColindex;
    if (options.ariaRowindex) attributes['aria-rowindex'] = options.ariaRowindex;
    if (options.ariaColspan) attributes['aria-colspan'] = options.ariaColspan;
    if (options.ariaRowspan) attributes['aria-rowspan'] = options.ariaRowspan;

    return attributes;
  }

  /**
   * Build keyboard navigation handler
   */
  createKeyboardNavigationHandler(handlers: {
    onEscape?: () => void;
    onEnter?: () => void;
    onSpace?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onTab?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
  }) {
    return (event: KeyboardEvent) => {
      switch (event.keyCode) {
        case KeyCode.ESCAPE:
          if (handlers.onEscape) {
            event.preventDefault();
            handlers.onEscape();
          }
          break;
        case KeyCode.ENTER:
          if (handlers.onEnter) {
            event.preventDefault();
            handlers.onEnter();
          }
          break;
        case KeyCode.SPACE:
          if (handlers.onSpace) {
            event.preventDefault();
            handlers.onSpace();
          }
          break;
        case KeyCode.ARROW_UP:
          if (handlers.onArrowUp) {
            event.preventDefault();
            handlers.onArrowUp();
          }
          break;
        case KeyCode.ARROW_DOWN:
          if (handlers.onArrowDown) {
            event.preventDefault();
            handlers.onArrowDown();
          }
          break;
        case KeyCode.ARROW_LEFT:
          if (handlers.onArrowLeft) {
            event.preventDefault();
            handlers.onArrowLeft();
          }
          break;
        case KeyCode.ARROW_RIGHT:
          if (handlers.onArrowRight) {
            event.preventDefault();
            handlers.onArrowRight();
          }
          break;
        case KeyCode.TAB:
          if (handlers.onTab) {
            handlers.onTab();
          }
          break;
        case KeyCode.HOME:
          if (handlers.onHome) {
            event.preventDefault();
            handlers.onHome();
          }
          break;
        case KeyCode.END:
          if (handlers.onEnd) {
            event.preventDefault();
            handlers.onEnd();
          }
          break;
      }
    };
  }

  /**
   * Get WCAG 2.1 AA compliance checklist
   */
  getWCAGComplianceChecklist() {
    return {
      level: 'AA',
      principles: {
        perceivable: [
          {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            description: 'All non-text content has text alternatives',
          },
          {
            criterion: '1.4.3',
            name: 'Contrast (Minimum)',
            level: 'AA',
            description: 'Text and images of text have a contrast ratio of at least 4.5:1',
          },
          {
            criterion: '1.4.5',
            name: 'Images of Text',
            level: 'AA',
            description: 'Images of text are avoided except for logos',
          },
        ],
        operable: [
          {
            criterion: '2.1.1',
            name: 'Keyboard',
            level: 'A',
            description: 'All functionality available from keyboard',
          },
          {
            criterion: '2.1.2',
            name: 'No Keyboard Trap',
            level: 'A',
            description: 'Focus is not trapped when navigating',
          },
          {
            criterion: '2.4.3',
            name: 'Focus Order',
            level: 'A',
            description: 'Focus order is logical and meaningful',
          },
          {
            criterion: '2.5.1',
            name: 'Pointer Gestures',
            level: 'A',
            description: 'Alternatives to complex pointer gestures',
          },
        ],
        understandable: [
          {
            criterion: '3.1.1',
            name: 'Language of Page',
            level: 'A',
            description: 'Language of page is identified',
          },
          {
            criterion: '3.3.1',
            name: 'Error Identification',
            level: 'A',
            description: 'Errors are identified and suggestions provided',
          },
          {
            criterion: '3.3.4',
            name: 'Error Prevention (Legal, Financial, Data)',
            level: 'AA',
            description: 'For transactions, errors are prevented or confirmed',
          },
        ],
        robust: [
          {
            criterion: '4.1.2',
            name: 'Name, Role, Value',
            level: 'A',
            description: 'Name, role, and state of components are available',
          },
          {
            criterion: '4.1.3',
            name: 'Status Messages',
            level: 'AA',
            description: 'Status messages are conveyed to assistive technologies',
          },
        ],
      },
    };
  }

  /**
   * Generate screen reader friendly text for common patterns
   */
  generateScreenReaderText(options: {
    action?: string;
    state?: string;
    count?: number;
    total?: number;
    error?: string;
    hint?: string;
  }): string {
    const parts: string[] = [];

    if (options.action) parts.push(options.action);
    if (options.state) parts.push(`State: ${options.state}`);
    if (options.count !== undefined && options.total !== undefined) {
      parts.push(`Item ${options.count} of ${options.total}`);
    } else if (options.count !== undefined) {
      parts.push(`${options.count} items`);
    }
    if (options.error) parts.push(`Error: ${options.error}`);
    if (options.hint) parts.push(`Hint: ${options.hint}`);

    return parts.join('. ');
  }

  /**
   * Check if contrast ratio meets WCAG AA standards
   */
  checkContrastRatio(foreground: string, background: string): {
    ratio: number;
    meetsAA: boolean;
    meetsAAA: boolean;
  } {
    const fg = this.hexToRgb(foreground);
    const bg = this.hexToRgb(background);

    const fgLuminance = this.calculateLuminance(fg);
    const bgLuminance = this.calculateLuminance(bg);

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      meetsAA: ratio >= 4.5,
      meetsAAA: ratio >= 7,
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private calculateLuminance(rgb: { r: number; g: number; b: number }): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Generate skip navigation link attributes
   */
  getSkipNavigationLinks() {
    return [
      {
        id: 'skip-to-main',
        label: 'Skip to main content',
        href: '#main-content',
      },
      {
        id: 'skip-to-nav',
        label: 'Skip to navigation',
        href: '#main-nav',
      },
      {
        id: 'skip-to-search',
        label: 'Skip to search',
        href: '#search',
      },
    ];
  }

  /**
   * Generate focus trap management
   */
  manageFocusTrap(elements: HTMLElement[], direction: 'forward' | 'backward' = 'forward') {
    if (elements.length === 0) return null;

    if (direction === 'forward') {
      return elements[0];
    } else {
      return elements[elements.length - 1];
    }
  }
}
