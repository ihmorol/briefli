import type { ShortLink } from '../../types.js';

// Shape of one row in the Supabase `links` table (snake_case DB columns).
// This is the single owner of the DB row type.
export interface LinkRow {
  id: string;
  created_at: string;
  slug: string;
  original_url: string;
  description: string | null;
  clicks: number;
  user_id: string | null;
  is_personalized: boolean | null;
  is_deleted: boolean | null;
}

// camelCase fields the API may write to a row (insert or update).
export interface LinkPatch {
  slug?: string;
  originalUrl?: string;
  description?: string;
  clicks?: number;
  userId?: string | null;
  isPersonalized?: boolean;
  isDeleted?: boolean;
}

// DB row -> domain model. NULL columns collapse to undefined so the API and
// SPA always see the same optional camelCase fields.
export function toDomain(row: LinkRow): ShortLink {
  return {
    id: row.id,
    slug: row.slug,
    originalUrl: row.original_url,
    description: row.description ?? undefined,
    createdAt: row.created_at, // Postgres timestamptz, serialized as an ISO string
    clicks: row.clicks,
    userId: row.user_id ?? undefined,
    isPersonalized: row.is_personalized ?? undefined,
    isDeleted: row.is_deleted ?? undefined
  };
}

// Domain fields -> row-shaped partial. Undefined keys are omitted so updates
// never overwrite columns; userId: null is preserved on purpose (public links
// are stored with a NULL owner).
export function toRowPatch(link: LinkPatch): Partial<LinkRow> {
  const row: Partial<LinkRow> = {};
  if (link.slug !== undefined) row.slug = link.slug;
  if (link.originalUrl !== undefined) row.original_url = link.originalUrl;
  if (link.description !== undefined) row.description = link.description;
  if (link.clicks !== undefined) row.clicks = link.clicks;
  if (link.userId !== undefined) row.user_id = link.userId;
  if (link.isPersonalized !== undefined) row.is_personalized = link.isPersonalized;
  if (link.isDeleted !== undefined) row.is_deleted = link.isDeleted;
  return row;
}
