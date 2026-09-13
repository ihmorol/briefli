/// <reference types="vite/client" />
import { ShortLink, SlugSuggestionResponse } from '../types';

const API_BASE = '/api';

// R13 FIX: Retry helper with exponential backoff for transient network failures.
// Only idempotent methods (GET/PUT/DELETE) are retried. POST gets a single
// attempt: a timeout after the server already inserted the link would retry
// into a guaranteed 409 (slug conflict) — or a silent double-insert.
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 500;

async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const retries = method === 'POST' ? 1 : MAX_RETRIES;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Don't retry on client errors (4xx), only server errors (5xx) and network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries - 1) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

export const StorageService = {
  getLinks: async (token?: string | null, type: 'public' | 'personalized' | 'all' = 'public', trash: boolean = false): Promise<ShortLink[]> => {
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `${API_BASE}/links?trash=${trash}`;
    if (type !== 'all') {
      url += `&type=${type}`;
    }

    const response = await fetchWithRetry(url, { headers });
    if (!response.ok) {
      // Throw (don't swallow) so callers can surface the outage; returning []
      // here made a server failure look like an empty account.
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch links');
    }
    return await response.json();
  },

  addLink: async (link: Omit<ShortLink, 'id' | 'createdAt' | 'clicks' | 'userId' | 'isDeleted' | 'isPersonalized'> & { isPersonalized?: boolean }, token?: string | null): Promise<ShortLink> => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetchWithRetry(`${API_BASE}/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify(link)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create link');
    }
    return await response.json();
  },

  updateLink: async (updatedLink: ShortLink, token?: string | null): Promise<void> => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetchWithRetry(`${API_BASE}/links`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        id: updatedLink.id,
        slug: updatedLink.slug,
        originalUrl: updatedLink.originalUrl,
        description: updatedLink.description,
        clicks: updatedLink.clicks,
        isDeleted: updatedLink.isDeleted
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update link');
    }
  },

  deleteLink: async (id: string, token?: string | null): Promise<void> => {
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetchWithRetry(`${API_BASE}/links?id=${id}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete link');
    }
  },

  // AI slug suggestions go through the authenticated API endpoint — the
  // Gemini key lives server-side only. Plain fetch, deliberately NOT retried
  // via fetchWithRetry: this POST is neither idempotent nor cheap.
  suggestSlugs: async (payload: { description?: string; originalUrl?: string }, token?: string | null): Promise<string[]> => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/suggest-slug`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch suggestions');
    }
    const data: SlugSuggestionResponse = await response.json();
    return data.suggestions;
  }
};