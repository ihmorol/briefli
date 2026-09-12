import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { ShortLink } from '../types';
import { sanitizeSlug, SLUG_MAX_LENGTH } from '../lib/slug';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ShortLink, 'id' | 'createdAt' | 'clicks'>) => void;
  initialData?: ShortLink;
  baseUrl: string;
  // AI suggestions call the authenticated /api/suggest-slug endpoint; the
  // Clerk token is owned by App.tsx, so it hands down a ready-to-call
  // callback instead of this component touching auth directly.
  getSuggestions: (payload: { description?: string; originalUrl?: string }) => Promise<string[]>;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, onSave, initialData, baseUrl, getSuggestions }) => {
  const [originalUrl, setOriginalUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setOriginalUrl(initialData.originalUrl);
      setSlug(initialData.slug);
      setDescription(initialData.description || '');
    } else {
      setOriginalUrl('');
      // Slug left empty -> the server generates one on save.
      setSlug('');
      setDescription('');
    }
    setSuggestions([]);
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalUrl) return;
    // An empty slug means "auto-generate": the server assigns one and the
    // created link (with its server slug) is inserted into app state by the
    // saveLink path (StorageService.addLink returns the API response).
    onSave({ originalUrl, slug, description });
  };

  const handleGenerateSlugs = async () => {
    if (!originalUrl) return;
    setIsGenerating(true);
    setSuggestions([]);

    try {
      const results = await getSuggestions({ originalUrl, description });
      setSuggestions(results);
    } catch (e) {
      // Same UX as before: on failure no suggestions are shown.
      console.error('Failed to fetch slug suggestions:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">
            {initialData ? 'Edit Shortlink' : 'Create New Link'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Destination URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Destination URL</label>
            <input
              type="url"
              required
              placeholder="https://very-long-url.com/portfolio/projects/2024"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
             <div className="flex justify-between">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description (Optional)</label>
             </div>
            <input
              type="text"
              placeholder="My design portfolio 2024"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Short Link / Slug */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Short Link</label>
              <button
                type="button"
                onClick={handleGenerateSlugs}
                disabled={!originalUrl || isGenerating}
                className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isGenerating ? 'Thinking...' : 'AI Suggest'}
              </button>
            </div>
            
            <div className="flex rounded-lg border border-slate-800 bg-slate-950 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
              <span className="flex items-center px-4 text-slate-500 bg-slate-900/50 border-r border-slate-800 rounded-l-lg text-sm select-none">
                {cleanBase}
              </span>
              <input
                type="text"
                placeholder="portfolio"
                value={slug}
                maxLength={SLUG_MAX_LENGTH}
                onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                className="flex-1 bg-transparent border-0 px-4 py-2.5 text-slate-100 focus:ring-0 focus:outline-none placeholder:text-slate-600 font-mono"
              />
            </div>

            <p className="text-xs text-slate-500">
              3-50 characters: letters, numbers, hyphens, underscores. Leave empty to auto-generate.
            </p>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs text-slate-500 mb-2">AI Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlug(sanitizeSlug(s))}
                      className="text-xs bg-slate-800 hover:bg-primary-900/40 hover:text-primary-300 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!originalUrl}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-900/20"
            >
              {initialData ? 'Save Changes' : 'Create Link'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};