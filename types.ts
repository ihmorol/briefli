export interface ShortLink {
  id: string;
  slug: string;
  originalUrl: string;
  description?: string;
  // Postgres timestamptz serialized by the API as an ISO 8601 string
  createdAt: string;
  clicks: number;
  userId?: string;
  isPersonalized?: boolean;
  isDeleted?: boolean;
}

export interface SlugSuggestionResponse {
  suggestions: string[];
}