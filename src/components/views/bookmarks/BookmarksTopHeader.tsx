import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  Radio,
  Upload,
  Folder,
  Tag,
  Plus,
  Download,
  ChevronDown,
  X,
  RefreshCw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Boxes,
  Brain,
  Layers
} from 'lucide-react';
import { BookmarkServiceName } from '../../../utils/bookmarkSyncServices';
import { BookmarksActiveFilter } from './AllBookmarksSubview';

export interface BookmarksTopHeaderProps {
  totalCount: number;
  activeFilter: BookmarksActiveFilter | null;
  onSelectFilter: (filter: BookmarksActiveFilter | null) => void;
  appCounts: Record<string, number>;
  folders?: { name: string; count: number }[];
  tags?: { name: string; count: number }[];
  isRaindropConnected?: boolean;
  isPinterestConnected?: boolean;
  onOpenPasteLink: () => void;
  onOpenSyncModal: (service?: BookmarkServiceName) => void;
  onExportHtml?: () => void;
}

export const BookmarksTopHeader: React.FC<BookmarksTopHeaderProps> = ({
  totalCount,
  activeFilter,
  onSelectFilter,
  appCounts,
  folders = [],
  tags = [],
  isRaindropConnected = false,
  isPinterestConnected = false,
  onOpenPasteLink,
  onOpenSyncModal,
  onExportHtml
}) => {
  const [openDropdown, setOpenDropdown] = useState<'connections' | 'imported' | 'folders' | 'tags' | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (name: 'connections' | 'imported' | 'folders' | 'tags') => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  // Live services definition
  const liveServices: {
    id: 'raindrop' | 'pinterest' | 'mymind' | 'pocket' | 'fabric' | 'keep' | 'notion';
    name: string;
    icon: React.ReactNode;
    color: string;
    isConnected: boolean;
    syncLabel: string;
  }[] = [
    {
      id: 'raindrop',
      name: 'Raindrop.io',
      icon: <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />,
      color: 'blue',
      isConnected: isRaindropConnected,
      syncLabel: isRaindropConnected ? 'Live Sync' : 'Ready'
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />,
      color: 'red',
      isConnected: isPinterestConnected,
      syncLabel: isPinterestConnected ? 'Live Sync' : 'Ready'
    },
    {
      id: 'mymind',
      name: 'mymind',
      icon: <Brain className="w-3.5 h-3.5 text-purple-500 shrink-0" />,
      color: 'purple',
      isConnected: true,
      syncLabel: 'Auto-sync'
    },
    {
      id: 'pocket',
      name: 'Pocket',
      icon: <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />,
      color: 'rose',
      isConnected: false,
      syncLabel: 'Ready'
    },
    {
      id: 'fabric',
      name: 'Fabric.so',
      icon: <Boxes className="w-3.5 h-3.5 text-teal-500 shrink-0" />,
      color: 'teal',
      isConnected: false,
      syncLabel: 'Ready'
    },
    {
      id: 'keep',
      name: 'Google Keep',
      icon: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />,
      color: 'amber',
      isConnected: false,
      syncLabel: 'Ready'
    },
    {
      id: 'notion',
      name: 'Notion Bookmarks',
      icon: <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />,
      color: 'slate',
      isConnected: false,
      syncLabel: 'Ready'
    }
  ];

  // Imported browser sources definition
  const importSources: {
    id: string;
    name: string;
    iconColor: string;
  }[] = [
    { id: 'chrome', name: 'Google Chrome', iconColor: 'text-amber-500' },
    { id: 'safari', name: 'Safari', iconColor: 'text-blue-500' },
    { id: 'firefox', name: 'Mozilla Firefox', iconColor: 'text-orange-500' },
    { id: 'edge', name: 'Microsoft Edge', iconColor: 'text-cyan-500' },
    { id: 'arc', name: 'Arc Browser', iconColor: 'text-rose-500' },
    { id: 'html_file', name: 'HTML File Archive', iconColor: 'text-emerald-500' }
  ];

  // Compute counts
  const totalLiveBookmarks = liveServices.reduce((sum, s) => sum + (appCounts[s.id] || 0), 0);
  const totalImportedBookmarks = importSources.reduce((sum, s) => sum + (appCounts[s.id] || 0), 0);

  const isFilterActive = (type: string, id: string) => {
    return activeFilter?.type === type && activeFilter?.id === id;
  };

  const handleSelectService = (serviceId: string, name: string) => {
    if (isFilterActive('live_service', serviceId)) {
      onSelectFilter(null);
    } else {
      onSelectFilter({ type: 'live_service', id: serviceId, name });
    }
    setOpenDropdown(null);
  };

  const handleSelectImport = (importId: string, name: string) => {
    if (isFilterActive('import', importId)) {
      onSelectFilter(null);
    } else {
      onSelectFilter({ type: 'import', id: importId, name });
    }
    setOpenDropdown(null);
  };

  const handleSelectFolder = (folderName: string) => {
    if (isFilterActive('folder', folderName)) {
      onSelectFilter(null);
    } else {
      onSelectFilter({ type: 'folder', id: folderName, name: folderName });
    }
    setOpenDropdown(null);
  };

  const handleSelectTag = (tagName: string) => {
    if (isFilterActive('tag', tagName)) {
      onSelectFilter(null);
    } else {
      onSelectFilter({ type: 'tag', id: tagName, name: tagName });
    }
    setOpenDropdown(null);
  };

  return (
    <div
      ref={headerRef}
      id="view-header-toolbar"
      className="py-2.5 px-3.5 sm:px-5 border-b border-black/8 dark:border-white/10 bg-white/80 dark:bg-[#121214]/85 backdrop-blur-xl shadow-2xs sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2.5 transition-all"
    >
      {/* Left: Brand / Title + Library Navigation Dropdown Buttons */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
        {/* View Identity Pill */}
        <div className="flex items-center gap-2 shrink-0 mr-1 sm:mr-2">
          <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <Bookmark className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight leading-none">
                Bookmarks
              </span>
              <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
                {totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Indicator Pill (if any filter is active) */}
        {activeFilter && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-semibold shadow-2xs shrink-0">
            <span className="capitalize">{activeFilter.type.replace('_', ' ')}:</span>
            <span className="font-bold truncate max-w-[120px]">{activeFilter.name}</span>
            <button
              type="button"
              onClick={() => onSelectFilter(null)}
              className="p-0.5 hover:bg-blue-500/20 rounded-full transition-colors cursor-pointer"
              title="Clear active filter"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 1. All Button */}
        <button
          type="button"
          id="bookmarks-filter-all"
          onClick={() => onSelectFilter(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            activeFilter === null
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
          }`}
          title="Show all bookmarks"
        >
          All
        </button>

        {/* 2. Connections Dropdown Button */}
        <div className="relative inline-block text-left">
          <button
            type="button"
            id="bookmarks-connections-button"
            onClick={() => toggleDropdown('connections')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              openDropdown === 'connections' || activeFilter?.type === 'live_service'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
            }`}
            title="Live Sync Connections (Raindrop, Pinterest, mymind, Pocket, etc.)"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Connections</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
              {totalLiveBookmarks > 0 ? totalLiveBookmarks : liveServices.filter(s => s.isConnected).length}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'connections' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'connections' && (
            <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-black/5 dark:border-white/5 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Live Sync Services
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {liveServices.length} providers
                </span>
              </div>

              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-0.5">
                {liveServices.map(service => {
                  const count = appCounts[service.id] || 0;
                  const isSelected = isFilterActive('live_service', service.id);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleSelectService(service.id, service.name)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {service.icon}
                        <span className="truncate">{service.name}</span>
                        {service.isConnected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                            Connected
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 font-bold ml-2">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 mt-1.5 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown(null);
                    onOpenSyncModal();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Manage & Connect Services</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Imported Dropdown Button */}
        <div className="relative inline-block text-left">
          <button
            type="button"
            id="bookmarks-imported-button"
            onClick={() => toggleDropdown('imported')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              openDropdown === 'imported' || activeFilter?.type === 'import'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
            }`}
            title="Imported Browser Bookmarks & HTML files"
          >
            <Upload className="w-3.5 h-3.5 text-amber-500" />
            <span>Imported</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
              {totalImportedBookmarks}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'imported' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'imported' && (
            <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-black/5 dark:border-white/5 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Browser & HTML Imports
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {totalImportedBookmarks} items
                </span>
              </div>

              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-0.5">
                {importSources.map(src => {
                  const count = appCounts[src.id] || 0;
                  const isSelected = isFilterActive('import', src.id);

                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => handleSelectImport(src.id, src.name)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 font-medium'
                      }`}
                    >
                      <span className="truncate">{src.name}</span>
                      <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 font-bold ml-2">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 mt-1.5 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown(null);
                    onOpenSyncModal('browser');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Browser / HTML</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Folders Dropdown Button (if folders available) */}
        {folders.length > 0 && (
          <div className="relative inline-block text-left">
            <button
              type="button"
              id="bookmarks-folders-button"
              onClick={() => toggleDropdown('folders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                openDropdown === 'folders' || activeFilter?.type === 'folder'
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 shadow-xs'
                  : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
              }`}
              title="Collections & Folders"
            >
              <Folder className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden xs:inline">Folders</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold">
                {folders.length}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'folders' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'folders' && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-black/5 dark:border-white/5 mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Collections & Folders
                  </span>
                </div>

                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-0.5">
                  {folders.map(f => {
                    const isSelected = isFilterActive('folder', f.name);
                    return (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => handleSelectFolder(f.name)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 font-medium'
                        }`}
                      >
                        <span className="truncate">{f.name}</span>
                        <span className="font-mono text-[11px] text-gray-400 font-bold">{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Tags Dropdown Button (if tags available) */}
        {tags.length > 0 && (
          <div className="relative inline-block text-left">
            <button
              type="button"
              id="bookmarks-tags-button"
              onClick={() => toggleDropdown('tags')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                openDropdown === 'tags' || activeFilter?.type === 'tag'
                  ? 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/40 shadow-xs'
                : 'bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10'
              }`}
              title="Tags"
            >
              <Tag className="w-3.5 h-3.5 text-pink-500" />
              <span className="hidden xs:inline">Tags</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold">
                {tags.length}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'tags' ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === 'tags' && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-black/5 dark:border-white/5 mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Bookmark Tags
                  </span>
                </div>

                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-0.5">
                  {tags.map(t => {
                    const isSelected = isFilterActive('tag', t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => handleSelectTag(t.name)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-pink-500/15 text-pink-700 dark:text-pink-300 font-bold'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 font-medium'
                        }`}
                      >
                        <span className="truncate">#{t.name}</span>
                        <span className="font-mono text-[11px] text-gray-400 font-bold">{t.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Quick Action Buttons (Paste Link, Export HTML) */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Quick Paste Link Button */}
        <button
          type="button"
          id="bookmarks-paste-link-button"
          onClick={onOpenPasteLink}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          title="Paste any URL to save new bookmark"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Paste Link</span>
        </button>

        {/* Export HTML Button */}
        {onExportHtml && totalCount > 0 && (
          <button
            type="button"
            id="bookmarks-export-button"
            onClick={onExportHtml}
            className="p-1.5 bg-white dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl border border-black/10 dark:border-white/10 transition-all cursor-pointer shadow-2xs"
            title="Export Bookmarks as Netscape HTML archive"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
