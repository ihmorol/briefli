
import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';
import { unauthorized } from './apiError.js';

// Verifies the request's Bearer token and returns the Clerk user id.
// Throws ApiError(401) on a missing or invalid token; it never writes to the
// response itself — rendering is owned by withApi.
export async function requireUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw unauthorized('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  try {
    const { sub: userId } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });
    return userId;
  } catch (error) {
    console.error('Auth Error:', error);
    throw unauthorized('Invalid token');
  }
}
