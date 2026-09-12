import { z } from 'zod';
import { SHORTLINK_DOMAINS } from '../config.js';
import { SLUG_PATTERN, SLUG_MIN_LENGTH, SLUG_MAX_LENGTH } from '../lib/slug.js';

// Helper to check if URL might cause redirect loop
const isSelfReferencing = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return SHORTLINK_DOMAINS.some(domain => 
      parsed.host === domain || parsed.host.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
};

// Slug is optional: when the client omits it (or sends an empty string, the
// UI's "leave blank" state) the server generates one via randomSlug(). The
// pattern/length rules come from lib/slug.ts, the shared slug module.
const slugSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string()
    .min(SLUG_MIN_LENGTH, `Slug must be at least ${SLUG_MIN_LENGTH} characters`)
    .max(SLUG_MAX_LENGTH, `Slug is too long (max ${SLUG_MAX_LENGTH} characters)`)
    .regex(SLUG_PATTERN, "Slug can only contain letters, numbers, hyphens, and underscores")
    .optional()
);

export const LinkSchema = z.object({
  slug: slugSchema,
  originalUrl: z.string()
    .url("Invalid URL format")
    .refine(url => !isSelfReferencing(url), "Cannot create link pointing to this shortlink service (redirect loop)"),
  description: z.string().max(500, "Description is too long").optional(),
  clicks: z.number().int().nonnegative().optional(),
  userId: z.string().optional(),
  isPersonalized: z.boolean().default(false),
  isDeleted: z.boolean().default(false)
});

export const UpdateLinkSchema = LinkSchema.extend({
  id: z.string()
});
