import React from 'react';
import { BookOpen, MapPin, Headphones, Youtube, Globe, StickyNote, FolderArchive, ChevronRight, PanelLeftClose } from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onSetView: (view: ViewType) => void;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  importedFilesCount: number;
  onOpenImportedFiles: () => void;
  onBatchResolveGeo?: () => void;
  unresolvedCount?: number;
  isGeoResolving?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSetView,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  importedFilesCount,
  onOpenImportedFiles,
  onBatchResolveGeo,
  unresolvedCount = 0,
  isGeoResolving = false
}) => {
  const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'timeline', label: 'Journal', icon: <BookOpen className="w-4 h-4 text-emerald-500" /> },
    { id: 'maptimeline', label: 'Map Timeline', icon: <MapPin className="w-4 h-4 text-blue-500" /> },
    { id: 'spotify', label: 'Spotify', icon: <Headphones className="w-4 h-4 text-emerald-500" /> },
    { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4 text-red-500" /> },
    { id: 'browser', label: 'Browsing History', icon: <Globe className="w-4 h-4 text-cyan-500" /> },
    { id: 'notes', label: 'Notes & Diary', icon: <StickyNote className="w-4 h-4 text-amber-500" /> }
  ];

  const sidebarClasses = `
    absolute md:relative z-[60] md:z-10 h-full bg-white dark:bg-[#121212] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-xl md:shadow-none overflow-hidden
    ${isMobileOpen ? 'translate-x-0 w-60' : '-translate-x-full md:translate-x-0'}
    ${isCollapsed ? 'md:w-0 md:opacity-0 md:pointer-events-none md:border-r-0' : 'md:w-60 md:opacity-100'}
  `;

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[50] md:hidden"
        />
      )}
      <aside className={sidebarClasses}>
        <div className="p-3 flex flex-col h-full overflow-y-auto no-scrollbar justify-between w-60 shrink-0">
          <div className="space-y-4">
            <div className="px-2 pt-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Main Views</span>
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSetView(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs font-bold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800/80 shrink-0">
            <button
              onClick={onOpenImportedFiles}
              className="w-full py-2 px-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors border border-gray-200 dark:border-gray-800 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-500" />
                <span>Imported Files</span>
              </span>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {importedFilesCount}
              </span>
            </button>

            {unresolvedCount > 0 && onBatchResolveGeo && (
              <button
                onClick={onBatchResolveGeo}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isGeoResolving ? 'Resolving Places...' : `Resolve ${unresolvedCount} Places`}</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
