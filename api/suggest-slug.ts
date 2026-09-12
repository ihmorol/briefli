import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { requireUser } from './_lib/auth.js';
import { ApiError, badRequest } from './_lib/apiError.js';
import { SuggestSlugSchema } from './schema.js';
import { sanitizeSlug, isSlugValid } from '../lib/slug.js';
import type { SlugSuggestionResponse } from '../types.js';
import { withApi } from './_lib/withApi.js';

const MAX_SUGGESTIONS = 3;

// SECURITY: GEMINI_API_KEY is read here, server-side only. It must never be
// inlined into the browser bundle (the removed vite define block did exactly
// that), so the client reaches Gemini exclusively through this endpoint.
async function suggestSlugHandler(req: VercelRequest, res: VercelResponse) {
  // AI calls cost money: only signed-in users may spend it. userId itself is
  // not needed beyond the auth check.
  await requireUser(req);

  const validation = SuggestSlugSchema.safeParse(req.body);
  if (!validation.success) {
    throw badRequest(validation.error.issues[0].message);
  }

  const { originalUrl, description } = validation.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    throw new ApiError(502, 'Slug suggestions are unavailable');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    I am creating a short link for the following URL: "${originalUrl ?? ''}".
    ${description ? `Description of the content: "${description}".` : ''}

    Suggest 3 creative, short, and memorable slugs (URL paths) for this link.
    Slugs should be:
    1. URL-safe (kebab-case or camelCase).
    2. Short (ideally under 15 characters).
    3. Relevant to the content.

    Return the result as a JSON array of strings.
  `;

  let rawSuggestions: string[];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error('Gemini returned an empty response');

    const data: unknown = JSON.parse(text);
    const suggestions = (data as { suggestions?: unknown }).suggestions;
    rawSuggestions = Array.isArray(suggestions)
      ? suggestions.filter((s): s is string => typeof s === 'string')
      : [];
  } catch (error) {
    console.error('Error generating slug suggestions:', error);
    throw new ApiError(502, 'Failed to generate slug suggestions');
  }

  // Defense in depth: model output is untrusted. Sanitize -> validate ->
  // dedupe -> cap, so the client only ever sees slugs obeying the same rules
  // as user-typed ones.
  const cleaned: string[] = [];
  for (const raw of rawSuggestions) {
    const slug = sanitizeSlug(raw);
    if (!isSlugValid(slug) || cleaned.includes(slug)) continue;
    cleaned.push(slug);
    if (cleaned.length === MAX_SUGGESTIONS) break;
  }

  if (cleaned.length === 0) {
    throw new ApiError(502, 'Failed to generate slug suggestions');
  }

  const body: SlugSuggestionResponse = { suggestions: cleaned };
  return res.status(200).json(body);
}

export default withApi(suggestSlugHandler, ['POST']);
