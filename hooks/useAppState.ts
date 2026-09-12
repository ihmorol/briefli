import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShortLink } from '../types';
import { StorageService } from '../services/storageService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '@clerk/clerk-react';

// Flatten a fetched page of links into the single keyed store. Duplicate ids
// (same link appearing in two fetched views) collapse to the last occurrence.
const toRecord = (links: ShortLink[]): Record<string, ShortLink> => {
  const record: Record<string, ShortLink> = {};
  for (const link of links) {
    record[link.id] = link;
  }
  return record;
};

export const useAppState = () => {
  const { success, error } = useToast();
  const { getToken, userId } = useAuth();

  // One deep store: every link keyed by id. The four UI lists are pure
  // derivations of it, so mutations never need to decide "which list" —
  // they patch the record and the views recompute.
  const [linksById, setLinksById] = useState<Record<string, ShortLink>>({});
  const [loading, setLoading] = useState(true);

  // Latest-store mirror for the rare async handler that must inspect a record
  // (the PUT payload needs the record's clicks/isDeleted). Reading the ref
  // always sees the newest committed store, unlike the old render-closure
  // reads that caused stale-closure bugs under back-to-back saves.
  const linksByIdRef = useRef<Record<string, ShortLink>>({});
  linksByIdRef.current = linksById;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();

      if (userId) {
        // Typed tuple destructure — no positional `as` casts to silently
        // break if the request order ever changes.
        const [fetchedPublic, fetchedPublicTrash, fetchedPersonalized, fetchedPersonalizedTrash] = await Promise.all([
          StorageService.getLinks(token, 'public'),
          StorageService.getLinks(token, 'public', true),
          StorageService.getLinks(token, 'personalized'),
          StorageService.getLinks(token, 'personalized', true)
        ]);
        setLinksById(toRecord([...fetchedPublic, ...fetchedPublicTrash, ...fetchedPersonalized, ...fetchedPersonalizedTrash]));
      } else {
        const [fetchedPublic, fetchedPublicTrash] = await Promise.all([
          StorageService.getLinks(token, 'public'),
          StorageService.getLinks(token, 'public', true)
        ]);
        // Signed out: replace the whole store so personalized links from a
        // previous session don't linger.
        setLinksById(toRecord([...fetchedPublic, ...fetchedPublicTrash]));
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      error('Failed to load links');
    } finally {
      setLoading(false);
    }
    // Deliberately not depending on the toast helpers: the ToastContext value
    // changes identity on every toast, which would re-trigger this load.
  }, [getToken, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveLink = async (linkData: Omit<ShortLink, 'id' | 'createdAt' | 'clicks' | 'userId' | 'isDeleted'> & { isPersonalized?: boolean }, id?: string) => {
    try {
      const token = await getToken();
      if (id) {
        const currentLink = linksByIdRef.current[id];
        if (!currentLink) throw new Error('Link not found');

        const updatedLink = { ...currentLink, ...linkData, isPersonalized: linkData.isPersonalized };

        await StorageService.updateLink(updatedLink, token);

        setLinksById(prev => {
          if (!prev[id]) return prev;
          return { ...prev, [id]: updatedLink };
        });
        success('Link updated successfully');
      } else {
        const newLink = await StorageService.addLink(linkData, token);
        setLinksById(prev => ({ ...prev, [newLink.id]: newLink }));
        success('Link created successfully');
      }
      return true;
    } catch (err: any) {
      error(err.message || 'Failed to save link');
      return false;
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const token = await getToken();
      await StorageService.deleteLink(id, token);

      setLinksById(prev => {
        const current = prev[id];
        if (!current) return prev;
        return { ...prev, [id]: { ...current, isDeleted: true } };
      });
      success('Link moved to trash');
    } catch (err: any) {
      console.error(err);
      error(err.message || 'Failed to delete link');
    }
  };

  const restoreLink = async (id: string, isPersonalized: boolean) => {
    try {
      const token = await getToken();
      const link = linksByIdRef.current[id];
      // The caller's tab flag is kept for call-site compatibility; the record
      // itself carries the authoritative isPersonalized.
      if (!link || isPersonalized !== (link.isPersonalized ?? false)) return;

      await StorageService.updateLink({ ...link, isDeleted: false }, token);

      setLinksById(prev => {
        const current = prev[id];
        if (!current) return prev;
        return { ...prev, [id]: { ...current, isDeleted: false } };
      });
      success('Link restored');
    } catch (err: any) {
      error(err.message || 'Failed to restore link');
    }
  };

  // Newest first. createdAt is an ISO 8601 string, so lexicographic order is
  // chronological order — sorting here keeps every view stable regardless of
  // insertion/update order.
  const { publicLinks, personalizedLinks, trashPublicLinks, trashPersonalizedLinks } = useMemo(() => {
    const publicLinks: ShortLink[] = [];
    const personalizedLinks: ShortLink[] = [];
    const trashPublicLinks: ShortLink[] = [];
    const trashPersonalizedLinks: ShortLink[] = [];

    for (const link of Object.values(linksById)) {
      if (link.isPersonalized) {
        (link.isDeleted ? trashPersonalizedLinks : personalizedLinks).push(link);
      } else {
        (link.isDeleted ? trashPublicLinks : publicLinks).push(link);
      }
    }

    const byNewestFirst = (a: ShortLink, b: ShortLink) => b.createdAt.localeCompare(a.createdAt);

    return {
      publicLinks: publicLinks.sort(byNewestFirst),
      personalizedLinks: personalizedLinks.sort(byNewestFirst),
      trashPublicLinks: trashPublicLinks.sort(byNewestFirst),
      trashPersonalizedLinks: trashPersonalizedLinks.sort(byNewestFirst)
    };
  }, [linksById]);

  return {
    publicLinks,
    personalizedLinks,
    trashPublicLinks,
    trashPersonalizedLinks,
    loading,
    saveLink,
    deleteLink,
    restoreLink
  };
};
