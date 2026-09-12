import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiError } from './apiError.js';

type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

// Common wrapper for JSON API endpoints. Owns the cross-cutting response
// boilerplate (OPTIONS preflight, 405 with Allow header, ApiError rendering,
// unexpected errors) so handlers only contain endpoint logic. CORS headers
// are set globally by vercel.json and are intentionally not duplicated here.
export function withApi(handler: ApiHandler, allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE']) {
  return async function (req: VercelRequest, res: VercelResponse): Promise<unknown> {
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      if (!req.method || !allowedMethods.includes(req.method)) {
        res.setHeader('Allow', allowedMethods);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
      }

      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('API Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
