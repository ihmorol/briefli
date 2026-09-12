import React, { useState } from 'react';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { ShortLink } from '../types';

type TrashTab = 'public' | 'personalized';

interface TrashModalProps {
  trashPublicLinks: ShortLink[];
  trashPersonalizedLinks: ShortLink[];
  isSignedIn: boolean;
  onClose: () => void;
  onRestore: (id: string, isPersonalized: boolean) => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  trashPublicLinks,
  trashPersonalizedLinks,
  isSignedIn,
  onClose,
  onRestore
}) => {
  const [trashTab, setTrashTab] = useState<TrashTab>('public');

  const activeTrashLinks = trashTab === 'public' ? trashPublicLinks : trashPersonalizedLinks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" /> Trash
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
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
            activeTrashLinks.length === 0 ? (
              <div className="text-center py-10 text-slate-500">Trash is empty.</div>
            ) : (
              <div className="space-y-3">
                {activeTrashLinks.map(link => (
                  <div key={link.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div className="overflow-hidden">
                      <div className="font-mono text-slate-300 truncate">/{link.slug}</div>
                      <div className="text-xs text-slate-500 truncate">{link.originalUrl}</div>
                    </div>
                    <button
                      onClick={() => onRestore(link.id, trashTab === 'personalized')}
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
  );
};
