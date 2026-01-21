export type SanitizationMode = 'text' | 'email' | 'token' | 'password';

const DEFAULT_MAX_DEPTH = 20;
const DEFAULT_MAX_KEYS = 10_000;

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function escapeHtml(input: string): string {
  // Minimal, context-agnostic escaping to prevent accidental HTML/script injection if the value is later rendered.
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripNullBytes(input: string): string {
  return input.replace(/\0/g, '');
}

function normalizeWhitespace(input: string): string {
  // Collapse repeated whitespace; keep newlines.
  return input.replace(/[^\S\r\n]+/g, ' ').trim();
}

export function sanitizeString(value: string, mode: SanitizationMode): string {
  // Passwords are sensitive and should not be modified.
  if (mode === 'password') return value;

  let v = stripNullBytes(value);
  v = normalizeWhitespace(v);

  if (mode === 'email') {
    return v.toLowerCase();
  }

  if (mode === 'token') {
    // Tokens should not be HTML-escaped; but we still strip null bytes/whitespace normalization.
    return v;
  }

  // Default: text
  return escapeHtml(v);
}

export type SanitizeOptions = {
  maxDepth?: number;
  maxKeys?: number;
  /**
   * Optional per-key mode overrides.
   * If key isn't present, `defaultMode` is used.
   */
  keyMode?: Record<string, SanitizationMode>;
  defaultMode?: SanitizationMode;
  /**
   * Keys that must never be sanitized/escaped (e.g., passwords) even if present in input.
   */
  skipKeys?: string[];
};

export function sanitizeUnknown(value: unknown, options: SanitizeOptions = {}): unknown {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const keyMode = options.keyMode ?? {};
  const defaultMode = options.defaultMode ?? 'text';
  const skipKeys = new Set((options.skipKeys ?? []).map((k) => k.toLowerCase()));

  let keysVisited = 0;

  const visit = (v: unknown, depth: number, currentKey?: string): unknown => {
    if (depth > maxDepth) return v;

    if (typeof v === 'string') {
      const k = (currentKey ?? '').toLowerCase();
      if (k && skipKeys.has(k)) return v;
      const mode = (currentKey && keyMode[currentKey]) || defaultMode;
      return sanitizeString(v, mode);
    }

    if (typeof v !== 'object' || v === null) return v;

    if (Array.isArray(v)) {
      return v.map((item) => visit(item, depth + 1, currentKey));
    }

    // Plain object
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(obj)) {
      keysVisited++;
      if (keysVisited > maxKeys) break;

      if (FORBIDDEN_KEYS.has(k)) {
        // Drop forbidden keys to prevent prototype pollution.
        continue;
      }

      out[k] = visit(val, depth + 1, k);
    }
    return out;
  };

  return visit(value, 0);
}

export function hasForbiddenKeys(value: unknown, maxDepth = DEFAULT_MAX_DEPTH): boolean {
  const visit = (v: unknown, depth: number): boolean => {
    if (depth > maxDepth) return false;
    if (typeof v !== 'object' || v === null) return false;
    if (Array.isArray(v)) return v.some((x) => visit(x, depth + 1));

    for (const k of Object.keys(v as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(k)) return true;
      if (visit((v as Record<string, unknown>)[k], depth + 1)) return true;
    }
    return false;
  };

  return visit(value, 0);
}
