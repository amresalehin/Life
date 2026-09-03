import React, { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onSetView: (view: ViewType) => void;
  importedFilesCount?: number;
  onOpenImportedFiles?: () => void;
  onOpenSettings?: () => void;
  isSettingsOpen?: boolean;
  onBatchResolveGeo?: () => void;
  unresolvedCount?: number;
  isGeoResolving?: boolean;
  isAmoled?: boolean;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

// Variation 3 SVGs (clean 18px-style stroke icons matching editorial design)
const JournalIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const MapTimelineIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
  </svg>
);

const PhotosIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const SpotifyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 14.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" />
  </svg>
);

const YouTubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const BrowserIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const NotesIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const BookmarkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const BoxCloudIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSetView,
  importedFilesCount,
  onOpenImportedFiles,
  onOpenSettings,
  isSettingsOpen = false,
  onBatchResolveGeo,
  unresolvedCount = 0,
  isGeoResolving = false,
  isAmoled = false,
  className = '',
  isCollapsed: propIsCollapsed,
  onToggleCollapsed
}) => {
  // Collapsible state (collapsed by default to maximize main content workspace)
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mylife_sidebar_collapsed');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {}
    return true; // Default to collapsed as requested!
  });

  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed;

  const toggleCollapsed = useCallback(() => {
    if (onToggleCollapsed) {
      onToggleCollapsed();
    } else {
      setInternalCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem('mylife_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  }, [onToggleCollapsed]);

  // Keyboard shortcut (Cmd+B or Ctrl+B to toggle sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapsed]);

  const navLinks: {
    id: ViewType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'timeline',
      label: 'Journal',
      icon: <JournalIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'maptimeline',
      label: 'Map Timeline',
      icon: <MapTimelineIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: <PhotosIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'box',
      label: 'Box Cloud',
      icon: <BoxCloudIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'spotify',
      label: 'Spotify',
      icon: <SpotifyIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'youtube',
      label: 'YouTube',
      icon: <YouTubeIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'browser',
      label: 'Browsing',
      icon: <BrowserIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: <BookmarkIcon className="w-[18px] h-[18px]" />
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <NotesIcon className="w-[18px] h-[18px]" />
    }
  ];

  return (
    <nav
      aria-label="Editorial Navigation Sidebar"
      className={`${
        isCollapsed ? 'w-16 px-2 py-4' : 'w-56 md:w-[240px] px-3.5 md:px-4 py-5 md:py-6'
      } shrink-0 h-full flex flex-col justify-between border-r border-black/8 dark:border-white/10 bg-white/75 dark:bg-[#121214]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-[#121214]/75 shadow-[4px_0_24px_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out select-none z-30 ${className}`}
    >
      {/* Top Section */}
      <div className="flex flex-col w-full">
        {/* Header with Collapse/Expand Toggle & App Brand */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2.5 mb-3.5' : 'justify-between mb-4 px-1'} w-full`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden select-none" title="Emreh — Fellow Traveler / Companion (همراه)">
              <div className="w-7 h-7 rounded-xl overflow-hidden shadow-xs flex items-center justify-center border border-stone-300 dark:border-stone-700 shrink-0 bg-[#081318] dark:bg-[#071114] p-0.5">
                <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="Emreh Icon" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-gray-900 dark:text-white truncate leading-tight">
                  Emreh
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate leading-none">
                  Fellow Traveler
                </span>
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-xl overflow-hidden shadow-xs flex items-center justify-center border border-stone-300 dark:border-stone-700 shrink-0 bg-[#081318] dark:bg-[#071114] p-0.5 mb-1" title="Emreh">
              <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="Emreh Icon" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar (⌘B / Ctrl+B)' : 'Collapse sidebar (⌘B / Ctrl+B)'}
            className={`p-2 rounded-xl transition-all cursor-pointer text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 ${
              isCollapsed ? 'w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10' : ''
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <ul className="flex flex-col gap-1.5 list-none p-0 m-0 w-full">
          {navLinks.map(item => {
            const isActive = currentView === item.id;
            return (
              <li key={item.id} className="w-full">
                <button
                  onClick={() => onSetView(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-start gap-3 px-3 py-2.5'
                  } rounded-xl text-[0.85rem] font-medium transition-all cursor-pointer backdrop-blur-xl ${
                    isActive
                      ? 'bg-blue-600/18 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100 font-semibold shadow-xs border border-blue-500/35 dark:border-blue-400/40 backdrop-blur-2xl'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white bg-white/20 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/12 border border-black/5 dark:border-white/8 hover:border-black/12 dark:hover:border-white/20 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <span className={`shrink-0 transition-opacity ${isActive ? 'opacity-100 scale-105' : 'opacity-75'}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sidebar Footer */}
      <div className="flex flex-col gap-1.5 pt-4 border-t border-black/8 dark:border-white/10 w-full">
        {/* Location Resolver (if items pending geocoding) */}
        {unresolvedCount > 0 && onBatchResolveGeo && (
          <button
            onClick={onBatchResolveGeo}
            disabled={isGeoResolving}
            aria-label={`Resolve ${unresolvedCount} Places`}
            title={`Resolve ${unresolvedCount} Places pending reverse geocoding`}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2 relative' : 'justify-between px-2.5 py-2 gap-2'
            } rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/15 dark:bg-blue-500/20 hover:bg-blue-500/25 dark:hover:bg-blue-500/30 border border-blue-500/30 backdrop-blur-xl transition-all cursor-pointer shadow-2xs`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-3.5 h-3.5 ${isGeoResolving ? 'animate-spin' : ''}`} />
              {!isCollapsed && <span className="font-semibold">Resolve Places</span>}
            </div>
            <span className={`font-mono bg-blue-600 dark:bg-blue-500 text-white px-1.5 py-0.5 text-[9px] font-bold rounded-full shadow-2xs ${
              isCollapsed ? 'absolute -top-1 -right-1' : ''
            }`}>
              {unresolvedCount}
            </span>
          </button>
        )}

        {/* Settings */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            aria-label="Open Settings"
            title="Settings (⌘,)"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2 gap-2'
            } rounded-xl text-[0.85rem] font-medium transition-all cursor-pointer backdrop-blur-xl ${
              isSettingsOpen
                ? 'bg-blue-600/18 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100 font-semibold border border-blue-500/35 dark:border-blue-400/40 shadow-xs'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white bg-white/20 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/12 border border-black/5 dark:border-white/8 hover:border-black/12 dark:hover:border-white/20 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4 opacity-75" />
              {!isCollapsed && <span className="font-medium">Settings</span>}
            </div>
            {!isCollapsed && (
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/5">
                ⌘,
              </kbd>
            )}
          </button>
        )}
      </div>
    </nav>
  );
};
