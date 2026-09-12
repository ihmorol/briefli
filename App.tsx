import React, { useState } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Link as LinkIcon, Trash2, Undo2, Lock, Globe } from 'lucide-react';
import { ShortLink } from './types';
import { LinkCard } from './components/LinkCard';
import { LinkModal } from './components/LinkModal';
import { Header } from './components/Header';
import { StorageService } from './services/storageService';
import { useAppState } from './hooks/useAppState';
import { SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import "./index.css"

type TabType = 'public' | 'personalized';

export default function App() {
  const { 
    publicLinks, 
    personalizedLinks, 
    trashPublicLinks,
    trashPersonalizedLinks,
    baseUrl, 
    loading, 
    saveLink, 
    deleteLink, 
    restoreLink
  } = useAppState();
  
  const { isSignedIn, getToken } = useAuth();

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const [isTrashOpen, setIsTrashOpen] = useState(false);
  
  const [editingLink, setEditingLink] = useState<ShortLink | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('public');
  const [trashTab, setTrashTab] = useState<TabType>('public');

  const handleSaveLink = async (linkData: Omit<ShortLink, 'id' | 'createdAt' | 'clicks'>) => {
    // Determine isPersonalized based on active tab
    const isPersonalized = activeTab === 'personalized';
    
    // Safety check just in case
    if (isPersonalized && !isSignedIn) {
        alert("You must be signed in to create personalized links.");
        return;
    }

    const success = await saveLink({ ...linkData, isPersonalized }, editingLink?.id);
    if (success) {
      setIsLinkModalOpen(false);
      setEditingLink(undefined);
    }
  };

  const handleDeleteLink = (id: string) => {
    if (confirm('Are you sure you want to move this link to trash?')) {
      deleteLink(id);
    }
  };

  const handleEditLink = (link: ShortLink) => {
    setEditingLink(link);
    setIsLinkModalOpen(true);
  };

  // AI suggestions require a Clerk token (the endpoint enforces sign-in), so
  // LinkModal receives a ready-to-call callback instead of the token itself.
  const getSuggestions = async (payload: { description?: string; originalUrl?: string }) => {
    const token = await getToken();
    return StorageService.suggestSlugs(payload, token);
  };

  // Determine current list based on tab
  const activeLinks = activeTab === 'public' ? publicLinks : personalizedLinks;
  
  const filteredLinks = activeLinks.filter(link => 
    link.slug.toLowerCase().includes(searchQuery.toLowerCase()) || 
    link.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (link.description && link.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
       <SignedOut>
         {/* Allow viewing Public links even when signed out? 
             User said "Public links... visible to everyone".
             So we should render the main UI but restrict Personalized tab.
         */}
      </SignedOut>
      
        <Header 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onOpenCreate={() => { setEditingLink(undefined); setIsLinkModalOpen(true); }}
        />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">
          
          {/* Tabs */}
          <div className="flex space-x-4 mb-6 border-b border-slate-800 pb-1">
             <button
               onClick={() => setActiveTab('public')}
               className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'public' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
             >
                <Globe className="w-4 h-4" />
                Public Links
             </button>
             <button
               onClick={() => setActiveTab('personalized')}
               className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'personalized' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
             >
                <Lock className="w-4 h-4" />
                Personalized Links
             </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-200">
              {activeTab === 'public' ? 'Global Public Feed' : 'My Personal Collection'} <span className="text-slate-500 text-sm font-normal ml-2">({filteredLinks.length})</span>
            </h2>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeTab === 'personalized' && !isSignedIn ? (
              <div className="flex items-center justify-center py-8 md:py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                 
                 <div className="bg-slate-800 p-1 rounded-xl flex flex-col lg:flex-row items-center justify-center gap-3 lg:pr-2.5 max-w-full mx-2">
                  <div className="flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 bg-slate-900 rounded-xl lg:py-40">
                    <Lock className="w-8 h-8 md:w-12 md:h-12 text-red-600 mb-4" />
                    <h3 className="text-lg md:text-xl font-medium text-slate-300 mb-2 text-center">Login Required</h3>
                    <p className="text-slate-500 max-w-md text-center text-sm md:text-base mb-4 lg:mb-6 px-4">You need to sign in to access and create your personalized links.</p>
                  </div>
                  <div className="pb-4 lg:pb-0">
                    <SignIn />
                  </div>
                 </div>
              </div>
          ) : (
             loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
              ) : filteredLinks.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                  <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-slate-500">
                    <LinkIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-300 mb-2">No links found</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mb-6">
                    {searchQuery ? 'Try adjusting your search query.' : activeTab === 'public' ? 'Be the first to share a link with the world!' : 'Create your first private shortlink.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => { setEditingLink(undefined); setIsLinkModalOpen(true); }}
                      className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                      Create Link
                    </button>
                  )}
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                  {filteredLinks.map(link => (
                    <LinkCard 
                      key={link.id} 
                      link={link} 
                      baseUrl={baseUrl} 
                      onEdit={handleEditLink}
                      onDelete={handleDeleteLink}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )
          )}
        </main>

        {/* Trash Icon */}
        <button
           onClick={() => setIsTrashOpen(true)}
           className="fixed bottom-6 left-6 p-3 bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-800 rounded-full shadow-lg hover:bg-slate-800 transition-all z-40"
           title="Trash"
        >
           <Trash2 className="w-5 h-5" />
        </button>

        {/* Floating Action Button (Mobile) */}
        <button
          onClick={() => { setEditingLink(undefined); setIsLinkModalOpen(true); }}
          className="sm:hidden fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-xl shadow-primary-900/40 z-30 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Modals */}
        {isLinkModalOpen && (
          <LinkModal
            isOpen={isLinkModalOpen}
            onClose={() => { setIsLinkModalOpen(false); setEditingLink(undefined); }}
            onSave={handleSaveLink}
            initialData={editingLink}
            baseUrl={baseUrl}
            getSuggestions={getSuggestions}
          />
        )}



        {/* Trash Modal */}
        {isTrashOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-red-400" /> Trash
                      </h3>
                      <button onClick={() => setIsTrashOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <Plus className="w-6 h-6 rotate-45" />
                      </button>
                    </div>

                    <div className="flex border-b border-slate-800 px-6 pt-2">
                        <button
                           onClick={() => setTrashTab('public')}
                           className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 mr-4 ${trashTab === 'public' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                           Public Trash
                        </button>
                        <button
                           onClick={() => setTrashTab('personalized')}
                           className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${trashTab === 'personalized' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                           Personalized Trash
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {trashTab === 'personalized' && !isSignedIn ? (
                             <div className="text-center py-10 text-slate-500">Sign in to view your trash.</div>
                        ) : (
                            (trashTab === 'public' ? trashPublicLinks : trashPersonalizedLinks).length === 0 ? (
                                <div className="text-center py-10 text-slate-500">Trash is empty.</div>
                            ) : (
                                <div className="space-y-3">
                                   {(trashTab === 'public' ? trashPublicLinks : trashPersonalizedLinks).map(link => (
                                       <div key={link.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
                                            <div className="overflow-hidden">
                                                <div className="font-mono text-slate-300 truncate">/{link.slug}</div>
                                                <div className="text-xs text-slate-500 truncate">{link.originalUrl}</div>
                                            </div>
                                            <button 
                                              onClick={() => restoreLink(link.id, trashTab === 'personalized')}
                                              className="ml-4 flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-green-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                                              title="Restore"
                                            >
                                               <Undo2 className="w-3 h-3" /> Restore
                                            </button>
                                       </div>
                                   ))}
                                </div>
                            )
                        )}
                    </div>
               </div>
           </div>
        )}
    </div>
  );
}
