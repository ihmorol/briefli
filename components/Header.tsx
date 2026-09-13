import React from 'react';
import { Link as LinkIcon, Search, Plus } from 'lucide-react';
import { UserButton } from "@clerk/clerk-react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // The desktop and mobile search inputs share the same markup; each keeps
  // its own wrapper and input styling.
  variant: 'desktop' | 'mobile';
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery, variant }) => {
  const isDesktop = variant === 'desktop';

  return (
    <div className={isDesktop ? 'relative hidden md:block group' : 'relative'}>
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isDesktop ? 'group-focus-within:text-primary-500 transition-colors' : ''}`} />
      <input
        type="text"
        placeholder="Search links..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={isDesktop
          ? 'bg-slate-900 border border-slate-800 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all w-64 text-slate-200'
          : 'w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-200'}
      />
    </div>
  );
};

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenCreate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenCreate
}) => {
  return (
    <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary-600 p-2 rounded-lg">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent hidden sm:block">
            BriefLi
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} variant="desktop" />

          <button
            onClick={onOpenCreate}
            className="hidden sm:flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-900/20"
          >
            <Plus className="w-4 h-4" />
            Create Link
          </button>

          <UserButton />
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-4">
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} variant="mobile" />
      </div>
    </header>
  );
};
