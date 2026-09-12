import { useState, useEffect, useCallback } from 'react';
import { ShortLink } from '../types';
import { StorageService } from '../services/storageService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '@clerk/clerk-react';
import { BASE_URL } from '../config';

export const useAppState = () => {
  const { success, error } = useToast();
  const { getToken, userId } = useAuth();
  
  const [publicLinks, setPublicLinks] = useState<ShortLink[]>([]);
  const [personalizedLinks, setPersonalizedLinks] = useState<ShortLink[]>([]);
  const [trashPublicLinks, setTrashPublicLinks] = useState<ShortLink[]>([]);
  const [trashPersonalizedLinks, setTrashPersonalizedLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const promises = [
        StorageService.getLinks(token, 'public'),
        StorageService.getLinks(token, 'public', true)
      ];

      if (userId) {
        promises.push(StorageService.getLinks(token, 'personalized'));
        promises.push(StorageService.getLinks(token, 'personalized', true));
      }

      const results = await Promise.all(promises);
      
      setPublicLinks(results[0] as ShortLink[]);
      setTrashPublicLinks(results[1] as ShortLink[]);

      if (userId) {
        setPersonalizedLinks(results[2] as ShortLink[]);
        setTrashPersonalizedLinks(results[3] as ShortLink[]);
      } else {
        setPersonalizedLinks([]);
        setTrashPersonalizedLinks([]);
      }

    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveLink = async (linkData: Omit<ShortLink, 'id' | 'createdAt' | 'clicks' | 'userId' | 'isDeleted'> & { isPersonalized?: boolean }, id?: string) => {
    try {
      const token = await getToken();
      if (id) {
        const isPublic = publicLinks.find(l => l.id === id);
        const isPersonalized = personalizedLinks.find(l => l.id === id);
        
        const currentLink = isPublic || isPersonalized;
        if (!currentLink) throw new Error('Link not found');

        const updatedLink = { ...currentLink, ...linkData, isPersonalized: linkData.isPersonalized };
        
        await StorageService.updateLink(updatedLink, token);
        
        if (isPublic) {
            setPublicLinks(prev => prev.map(l => l.id === id ? updatedLink : l));
        } else {
            setPersonalizedLinks(prev => prev.map(l => l.id === id ? updatedLink : l));
        }
        success('Link updated successfully');
      } else {
        const newLink = await StorageService.addLink(linkData, token);
        if (newLink.isPersonalized) {
            setPersonalizedLinks(prev => [newLink, ...prev]);
        } else {
            setPublicLinks(prev => [newLink, ...prev]);
        }
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
      
      const publicLink = publicLinks.find(l => l.id === id);
      if (publicLink) {
          setPublicLinks(prev => prev.filter(l => l.id !== id));
          setTrashPublicLinks(prev => [{ ...publicLink, isDeleted: true }, ...prev]);
      } else {
          const personalizedLink = personalizedLinks.find(l => l.id === id);
          if (personalizedLink) {
              setPersonalizedLinks(prev => prev.filter(l => l.id !== id));
              setTrashPersonalizedLinks(prev => [{ ...personalizedLink, isDeleted: true }, ...prev]);
          }
      }
      success('Link moved to trash');
    } catch (err: any) {
      console.error(err);
      error(err.message || 'Failed to delete link');
    }
  };

  const restoreLink = async (id: string, isPersonalized: boolean) => {
      try {
          const token = await getToken();
          const list = isPersonalized ? trashPersonalizedLinks : trashPublicLinks;
          const link = list.find(l => l.id === id);
          if (!link) return;

          await StorageService.updateLink({ ...link, isDeleted: false }, token);

          if (isPersonalized) {
              setTrashPersonalizedLinks(prev => prev.filter(l => l.id !== id));
              setPersonalizedLinks(prev => [{ ...link, isDeleted: false }, ...prev]);
          } else {
              setTrashPublicLinks(prev => prev.filter(l => l.id !== id));
              setPublicLinks(prev => [{ ...link, isDeleted: false }, ...prev]);
          }
          success('Link restored');
      } catch (err: any) {
          error(err.message || 'Failed to restore link');
      }
  };

  return {
    publicLinks,
    personalizedLinks,
    trashPublicLinks,
    trashPersonalizedLinks,
    baseUrl: BASE_URL,
    loading,
    saveLink,
    deleteLink,
    restoreLink
  };
};
