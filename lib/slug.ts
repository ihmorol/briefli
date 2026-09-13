// Shared slug rules: the single source of truth for the allowed slug
// characters and length bounds, imported by both the API (server-side
// generation, .js-suffixed relative import) and the SPA (input sanitization,
// extensionless relative import). Dependency- and framework-free on purpose.

/** Allowed slug characters: letters, digits, hyphens, underscores. */
export const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 50;

// Character class body extracted from SLUG_PATTERN.source so the allowed
// character set is defined in exactly one place. Assumes the anchored,
// single-character-class form `^[<class>]+$` used above.
const SLUG_CLASS_BODY = SLUG_PATTERN.source.slice(
  SLUG_PATTERN.source.indexOf('[') + 1,
  SLUG_PATTERN.source.lastIndexOf(']')
);

const SLUG_STRIP_PATTERN = new RegExp(`[^${SLUG_CLASS_BODY}]`, 'g');

// Alphanumeric only: generated codes avoid leading/trailing hyphens and
// underscore-lookalike confusion in copied URLs.
const SLUG_RANDOM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Strip characters disallowed by SLUG_PATTERN, then clamp to SLUG_MAX_LENGTH. */
export function sanitizeSlug(input: string): string {
  return input.replace(SLUG_STRIP_PATTERN, '').slice(0, SLUG_MAX_LENGTH);
}

/** True when s matches SLUG_PATTERN and respects the length bounds. */
export function isSlugValid(s: string): boolean {
  return SLUG_PATTERN.test(s) && s.length >= SLUG_MIN_LENGTH && s.length <= SLUG_MAX_LENGTH;
}

/** Random alphanumeric slug, used for server-side generation. */
export function randomSlug(length = 6): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint32Array(length);
    cryptoApi.getRandomValues(bytes);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += SLUG_RANDOM_CHARS.charAt(bytes[i] % SLUG_RANDOM_CHARS.length);
    }
    return result;
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    result += SLUG_RANDOM_CHARS.charAt(Math.floor(Math.random() * SLUG_RANDOM_CHARS.length));
  }
  return result;
}
