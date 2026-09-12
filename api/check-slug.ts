import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { withApi } from './_lib/withApi.js';

async function checkSlugHandler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug parameter is required' });
  }

  const { data: existing, error } = await supabase
    .from('links')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;

  return res.status(200).json({ exists: !!existing });
}

export default withApi(checkSlugHandler, ['GET']);
