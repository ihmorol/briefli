import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { unauthorized } from './_lib/apiError.js';
import { withApi } from './_lib/withApi.js';

// Free-plan Supabase projects are paused after roughly a week without
// activity, which is what took the links offline. One real query a day keeps
// the project awake; a request to the project root is not a reliable activity
// signal, so this deliberately reads from a table.

// PostgREST reports a missing table with this code, which is what a project
// looks like before the migrations have been run against it.
const MISSING_TABLE_CODE = 'PGRST205';

// Vercel sends `Authorization: Bearer $CRON_SECRET` on scheduled invocations
// once CRON_SECRET is defined in the project env. Until then the endpoint
// stays callable, which is also how the first run gets triggered by hand.
function assertCronAuthorized(req: VercelRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('keepalive: CRON_SECRET is not set, endpoint is publicly callable');
    return;
  }

  if (req.headers.authorization !== `Bearer ${secret}`) {
    throw unauthorized();
  }
}

async function keepaliveHandler(req: VercelRequest, res: VercelResponse) {
  assertCronAuthorized(req);

  const startedAt = Date.now();
  const { error } = await supabase.from('links').select('id').limit(1);
  const latencyMs = Date.now() - startedAt;

  if (!error) {
    return res.status(200).json({
      ok: true,
      checkedAt: new Date().toISOString(),
      latencyMs
    });
  }

  console.error('keepalive failed:', error);

  // A failed ping is the answer this endpoint exists to deliver, so it is
  // reported as a body rather than thrown: the two failure modes below need
  // different fixes and would otherwise be indistinguishable in the cron log.
  const hint =
    error.code === MISSING_TABLE_CODE
      ? "Run migration.sql in the Supabase SQL editor: the 'links' table does not exist yet"
      : 'Project may be paused or deleted, or SUPABASE_URL/SUPABASE_KEY are wrong';

  return res.status(503).json({
    ok: false,
    checkedAt: new Date().toISOString(),
    latencyMs,
    error: error.message,
    hint
  });
}

export default withApi(keepaliveHandler, ['GET']);
