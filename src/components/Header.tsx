import React, { useState, useEffect } from 'react';
import {
  PanelLeft,
  Layers,
  Moon,
  Sun,
  BookOpen,
  MapPin,
  Headphones,
  Youtube,
  Globe,
  StickyNote,
  Search,
  Command,
  Sparkles
} from 'lucide-react';
import { ViewType, TimelineItem, CalendarEvent, MetricsModalState } from '../types';
import { GlobalSearchPalette } from './search/GlobalSearchPalette';

interface HeaderProps {
  currentView?: ViewType;
  isAmoled: boolean;
  onToggleAmoled: () => void;
  onToggleSidebar: () => void;
  totalEventsCount: number;
  timelineData?: TimelineItem[];
  dailyNotesMap?: Record<string, string>;
  calendarEvents?: CalendarEvent[];
  onSelectView?: (view: ViewType) => void;
  onJumpToDate?: (date: Date) => void;
  onSelectSearchResult?: (dateStr: string, item: TimelineItem) => void;
  onOpenMetricsModal?: (state: MetricsModalState) => void;
  onOpenBrowserModal?: (item: TimelineItem) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = 'timeline',
  isAmoled,
  onToggleAmoled,
  onToggleSidebar,
  totalEventsCount,
  timelineData = [],
  dailyNotesMap = {},
  calendarEvents = [],
  onSelectView = () => {},
  onJumpToDate = () => {},
  onSelectSearchResult = () => {},
  onOpenMetricsModal,
  onOpenBrowserModal,
  onOpenMapModal
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMac, setIsMac] = useState<boolean>(false);

  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  // Global keyboard shortcuts: Cmd+K / Ctrl+K / '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === '/' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getViewName = (view: string) => {
    switch (view) {
      case 'timeline':
        return { name: 'Journal', icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> };
      case 'maptimeline':
        return { name: 'Map Timeline', icon: <MapPin className="w-3.5 h-3.5 text-blue-500" /> };
      case 'spotify':
        return { name: 'Spotify Music', icon: <Headphones className="w-3.5 h-3.5 text-emerald-500" /> };
      case 'youtube':
        return { name: 'YouTube History', icon: <Youtube className="w-3.5 h-3.5 text-red-500" /> };
      case 'browser':
        return { name: 'Browsing Activity', icon: <Globe className="w-3.5 h-3.5 text-cyan-500" /> };
      case 'notes':
        return { name: 'Notes & Diary', icon: <StickyNote className="w-3.5 h-3.5 text-amber-500" /> };
      default:
        return { name: 'Timeline', icon: <Layers className="w-3.5 h-3.5 text-emerald-500" /> };
    }
  };

  const activeView = getViewName(currentView || 'timeline');

  return (
    <>
      <header className="ios-glass border-b border-gray-200/80 dark:border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between z-30 shrink-0 transition-all gap-2 sm:gap-4">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-xl text-gray-600 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            title="Toggle Navigation Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-1.5 rounded-xl shadow-sm flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight hidden xs:block">
                My Life
              </h1>
            </div>
          </div>

          {/* View Breadcrumb Pill */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {activeView.icon}
            <span>{activeView.name}</span>
          </div>
        </div>

        {/* Center: Powerful Global Omnibar Search Trigger */}
        <div className="flex-1 max-w-xl mx-auto px-1 sm:px-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 bg-gray-100/90 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-2xl text-left transition-all group cursor-pointer shadow-2xs hover:shadow-sm"
            title={`Search across all life events (${isMac ? '⌘K' : 'Ctrl+K'})`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-200 truncate">
                  Search all life history...
                </span>
                <span className="hidden xl:inline text-[11px] text-gray-400 dark:text-gray-500">
                  (music, videos, places, web, notes)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xs">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
              <span className="sm:hidden text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </div>

        {/* Right: Event Count Badge & Theme Toggle */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 bg-gray-100/90 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-gray-200/80 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
              {totalEventsCount.toLocaleString()} <span className="text-gray-400 font-normal">records</span>
            </span>
          </div>

          {/* Theme Toggle (Light / AMOLED Dark) */}
          <button
            onClick={onToggleAmoled}
            className="w-8 h-8 bg-gray-100/90 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200/80 dark:border-white/10 hover:bg-gray-200/80 dark:hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
            title="Toggle Dark/Light Mode"
          >
            {isAmoled ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Full Global Search Palette Modal */}
      <GlobalSearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        timelineData={timelineData}
        dailyNotesMap={dailyNotesMap}
        calendarEvents={calendarEvents}
        currentView={currentView}
        onSelectView={onSelectView}
        onJumpToDate={onJumpToDate}
        onSelectSearchResult={onSelectSearchResult}
        onOpenMetricsModal={onOpenMetricsModal}
        onOpenBrowserModal={onOpenBrowserModal}
        onOpenMapModal={onOpenMapModal}
      />
    </>
  );
};

