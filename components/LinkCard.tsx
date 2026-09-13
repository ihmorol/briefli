import React, { useState } from 'react';
import { Copy, Edit2, Trash2, ExternalLink, MoreVertical, MousePointerClick, Link as LinkIcon } from 'lucide-react';
import { ShortLink } from '../types';
import { BASE_URL } from '../config';

interface LinkCardProps {
  link: ShortLink;
  onEdit: (link: ShortLink) => void;
  onDelete: (id: string) => void;
  viewMode: 'grid' | 'list';
}

export const LinkCard: React.FC<LinkCardProps> = ({ link, onEdit, onDelete, viewMode }) => {
  const [copied, setCopied] = useState(false);

  // Ensure base url ends with slash for display
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  const fullShortLink = `${cleanBase}${link.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShortLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(link.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  if (viewMode === 'list') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
             <div className="font-mono text-primary-400 font-medium truncate text-base flex items-center gap-1">
               <span className="text-slate-600 select-none">/</span>{link.slug}
             </div>
             {link.description && (
                <span className="hidden sm:inline-block text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                    {link.description}
                </span>
             )}
          </div>
          <a 
            href={link.originalUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-slate-500 text-xs truncate hover:text-slate-300 block mt-1"
          >
            {link.originalUrl}
          </a>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6 self-end sm:self-center w-full sm:w-auto justify-between sm:justify-end">
           <div className="flex items-center gap-1 text-slate-600 text-xs" title="Clicks (Simulated)">
             <MousePointerClick className="w-3 h-3" />
             {link.clicks}
           </div>
           
           <div className="flex items-center gap-1">
              <button 
                onClick={handleCopy}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                title="Copy Link"
              >
                {copied ? <span className="text-green-500 font-bold text-xs">Copied</span> : <Copy className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => onEdit(link)}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-primary-400 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(link.id)}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">{formattedDate}</span>
            <div className="font-mono text-lg text-primary-400 font-medium truncate flex items-center">
              <span className="text-slate-600 select-none text-sm mr-1">/</span>
              {link.slug}
            </div>
        </div>
        <div className="bg-slate-800/50 p-1.5 rounded-lg">
             <LinkIcon className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 mb-4 min-h-[3rem]">
        {link.description && (
          <p className="text-sm text-slate-300 line-clamp-2 mb-2">{link.description}</p>
        )}
        <a 
          href={link.originalUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-slate-500 hover:text-slate-300 truncate flex items-center gap-1 w-full"
        >
          {link.originalUrl}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800/50 mt-auto">
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <MousePointerClick className="w-3 h-3" />
          <span>{link.clicks} clicks</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={handleCopy}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors relative"
            title="Copy"
          >
             {copied ? <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] px-2 py-1 rounded">Copied!</span> : null}
            <Copy className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onEdit(link)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary-400 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(link.id)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};