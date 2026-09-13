export interface ShortLink {
  id: string;
  slug: string;
  originalUrl: string;
  description?: string;
  createdAt: number;
  clicks: number;
  userId?: string;
  isPersonalized?: boolean;
  isDeleted?: boolean;
}

export interface SlugSuggestionResponse {
  suggestions: string[];
}