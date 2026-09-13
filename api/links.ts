import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { requireUser } from './_lib/auth.js';
import { canModify } from './_lib/permissions.js';
import { badRequest, conflict, forbidden, notFound } from './_lib/apiError.js';
import { LinkSchema, UpdateLinkSchema } from './schema.js';
import { toDomain, toRowPatch, type LinkRow } from './_lib/linkRecord.js';
import { randomSlug } from '../lib/slug.js';
import { withApi } from './_lib/withApi.js';

// Supabase surfaces Postgres errors with a `code` field; '23505' is
// unique_violation. Inspected defensively because the rest of this file only
// rethrows Supabase errors as-is.
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error &&
  (error as { code?: unknown }).code === '23505';

async function linksHandler(req: VercelRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET': {
      const { trash, type } = req.query;
      const isTrash = trash === 'true';

      let query = supabase
        .from('links')
        .select('*')
        .eq('is_deleted', isTrash);

      if (type === 'personalized') {
        // Personalized links are private: only the signed-in owner sees them.
        const userId = await requireUser(req);
        query = query.eq('user_id', userId).eq('is_personalized', true);
      } else {
        // Public links (default) remain readable anonymously.
        query = query.eq('is_personalized', false);
      }

      const { data: links, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // DB-typing seam: Supabase returns untyped rows; casting to LinkRow here
      // is the one place a DB row is allowed to enter the domain model.
      const formattedLinks = (links as LinkRow[]).map(toDomain);
      return res.status(200).json(formattedLinks);
    }

    case 'POST': {
      // BEHAVIOR CHANGE: creation now requires sign-in (anonymous visitors can
      // no longer create links).
      const userId = await requireUser(req);

      const validation = LinkSchema.safeParse(req.body);
      if (!validation.success) {
        throw badRequest(validation.error.issues[0].message);
      }

      const { originalUrl, description, isPersonalized } = validation.data;
      const requestedSlug = validation.data.slug;

      // BEHAVIOR CHANGE: the slug is optional. When the client omits it (left
      // blank in the UI), the server generates one. A user-typed slug keeps
      // the duplicate-check -> 409 behavior below with no auto-regeneration.
      const isGeneratedSlug = requestedSlug === undefined;
      const slug = requestedSlug ?? randomSlug();

      // Cheap pre-insert duplicate check for the common case; the UNIQUE
      // constraint on links.slug (migration.sql) is the authoritative race
      // backstop, handled at the INSERT below.
      const { data: existing } = await supabase
        .from('links')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        throw conflict('Slug already exists');
      }

      // userId is server-owned: personalized links are always bound to the
      // authenticated caller, never to a client-supplied id.
      const insertRow = toRowPatch({
        slug,
        originalUrl,
        description: description || '',
        clicks: 0,
        userId: isPersonalized ? userId : null,
        isPersonalized: !!isPersonalized,
        isDeleted: false
      });

      // Insert with unique-violation handling: a '23505' on a generated slug
      // means a concurrent request claimed it first, so regenerate (at most
      // 5 attempts, then 409); a '23505' on a user-typed slug is surfaced as
      // 409 without regeneration.
      const MAX_SLUG_ATTEMPTS = 5;
      let inserted: LinkRow | null = null;

      for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
        const { data, error } = await supabase
          .from('links')
          .insert(insertRow)
          .select()
          .single();

        if (!error) {
          // DB-typing seam: Supabase returns untyped rows; the cast to
          // LinkRow is the one place a DB row is allowed to enter the
          // domain model.
          inserted = data as LinkRow;
          break;
        }

        if (!isUniqueViolation(error)) throw error;
        if (!isGeneratedSlug || attempt === MAX_SLUG_ATTEMPTS) {
          throw conflict('Slug already exists');
        }
        insertRow.slug = randomSlug();
      }

      if (!inserted) {
        throw conflict('Slug already exists');
      }

      return res.status(201).json(toDomain(inserted));
    }

    case 'PUT': {
      const userId = await requireUser(req);

      const validation = UpdateLinkSchema.safeParse(req.body);
      if (!validation.success) {
        throw badRequest(validation.error.issues[0].message);
      }

      const { id, slug: requestedSlug, originalUrl, description, isDeleted } = validation.data;

      // Fetch existing to check permissions
      const { data: existing } = await supabase
        .from('links')
        .select('slug, user_id, is_personalized')
        .eq('id', id)
        .maybeSingle();

      if (!existing) {
        throw notFound('Link not found');
      }

      if (!canModify(existing, userId)) {
        throw forbidden('Forbidden - You do not own this link');
      }

      // Slug is optional on update: absent (or empty, normalized to undefined
      // in the schema) means "keep the current slug". Only explicit renames
      // are uniqueness-checked.
      const slug = requestedSlug ?? existing.slug;

      // Check slug uniqueness if changed
      if (existing.slug !== slug) {
        const { data: duplicate } = await supabase
          .from('links')
          .select('slug')
          .eq('slug', slug)
          .maybeSingle();

        if (duplicate) {
          throw conflict('Slug already exists');
        }
      }

      // SECURITY: `clicks` is a server-owned counter and is stripped from
      // client-supplied update payloads
      // Handle Restore: only touch is_deleted when the client sent it
      const updates = toRowPatch({
        slug,
        originalUrl,
        description,
        isDeleted: typeof isDeleted === 'boolean' ? isDeleted : undefined
      });

      const { error } = await supabase
        .from('links')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    case 'DELETE': {
      const userId = await requireUser(req);

      const { id } = req.query;
      if (typeof id !== 'string') {
        throw badRequest('ID required');
      }

      // Fetch to check type/permissions
      const { data: existing } = await supabase
        .from('links')
        .select('user_id, is_personalized')
        .eq('id', id)
        .maybeSingle();

      if (!existing) {
        throw notFound('Link not found');
      }

      // canModify: personalized links only by their owner, public links by any
      // signed-in user. Anonymous requests never reach this line.
      if (!canModify(existing, userId)) {
        throw forbidden('Forbidden - You cannot delete this link');
      }

      // Soft Delete
      const { error } = await supabase
        .from('links')
        .update(toRowPatch({ isDeleted: true }))
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }
  }
}

export default withApi(linksHandler, ['GET', 'POST', 'PUT', 'DELETE']);
