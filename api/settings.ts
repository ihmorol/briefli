import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { requireUser } from './_lib/auth.js';
import { badRequest } from './_lib/apiError.js';
import { SettingsSchema } from './schema.js';
import { withApi } from './_lib/withApi.js';

async function settingsHandler(req: VercelRequest, res: VercelResponse) {
  // Settings endpoints require a signed-in caller.
  await requireUser(req);

  switch (req.method) {
    case 'GET': {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('base_url')
        .eq('type', 'general') // Assuming general settings for now, but really should be per user if logic dictates
        //.eq('user_id', userId) // Uncomment if settings are per-user
        .maybeSingle();

      if (error) throw error;

      if (settings) {
        return res.status(200).json({
          baseUrl: settings.base_url
        });
      }
      return res.status(200).json(null);
    }

    case 'POST': {
      const validation = SettingsSchema.safeParse(req.body);
      if (!validation.success) {
        throw badRequest(validation.error.issues[0].message);
      }

      const settings = validation.data;
      const { error } = await supabase
        .from('settings')
        .upsert({
          type: 'general',
          base_url: settings.baseUrl
          // user_id: userId // Uncomment if settings are per-user
        });

      if (error) throw error;

      return res.status(200).json({ success: true });
    }
  }
}

export default withApi(settingsHandler, ['GET', 'POST']);
