import React, { useState, useMemo, useEffect } from 'react';
import {
  Bookmark,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  X,
  Layers,
  Sparkles,
  PanelRightClose
} from 'lucide-react';
import { TimelineItem, DateRange } from '../../types';
import { ViewToolbar } from '../ViewToolbar';
import {
  exportToNetscapeHtml,
  BookmarkServiceName
} from '../../utils/bookmarkSyncServices';
import { getRaindropConfig } from '../../utils/raindropSync';
import { getPinterestConfig } from '../../utils/pinterestSync';
import {
  BookmarksSidebar,
  BookmarksSidebarSelection
} from './bookmarks/BookmarksSidebar';
import { BookmarksTopHeader } from './bookmarks/BookmarksTopHeader';
import { PasteLinkModal } from './bookmarks/PasteLinkModal';
import { AllBookmarksSubview, BookmarksActiveFilter } from './bookmarks/AllBookmarksSubview';
import { RaindropSubview } from './bookmarks/RaindropSubview';
import { PinterestSubview } from './bookmarks/PinterestSubview';
import { BrowserBookmarksSubview } from './bookmarks/BrowserBookmarksSubview';
import { PocketSubview } from './bookmarks/PocketSubview';
import { PinboardSubview } from './bookmarks/PinboardSubview';
import { LinkdingSubview } from './bookmarks/LinkdingSubview';
import { KanbanMoodboardView } from './bookmarks/KanbanMoodboardView';
import { MoodboardMasonryView } from './bookmarks/MoodboardMasonryView';
import {
  MoodboardDisplayConfig,
  DEFAULT_MOODBOARD_CONFIG,
  RaindropLayoutMode
} from './bookmarks/RaindropViewMenu';
import { BookmarkCard } from './bookmarks/BookmarkCard';
import { BrowserInspectorPanel } from './browser/BrowserInspectorPanel';
import { getBookmarkAdaptiveTheme } from '../../utils/bookmarkAdaptiveTheme';

export type BookmarksAppSubviewId =
  | 'all'
  | 'raindrop'
  | 'pinterest'
  | 'mymind'
  | 'browser'
  | 'pocket'
  | 'pinboard'
  | 'linkding'
  | 'kanban'
  | 'moodboard'
  | string;

