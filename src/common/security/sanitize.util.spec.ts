import { escapeHtml, hasForbiddenKeys, sanitizeString, sanitizeUnknown } from './sanitize.util';

describe('sanitize.util', () => {
  it('escapeHtml escapes critical characters', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('sanitizeString leaves passwords unchanged', () => {
    expect(sanitizeString(" p@ss'<> ", 'password')).toBe(" p@ss'<> ");
  });

  it('sanitizeUnknown drops forbidden keys', () => {
    const out = sanitizeUnknown({ __proto__: { polluted: true }, ok: 'yes' }) as any;
    expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
    expect(out.ok).toBe('yes');
  });

  it('hasForbiddenKeys detects prototype pollution keys', () => {
    expect(hasForbiddenKeys({ constructor: { prototype: { x: 1 } } })).toBe(true);
  });
});
