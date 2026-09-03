import React, { useState, useMemo } from 'react';
import {
  Columns3,
  Search,
  Tag,
  SlidersHorizontal,
  Folder,
  Layers,
  Sparkles,
  ExternalLink,
  Plus
} from 'lucide-react';
import { TimelineItem } from '../../../types';
import { MoodboardCard } from './MoodboardCard';
import {
  RaindropViewMenu,
  RaindropLayoutMode,
  MoodboardDisplayConfig,
  DEFAULT_MOODBOARD_CONFIG
} from './RaindropViewMenu';
import { RaindropSearchDropdown } from './RaindropSearchDropdown';

interface MoodboardMasonryViewProps {
  bookmarks: TimelineItem[];
  bookmarkNotes: Record<string, string>;
  bookmarkTags: Record<string, string[]>;
  sessionSnapshots?: Record<string, string>;
  onOpenEditModal: (item: TimelineItem) => void;
  onCopyLink: (url: string) => void;
  copiedUrl: string | null;
  onDeleteItem?: (id: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectItem?: (item: TimelineItem) => void;
  activeItem?: TimelineItem | null;
  layoutMode: RaindropLayoutMode;
  onChangeLayoutMode: (mode: RaindropLayoutMode) => void;
  moodboardConfig: MoodboardDisplayConfig;
  onChangeMoodboardConfig: (config: MoodboardDisplayConfig) => void;
  onApplyToAll?: () => void;
}

export const MoodboardMasonryView: React.FC<MoodboardMasonryViewProps> = ({
  bookmarks,
  bookmarkNotes,
  bookmarkTags,
  sessionSnapshots = {},
  onOpenEditModal,
  onCopyLink,
  copiedUrl,
  onDeleteItem,
  onSelectTag,
  onSelectItem,
  activeItem,
  layoutMode,
  onChangeLayoutMode,
  moodboardConfig,
  onChangeMoodboardConfig,
  onApplyToAll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [columnWidth, setColumnWidth] = useState<'compact' | 'standard' | 'wide' | 'fluid'>('standard');

  // Extract unique folders
  const folders = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      if (b.category && b.category !== 'Unsorted') {
        set.add(b.category);
      }
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  // Extract tags
  const tags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => {
      const tList = (b.url && bookmarkTags[b.url]) || [];
      tList.forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [bookmarks, bookmarkTags]);

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    if (selectedFolder !== 'all') {
      result = result.filter(b => b.category === selectedFolder);
    }

    if (selectedTag !== 'all') {
      result = result.filter(b => {
        const tList = (b.url && bookmarkTags[b.url]) || [];
        return tList.includes(selectedTag);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (q.startsWith('type:image')) {
        result = result.filter(b => b.cover || b.image_url);
      } else if (q.startsWith('note:true')) {
        result = result.filter(b => (b.url && bookmarkNotes[b.url]?.trim()) || b.description);
      } else if (q.startsWith('notag:true')) {
        result = result.filter(b => !(b.url && bookmarkTags[b.url]?.length));
      } else if (q.startsWith('#')) {
        const tagTerm = q.replace(/^#/, '');
        result = result.filter(b => {
          const tList = (b.url && bookmarkTags[b.url]) || [];
          return tList.some(t => t.toLowerCase().includes(tagTerm));
        });
      } else {
        result = result.filter(b => {
          const matchTitle = (b.title || '').toLowerCase().includes(q);
          const matchNote = (b.url && (bookmarkNotes[b.url] || '').toLowerCase().includes(q));
          const matchDomain = (b.domain || '').toLowerCase().includes(q);
          const matchTag = (b.url && (bookmarkTags[b.url] || []).some(t => t.toLowerCase().includes(q)));
          return matchTitle || matchNote || matchDomain || matchTag;
        });
      }
    }

    return result;
  }, [bookmarks, selectedFolder, selectedTag, searchQuery, bookmarkNotes, bookmarkTags]);

  // Multi-column masonry style based on column width
  const getMasonryColumnClass = () => {
    switch (columnWidth) {
      case 'compact':
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4';
      case 'wide':
        return 'columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-5';
      case 'fluid':
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4';
      case 'standard':
      default:
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4';
    }
  };

  return (
    <div id="moodboard-masonry-view" className="space-y-5">
      {/* Top Header Controls Bar */}
      <div className="bg-white dark:bg-[#18181b] p-3.5 rounded-2xl border border-gray-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0089FF]/10 text-[#0089FF] rounded-xl border border-[#0089FF]/30 font-bold text-xs">
            <Columns3 className="w-3.5 h-3.5" />
            <span>Moodboard View</span>
          </div>

          {/* Folder filter */}
          {folders.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Folder:</span>
              <select
                value={selectedFolder}
                onChange={e => setSelectedFolder(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-hidden"
              >
                <option value="all">All Folders ({bookmarks.length})</option>
                {folders.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tag filter */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Tag:</span>
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-hidden"
              >
                <option value="all">All Tags</option>
                {tags.map(t => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Uncropped reminder */}
          <span className="text-[11px] text-gray-400 hidden lg:inline">
            Images rendered uncropped & unstretched
          </span>
        </div>

        {/* Right Actions: Raindrop Search + Raindrop View Menu */}
        <div className="flex items-center gap-2 flex-wrap">
          <RaindropSearchDropdown
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            bookmarks={bookmarks}
            bookmarkNotes={bookmarkNotes}
            bookmarkTags={bookmarkTags}
            className="w-full sm:w-60"
          />

          <RaindropViewMenu
            layoutMode={layoutMode}
            onChangeLayoutMode={onChangeLayoutMode}
            moodboardConfig={moodboardConfig}
            onChangeMoodboardConfig={onChangeMoodboardConfig}
            onApplyToAll={onApplyToAll}
            columnWidth={columnWidth}
            onChangeColumnWidth={setColumnWidth}
          />
        </div>
      </div>

      {/* Masonry Grid: Images decide card size naturally without cropping */}
      {filteredBookmarks.length > 0 ? (
        <div className={getMasonryColumnClass()}>
          {filteredBookmarks.map(item => (
            <div key={item.id} className="mb-4 break-inside-avoid">
              <MoodboardCard
                item={item}
                notes={bookmarkNotes[item.url || '']}
                tags={bookmarkTags[item.url || ''] || []}
                snapshot={sessionSnapshots[item.url || '']}
                config={moodboardConfig}
                isSelected={activeItem?.id === item.id}
                onSelect={onSelectItem}
                onCopyLink={onCopyLink}
                onOpenEdit={onOpenEditModal}
                onSelectTag={onSelectTag}
                onDeleteItem={onDeleteItem}
                isDraggable={false}
                copiedUrl={copiedUrl}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl border border-dashed border-gray-300 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] space-y-2">
          <Columns3 className="w-8 h-8 mx-auto text-gray-400" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            No moodboard bookmarks match your search
          </h3>
          <p className="text-xs text-gray-500">
            Try resetting your tag or search filter, or add new bookmarks with images.
          </p>
        </div>
      )}
    </div>
  );
};