export interface BookmarksViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onImportClick?: () => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  timelineData: TimelineItem[];
  bookmarkNotes: Record<string, string>;
  onSaveBookmarkNote: (url: string, note: string) => void;
  bookmarkTags: Record<string, string[]>;
  onAddBookmarkTag: (url: string, tag: string) => void;
  onRemoveBookmarkTag: (url: string, tag: string) => void;
  sessionSnapshots?: Record<string, string>;
  onOpenSyncModal: (service?: BookmarkServiceName) => void;
  onDeleteItem?: (itemId: string) => void;
  onApplySyncedData?: (result: any, sourceName: string) => void;
  onActiveServiceChange?: (service: string, mediaType?: string) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  timelineData,
  bookmarkNotes,
  onSaveBookmarkNote,
  bookmarkTags,
  onAddBookmarkTag,
  onRemoveBookmarkTag,
  sessionSnapshots = {},
  onOpenSyncModal,
  onDeleteItem,
  onApplySyncedData,
  onActiveServiceChange
}) => {
  // Active bookmarking app subview ('all', 'raindrop', 'pinterest', 'browser', 'pocket', 'pinboard', 'linkding')
  const [activeAppSubview, setActiveAppSubview] = useState<BookmarksAppSubviewId>(() => {
    try {
      return localStorage.getItem('mylife_bookmark_subview') || 'all';
    } catch {
      return 'all';
    }
  });

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<TimelineItem | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Sync active service / media theme whenever subview changes (if no item is currently active)
  useEffect(() => {
    if (!activeItem) {
      onActiveServiceChange?.(activeAppSubview, undefined);
    }
  }, [activeAppSubview, activeItem, onActiveServiceChange]);

  const handleSelectSubview = (id: BookmarksAppSubviewId) => {
    setActiveAppSubview(id);
    setActiveItem(null);
    setIsRightPanelOpen(false);
    onActiveServiceChange?.(id, undefined);
    try {
      localStorage.setItem('mylife_bookmark_subview', id);
    } catch (e) {
      console.warn(e);
    }
  };

  // Moodboard display configuration
  const [moodboardConfig, setMoodboardConfig] = useState<MoodboardDisplayConfig>(() => {
    try {
      const saved = localStorage.getItem('mylife_moodboard_config');
      return saved ? JSON.parse(saved) : DEFAULT_MOODBOARD_CONFIG;
    } catch {
      return DEFAULT_MOODBOARD_CONFIG;
    }
  });

  const handleSaveMoodboardConfig = (config: MoodboardDisplayConfig) => {
    setMoodboardConfig(config);
    try {
      localStorage.setItem('mylife_moodboard_config', JSON.stringify(config));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSelectItem = (item: TimelineItem) => {
    setActiveItem(item);
    setIsRightPanelOpen(true);
    // Auto-detect media type or service from selected item
    const media = item.media_type || (
      item.url?.includes('youtube') || item.url?.includes('youtu.be')
        ? 'video'
        : item.url?.includes('spotify')
        ? 'audio'
        : item.url?.includes('pinterest')
        ? 'image'
        : item.url?.includes('github')
        ? 'code'
        : undefined
    );
    const domainOrService = item.platform || item.domain || activeAppSubview;
    onActiveServiceChange?.(domainOrService, media);
  };

  // 1. Identify all bookmarks from timelineData
  const allBookmarks = useMemo(() => {
    return timelineData.filter(item => {
      if (item.type !== 'browser') return false;
      const isBookmarkTransition = item.transition === 'BOOKMARK';
      const p = (item.platform || '').toLowerCase();
      const isBookmarkPlatform =
        p.includes('raindrop') ||
        p.includes('bookmark') ||
        p.includes('pocket') ||
        p.includes('pinboard') ||
        p.includes('linkding') ||
        p.includes('pinterest') ||
        p.includes('pin');
      const hasCustomNotes = !!(item.url && bookmarkNotes[item.url]?.trim());
      const hasCustomTags = !!(item.url && bookmarkTags[item.url]?.length > 0);

      return isBookmarkTransition || isBookmarkPlatform || hasCustomNotes || hasCustomTags;
    });
  }, [timelineData, bookmarkNotes, bookmarkTags]);

  // 2. Segment bookmarks by bookmarking service for subviews
  const raindropBookmarks = useMemo(() => {
    return allBookmarks.filter(item => {
      const p = (item.platform || '').toLowerCase();
      return p.includes('raindrop');
    });
  }, [allBookmarks]);

  const pinterestBookmarks = useMemo(() => {
    return allBookmarks.filter(item => {
      const p = (item.platform || '').toLowerCase();
      return p.includes('pinterest') || (p.includes('pin') && !p.includes('pinboard'));
    });
  }, [allBookmarks]);

  const browserBookmarks = useMemo(() => {
    return allBookmarks.filter(item => {
      const p = (item.platform || '').toLowerCase();
      return (
        p.includes('browser') ||
        p.includes('chrome') ||
        p.includes('safari') ||
        p.includes('firefox') ||
        p.includes('edge') ||
        p.includes('arc') ||
        item.transition === 'BOOKMARK'
      );
    });
  }, [allBookmarks]);

  const pocketBookmarks = useMemo(() => {
    return allBookmarks.filter(item => {
      const p = (item.platform || '').toLowerCase();
      return p.includes('pocket');
    });
  }, [allBookmarks]);

  const pinboardBookmarks = useMemo(() => {
    return allBookmarks.filter(item => {
      const p = (item.platform || '').toLowerCase();
      return p.includes('pinboard');
    });
  }, [allBookmarks]);

  const linkdingBookmarks = useMemo(() => {
    return allBookmarks.filter(item => {
      const p = (item.platform || '').toLowerCase();
      return p.includes('linkding');
    });
  }, [allBookmarks]);

  // Custom dynamically discovered platforms (if user imports other apps)
  const customApps = useMemo(() => {
    const set = new Set<string>();
    allBookmarks.forEach(b => {
      const p = (b.platform || '').trim();
      const pLower = p.toLowerCase();
      if (
        p &&
        !pLower.includes('raindrop') &&
        !pLower.includes('pinterest') &&
        !pLower.includes('browser') &&
        !pLower.includes('chrome') &&
        !pLower.includes('safari') &&
        !pLower.includes('firefox') &&
        !pLower.includes('edge') &&
        !pLower.includes('pocket') &&
        !pLower.includes('pinboard') &&
        !pLower.includes('linkding') &&
        !pLower.includes('bookmark')
      ) {
        set.add(p);
      }
    });
    return Array.from(set);
  }, [allBookmarks]);

  // App counts map
  const appCounts = useMemo(() => {
    const counts: Record<string, number> = {
      raindrop: raindropBookmarks.length,
      pinterest: pinterestBookmarks.length,
      browser: browserBookmarks.length,
      pocket: pocketBookmarks.length,
      pinboard: pinboardBookmarks.length,
      linkding: linkdingBookmarks.length
    };
    customApps.forEach(app => {
      counts[app.toLowerCase()] = allBookmarks.filter(
        b => (b.platform || '').toLowerCase() === app.toLowerCase()
      ).length;
    });
    return counts;
  }, [
    raindropBookmarks,
    pinterestBookmarks,
    browserBookmarks,
    pocketBookmarks,
    pinboardBookmarks,
    linkdingBookmarks,
    customApps,
    allBookmarks
  ]);

  // Connection states
  const raindropConfig = getRaindropConfig();
  const pinterestConfig = getPinterestConfig();

  // Sidebar navigation selection
  const [sidebarSelection, setSidebarSelection] = useState<BookmarksSidebarSelection>(() => {
    try {
      const saved = localStorage.getItem('mylife_bookmark_sidebar_sel');
      return saved ? JSON.parse(saved) : { type: 'view', id: 'all' };
    } catch {
      return { type: 'view', id: 'all' };
    }
  });

  // Paste Link Modal state
  const [isPasteLinkOpen, setIsPasteLinkOpen] = useState(false);

  // Extract collections/folders with item counts for the sidebar
  const folders = useMemo(() => {
    const map = new Map<string, number>();
    allBookmarks.forEach(b => {
      if (b.category && b.category !== 'Unsorted') {
        map.set(b.category, (map.get(b.category) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allBookmarks]);

  // Extract tags with item counts for the sidebar
  const tagsList = useMemo(() => {
    const map = new Map<string, number>();
    allBookmarks.forEach(b => {
      const tList = bookmarkTags[b.url || ''] || [];
      tList.forEach(t => {
        map.set(t, (map.get(t) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allBookmarks, bookmarkTags]);

  const handleSidebarSelect = (selection: BookmarksSidebarSelection) => {
    setSidebarSelection(selection);
    try {
      localStorage.setItem('mylife_bookmark_sidebar_sel', JSON.stringify(selection));
    } catch (e) {
      console.warn(e);
    }
    if (selection.type === 'view') {
      setActiveAppSubview(selection.id as any);
    } else {
      setActiveAppSubview('all');
    }
  };

  // Handle saving new bookmarks (from PasteLinkModal or inline input)
  const handleSaveNewBookmark = (item: TimelineItem, note?: string, tags?: string[]) => {
    if (onApplySyncedData) {
      onApplySyncedData(
        {
          items: [item],
          notes: note && item.url ? { [item.url]: note } : {},
          tags: tags && tags.length > 0 && item.url ? { [item.url]: tags } : {},
          snapshots: {},
          count: 1
        },
        'Pasted Link'
      );
    }
  };


  // Handle Copy URL
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Handle Export Netscape HTML
  const handleExportHtml = () => {
    const html = exportToNetscapeHtml(allBookmarks, bookmarkTags, bookmarkNotes);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_export_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open Edit in Inspector Sidepanel
  const openEditModal = (item: TimelineItem) => {
    setActiveItem(item);
    setIsRightPanelOpen(true);
  };

  return (
    <div
      id="bookmarks-view-container"
      className="flex-1 flex flex-col h-full bg-transparent overflow-hidden"
    >
      {/* Top Header with Compact Library Buttons (Connections, Imported, Folders, Tags) */}
      <BookmarksTopHeader
        totalCount={allBookmarks.length}
        activeFilter={sidebarSelection.type !== 'view' ? (sidebarSelection as BookmarksActiveFilter) : null}
        onSelectFilter={filter => {
          if (!filter) {
            handleSidebarSelect({ type: 'view', id: 'all' });
          } else {
            handleSidebarSelect(filter as any);
          }
        }}
        appCounts={appCounts}
        folders={folders}
        tags={tagsList}
        isRaindropConnected={Boolean(raindropConfig.apiToken)}
        isPinterestConnected={Boolean(pinterestConfig.apiToken)}
        onOpenPasteLink={() => setIsPasteLinkOpen(true)}
        onOpenSyncModal={onOpenSyncModal}
        onExportHtml={handleExportHtml}
      />

      {/* Main Content Area: Full Workspace View with Right Inspector Panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Center Subview Content Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-3.5 sm:p-5">
          <div className="w-full mx-auto">
            {/* 1. All Bookmarks Overview Subview with filtering, card count options & inline link paste */}
            {activeAppSubview === 'all' && (
              <AllBookmarksSubview
                bookmarks={allBookmarks}
                bookmarkNotes={bookmarkNotes}
                bookmarkTags={bookmarkTags}
                sessionSnapshots={sessionSnapshots}
                appCounts={appCounts}
                onSelectAppSubview={handleSelectSubview}
                onOpenSyncModal={onOpenSyncModal}
                onOpenEditModal={openEditModal}
                onCopyLink={handleCopyLink}
                copiedUrl={copiedUrl}
                onDeleteItem={onDeleteItem}
                activeItem={activeItem}
                onSelectItem={handleSelectItem}
                isRightPanelOpen={isRightPanelOpen}
                onToggleRightPanel={() => setIsRightPanelOpen(prev => !prev)}
                activeFilter={sidebarSelection.type !== 'view' ? (sidebarSelection as BookmarksActiveFilter) : null}
                onClearActiveFilter={() => handleSidebarSelect({ type: 'view', id: 'all' })}
                onSaveBookmark={handleSaveNewBookmark}
                onOpenPasteLink={() => setIsPasteLinkOpen(true)}
              />
            )}

            {/* 1.1 Kanban Moodboard Dedicated View (Uncropped, unstretched image decides board size) */}
            {activeAppSubview === 'kanban' && (
              <KanbanMoodboardView
                bookmarks={allBookmarks}
                bookmarkNotes={bookmarkNotes}
                bookmarkTags={bookmarkTags}
                sessionSnapshots={sessionSnapshots}
                onOpenEditModal={openEditModal}
                onCopyLink={handleCopyLink}
                copiedUrl={copiedUrl}
                onDeleteItem={onDeleteItem}
                onSelectItem={handleSelectItem}
                activeItem={activeItem}
                layoutMode="kanban"
                onChangeLayoutMode={m => {
                  if (m === 'kanban') handleSelectSubview('kanban');
                  else if (m === 'moodboard') handleSelectSubview('moodboard');
                  else handleSelectSubview('all');
                }}
                moodboardConfig={moodboardConfig}
                onChangeMoodboardConfig={handleSaveMoodboardConfig}
                onApplyToAll={() => handleSaveMoodboardConfig(moodboardConfig)}
              />
            )}

            {/* 1.2 Moodboard Masonry View (Uncropped, unstretched image decides card height) */}
            {activeAppSubview === 'moodboard' && (
              <MoodboardMasonryView
                bookmarks={allBookmarks}
                bookmarkNotes={bookmarkNotes}
                bookmarkTags={bookmarkTags}
                sessionSnapshots={sessionSnapshots}
                onOpenEditModal={openEditModal}
                onCopyLink={handleCopyLink}
                copiedUrl={copiedUrl}
                onDeleteItem={onDeleteItem}
                onSelectItem={handleSelectItem}
                activeItem={activeItem}
                layoutMode="moodboard"
                onChangeLayoutMode={m => {
                  if (m === 'kanban') handleSelectSubview('kanban');
                  else if (m === 'moodboard') handleSelectSubview('moodboard');
                  else handleSelectSubview('all');
                }}
                moodboardConfig={moodboardConfig}
                onChangeMoodboardConfig={handleSaveMoodboardConfig}
                onApplyToAll={() => handleSaveMoodboardConfig(moodboardConfig)}
              />
            )}

          {/* 2. Raindrop.io Dedicated Subview */}
          {activeAppSubview === 'raindrop' && (
            <RaindropSubview
              bookmarks={raindropBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={onOpenSyncModal}
              onOpenEditModal={openEditModal}
              onCopyLink={handleCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
            />
          )}

          {/* 3. Pinterest Dedicated Subview */}
          {activeAppSubview === 'pinterest' && (
            <PinterestSubview
              bookmarks={pinterestBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={onOpenSyncModal}
              onOpenEditModal={openEditModal}
              onCopyLink={handleCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
            />
          )}

          {/* 4. Browser Bookmarks Dedicated Subview */}
          {activeAppSubview === 'browser' && (
            <BrowserBookmarksSubview
              bookmarks={browserBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={onOpenSyncModal}
              onOpenEditModal={openEditModal}
              onCopyLink={handleCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
            />
          )}

          {/* 5. Pocket Dedicated Subview */}
          {activeAppSubview === 'pocket' && (
            <PocketSubview
              bookmarks={pocketBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={onOpenSyncModal}
              onOpenEditModal={openEditModal}
              onCopyLink={handleCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
            />
          )}

          {/* 6. Pinboard Dedicated Subview */}
          {activeAppSubview === 'pinboard' && (
            <PinboardSubview
              bookmarks={pinboardBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={onOpenSyncModal}
              onOpenEditModal={openEditModal}
              onCopyLink={handleCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
            />
          )}

          {/* 7. Linkding Dedicated Subview */}
          {activeAppSubview === 'linkding' && (
            <LinkdingSubview
              bookmarks={linkdingBookmarks}
              bookmarkNotes={bookmarkNotes}
              bookmarkTags={bookmarkTags}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={onOpenSyncModal}
              onOpenEditModal={openEditModal}
              onCopyLink={handleCopyLink}
              copiedUrl={copiedUrl}
              onDeleteItem={onDeleteItem}
            />
          )}

          {/* 8. Fallback for custom dynamically discovered apps */}
          {!['all', 'raindrop', 'pinterest', 'browser', 'pocket', 'pinboard', 'linkding'].includes(
            activeAppSubview
          ) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {activeAppSubview} Bookmarks
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenSyncModal()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                >
                  Import Bookmarks
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allBookmarks
                  .filter(
                    b =>
                      (b.platform || '').toLowerCase().replace(/[^a-z0-9]/g, '_') ===
                      activeAppSubview
                  )
                  .map(item => (
                    <BookmarkCard
                      key={item.id}
                      item={item}
                      notes={bookmarkNotes[item.url || '']}
                      tags={bookmarkTags[item.url || ''] || []}
                      snapshot={sessionSnapshots[item.url || '']}
                      layoutMode="grid"
                      onCopyLink={handleCopyLink}
                      onOpenEdit={openEditModal}
                      onDeleteItem={onDeleteItem}
                      copiedUrl={copiedUrl}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Right Inspector Details Panel as a Sidepanel */}
        {isRightPanelOpen && activeItem && (
          <BrowserInspectorPanel
            item={activeItem}
            allBrowserItems={allBookmarks}
            notes={bookmarkNotes[activeItem.url || ''] || ''}
            tags={bookmarkTags[activeItem.url || ''] || []}
            snapshot={sessionSnapshots[activeItem.url || ''] || activeItem.cover}
            onClose={() => {
              setIsRightPanelOpen(false);
              setActiveItem(null);
              onActiveServiceChange?.(activeAppSubview, undefined);
            }}
            onSaveNote={onSaveBookmarkNote}
            onAddTag={onAddBookmarkTag}
            onRemoveTag={onRemoveBookmarkTag}
            onDeleteItem={onDeleteItem}
          />
        )}
      </div>

      {/* Quick & Full Paste Link Modal */}
      <PasteLinkModal
        isOpen={isPasteLinkOpen}
        onClose={() => setIsPasteLinkOpen(false)}
        onSaveBookmark={handleSaveNewBookmark}
        existingCollections={folders.map(f => f.name)}
        existingTags={tagsList.map(t => t.name)}
        activeServiceOrPlatform={
          sidebarSelection.type === 'live_service'
            ? sidebarSelection.id
            : sidebarSelection.type === 'import'
            ? sidebarSelection.id
            : 'manual'
        }
      />
    </div>
  );
};

export default BookmarksView;
