import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { authenticate } from './_lib/auth.js';
import { LinkSchema, UpdateLinkSchema } from './schema.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await authenticate(req, res, true);

  try {
    switch (req.method) {
      case 'GET': {
        const { trash, type } = req.query;
        const isTrash = trash === 'true';

        let query = supabase
          .from('links')
          .select('*')
          .eq('is_deleted', isTrash);

        if (type === 'personalized') {
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized - Login required for personalized links' });
          }
          query = query.eq('user_id', userId).eq('is_personalized', true);
        } else {
          // Public links (default)
          query = query.eq('is_personalized', false);
        }

        const { data: links, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const formattedLinks = links.map(link => ({
          id: link.id,
          slug: link.slug,
          originalUrl: link.original_url,
          description: link.description,
          createdAt: link.created_at,
          clicks: link.clicks,
          userId: link.user_id,
          isPersonalized: link.is_personalized,
          isDeleted: link.is_deleted
        }));
        return res.status(200).json(formattedLinks);
      }

      case 'POST': {
        const validation = LinkSchema.safeParse(req.body);
        if (!validation.success) {
           return res.status(400).json({ error: validation.error.issues[0].message });
        }
        
        const { slug, originalUrl, description, is_personalized } = validation.data;

        if (is_personalized && !userId) {
            return res.status(401).json({ error: 'You must be logged in to create personalized links' });
        }

        // Check for duplicates
        const { data: existing } = await supabase
          .from('links')
          .select('slug')
          .eq('slug', slug)
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'Slug already exists' });
        }

        const newLink = {
          slug,
          original_url: originalUrl,
          description: description || '',
          clicks: 0,
          user_id: is_personalized ? userId : null,
          is_personalized: !!is_personalized,
          is_deleted: false
        };

        const { data: inserted, error } = await supabase
          .from('links')
          .insert(newLink)
          .select()
          .single();

        if (error) throw error;

        return res.status(201).json({
          id: inserted.id,
          slug: inserted.slug,
          originalUrl: inserted.original_url,
          description: inserted.description,
          createdAt: inserted.created_at,
          clicks: inserted.clicks,
          isPersonalized: inserted.is_personalized,
          isDeleted: inserted.is_deleted
        });
      }

      case 'PUT': {
        // SECURITY: modification requires a signed-in user (anonymous users
        // previously passed the public-link permission check via userId=null)
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized - Login required' });
        }

        const validation = UpdateLinkSchema.safeParse(req.body);
         if (!validation.success) {
           return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { id, slug, originalUrl, description, is_deleted } = validation.data;
        
        // Fetch existing to check permissions
        const { data: existing } = await supabase
          .from('links')
          .select('slug, user_id, is_personalized')
          .eq('id', id)
          .maybeSingle();
        
        if (!existing) {
             return res.status(404).json({ error: 'Link not found' });
        }

        // Permission check
        if (existing.is_personalized && existing.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden - You do not own this link' });
        }

        // Check slug uniqueness if changed
        if (existing.slug !== slug) {
             const { data: duplicate } = await supabase
                .from('links')
                .select('slug')
                .eq('slug', slug)
                .maybeSingle();
            
             if (duplicate) {
               return res.status(409).json({ error: 'Slug already exists' });
             }
        }

        // SECURITY: `clicks` is a server-owned counter and is stripped from
        // client-supplied update payloads
        const updates: any = {
            slug,
            original_url: originalUrl,
            description
        };

        // Handle Restore
        if (typeof is_deleted === 'boolean') {
            updates.is_deleted = is_deleted;
        }

        const { error } = await supabase
          .from('links')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ success: true });
      }

      case 'DELETE': {
        // SECURITY: modification requires a signed-in user (anonymous users
        // previously passed the public-link permission check via userId=null)
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized - Login required' });
        }

        const { id } = req.query;
        if (typeof id !== 'string') {
          return res.status(400).json({ error: 'ID required' });
        }
        
        // Fetch to check type/permissions
        const { data: existing } = await supabase
           .from('links')
           .select('user_id, is_personalized')
           .eq('id', id)
           .maybeSingle();

        if (!existing) {
             return res.status(404).json({ error: 'Link not found' });
        }

        // Authorized if: Public (any signed-in user) OR (Personalized AND Owned).
        // userId is guaranteed non-null by the 401 check above, so anonymous
        // requests can no longer delete public links.
        const isAuthorized = !existing.is_personalized || (existing.is_personalized && existing.user_id === userId);
        
        if (!isAuthorized) {
             return res.status(403).json({ error: 'Forbidden - You cannot delete this link' });
        }

        // Soft Delete
        const { error } = await supabase
          .from('links')
          .update({ is_deleted: true })
          .eq('id', id);

        if (error) throw error;
        
        return res.status(200).json({ success: true });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
