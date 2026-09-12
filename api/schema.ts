import { z } from 'zod';

// Known shortlink domains to prevent self-referencing (R15 FIX)
const SHORTLINK_DOMAINS = ['s.ihmorol.cv'];

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

export const LinkSchema = z.object({
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug is too long")
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug can only contain letters, numbers, hyphens, and underscores"),
  originalUrl: z.string()
    .url("Invalid URL format")
    .refine(url => !isSelfReferencing(url), "Cannot create link pointing to this shortlink service (redirect loop)"),
  description: z.string().max(500, "Description is too long").optional(),
  clicks: z.number().int().nonnegative().optional(),
  user_id: z.string().optional(),
  is_personalized: z.boolean().default(false),
  is_deleted: z.boolean().default(false)
});

export const UpdateLinkSchema = LinkSchema.extend({
  id: z.string()
});
