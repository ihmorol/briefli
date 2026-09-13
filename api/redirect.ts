
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.redirect(307, '/');
  }

  try {
    // R6 FIX: Add is_deleted check to prevent deleted links from redirecting
    const { data: link, error } = await supabase
      .from('links')
      .select('id, original_url')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !link) {
      if (error) console.error('Supabase error:', error);
      // Redirect to home if link not found or deleted
      return res.redirect(302, '/?error=not_found');
    }

    // R4 FIX: Use atomic increment to prevent race conditions
    try {
      // The increment_clicks RPC (defined by migration) is the atomic path.
      const { error: rpcError } = await supabase.rpc('increment_clicks', { link_id: link.id });
      if (rpcError) throw rpcError;
    } catch (rpcError) {
      console.error('increment_clicks RPC failed, using fallback:', rpcError);
      // Fallback (non-atomic): read the current counter, then write current + 1
      // so a failure can never reset clicks to a fixed value.
      const { data: current } = await supabase
        .from('links')
        .select('clicks')
        .eq('id', link.id)
        .maybeSingle();

      await supabase
        .from('links')
        .update({ clicks: (current?.clicks ?? 0) + 1 })
        .eq('id', link.id);
    }

    // Redirect to original URL
    return res.redirect(307, link.original_url);
  } catch (error) {
    console.error('Redirect error:', error);
    return res.redirect(302, '/');
  }
}

