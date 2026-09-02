import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  Lock,
  Tag,
  StickyNote,
  BarChart2,
  Copy,
  Check,
  ShieldCheck,
  Camera,
  Sparkles,
  Upload,
  Layers,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  SlidersHorizontal,
  FileCode,
  Info,
  ArrowUpDown,
  Filter,
  LayoutGrid,
  Layout,
  List,
  Table,
  X,
  ChevronDown
} from 'lucide-react';
import { TimelineItem, DateRange } from '../../types';
import { extractDomain, extractUrlMetadata } from '../../utils/urlMetadata';
import { formatTime } from '../../utils/dataParser';
import { ViewToolbar } from '../ViewToolbar';
import { BrowserMymindCard } from '../BrowserMymindCard';

export type BrowserSortOption = 'newest' | 'oldest' | 'most_visited' | 'domain_freq' | 'title_asc' | 'domain_asc';
export type BrowserLayoutMode = 'cards' | 'feed' | 'compact' | 'table';
export type BrowserFilterPreset = 'all' | 'with_notes' | 'with_tags' | 'with_snapshots' | 'secure_only';

interface BrowserViewOptions {
  layoutMode: BrowserLayoutMode;
  sortBy: BrowserSortOption;
  filterPreset: BrowserFilterPreset;
  showFavicon: boolean;
  showDomainBadge: boolean;
  showTimestamp: boolean;
  showSnapshotBadge: boolean;
}

interface BrowserViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onImportClick?: () => void;
  onJumpToDate: (date: Date) => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  processedData: TimelineItem[];
  dateIndexMap: Map<string, TimelineItem[]>;
  onShowDomainProfile: (domain: string) => void;
  selectedBrowserItem: TimelineItem | null;
  onSelectBrowserItem: (item: TimelineItem | null) => void;
  bookmarkNotes: Record<string, string>;
  onSaveBookmarkNote: (url: string, note: string) => void;
  bookmarkTags: Record<string, string[]>;
  onAddBookmarkTag: (url: string, tag: string) => void;
  onRemoveBookmarkTag: (url: string, tag: string) => void;
  sessionSnapshots?: Record<string, string>;
  onSaveSessionSnapshot?: (url: string, snapshot: string) => void;
  onLaunchAuthenticatedSession?: (url: string) => void | Promise<void>;
  onCaptureActiveScreen?: (url: string) => void | Promise<void>;
  onOpenDetailModal?: (item: TimelineItem) => void;
}

export const BrowserView: React.FC<BrowserViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  processedData,
  dateIndexMap,
  onShowDomainProfile,
  selectedBrowserItem,
  onSelectBrowserItem,
  bookmarkNotes,
  onSaveBookmarkNote,
  bookmarkTags,
  onAddBookmarkTag,
  onRemoveBookmarkTag,
  sessionSnapshots = {},
  onSaveSessionSnapshot = (_url: string, _snapshot: string) => {},
  onLaunchAuthenticatedSession = (_url: string) => {},
  onCaptureActiveScreen = (_url: string) => {}
}) => {
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [viewScope, setViewScope] = useState<'day' | 'all'>('all');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState<boolean>(false);

  // View Options state (feed by default)
  const [viewOptions, setViewOptions] = useState<BrowserViewOptions>({
    layoutMode: 'feed',
    sortBy: 'newest',
    filterPreset: 'all',
    showFavicon: true,
    showDomainBadge: true,
    showTimestamp: true,
    showSnapshotBadge: true
  });

  const updateViewOption = <K extends keyof BrowserViewOptions>(key: K, value: BrowserViewOptions[K]) => {
    setViewOptions(prev => ({ ...prev, [key]: value }));
  };

  const resetViewOptions = () => {
    setViewOptions({
      layoutMode: 'feed',
      sortBy: 'newest',
      filterPreset: 'all',
      showFavicon: true,
      showDomainBadge: true,
      showTimestamp: true,
      showSnapshotBadge: true
    });
  };
  
  // Lazy loading / smooth progressive rendering for full history
  const [visibleCount, setVisibleCount] = useState<number>(60);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Inspect Page preview states
  const [previewTab, setPreviewTab] = useState<'snapshot' | 'frame' | 'raw'>('snapshot');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyMdFeedback, setCopyMdFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<'extracting' | 'extracted' | 'failed' | 'insufficient'>('extracting');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dayKey = getDateKey(currentDate);
  const dayItems = useMemo(() => {
    if (dateRange) {
      return processedData.filter(s => {
        if (s.type !== 'browser') return false;
        const k = s.ts.slice(0, 10);
        return k >= dateRange.startDate && k <= dateRange.endDate;
      });
    }
    return (dateIndexMap.get(dayKey) || []).filter(s => s.type === 'browser');
  }, [dateRange, processedData, dateIndexMap, dayKey]);

  const allBrowserItems = processedData.filter(s => s.type === 'browser');

  const baseItems = viewScope === 'day' ? dayItems : allBrowserItems;
  const uniqueDomains = Array.from(
    new Set(allBrowserItems.map(b => b.domain || extractDomain(b.url || '')).filter(Boolean))
  ).sort();

  // Frequency lookups for sorting
  const urlFrequencyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allBrowserItems) {
      if (item.url) {
        map.set(item.url, (map.get(item.url) || 0) + 1);
      }
    }
    return map;
  }, [allBrowserItems]);

  const domainFrequencyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allBrowserItems) {
      const dom = item.domain || extractDomain(item.url || '');
      if (dom) {
        map.set(dom, (map.get(dom) || 0) + 1);
      }
    }
    return map;
  }, [allBrowserItems]);

  const filteredItems = useMemo(() => {
    return baseItems
      .filter(item => {
        const domain = item.domain || extractDomain(item.url || '');
        if (filterDomain !== 'all' && domain !== filterDomain) return false;

        // Filter Preset checks
        if (viewOptions.filterPreset === 'with_notes') {
          if (!item.url || !bookmarkNotes[item.url]?.trim()) return false;
        } else if (viewOptions.filterPreset === 'with_tags') {
          if (!item.url || !bookmarkTags[item.url]?.length) return false;
        } else if (viewOptions.filterPreset === 'with_snapshots') {
          if (!item.url || !sessionSnapshots[item.url]) return false;
        } else if (viewOptions.filterPreset === 'secure_only') {
          if (!item.url?.startsWith('https://')) return false;
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (item.title || '').toLowerCase().includes(q);
          const matchUrl = (item.url || '').toLowerCase().includes(q);
          const noteText = item.url ? (bookmarkNotes[item.url] || '').toLowerCase() : '';
          const tags = item.url ? (bookmarkTags[item.url] || []).join(' ').toLowerCase() : '';
          if (!matchTitle && !matchUrl && !noteText.includes(q) && !tags.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (viewOptions.sortBy === 'newest') {
          return new Date(b.ts).getTime() - new Date(a.ts).getTime();
        }
        if (viewOptions.sortBy === 'oldest') {
          return new Date(a.ts).getTime() - new Date(b.ts).getTime();
        }
        if (viewOptions.sortBy === 'most_visited') {
          const countA = urlFrequencyMap.get(a.url || '') || 1;
          const countB = urlFrequencyMap.get(b.url || '') || 1;
          return countB - countA;
        }
        if (viewOptions.sortBy === 'domain_freq') {
          const domA = a.domain || extractDomain(a.url || '');
          const domB = b.domain || extractDomain(b.url || '');
          const countA = domainFrequencyMap.get(domA) || 1;
          const countB = domainFrequencyMap.get(domB) || 1;
          return countB - countA;
        }
        if (viewOptions.sortBy === 'title_asc') {
          return (a.title || '').localeCompare(b.title || '');
        }
        if (viewOptions.sortBy === 'domain_asc') {
          const domA = a.domain || extractDomain(a.url || '');
          const domB = b.domain || extractDomain(b.url || '');
          return domA.localeCompare(domB);
        }
        return new Date(b.ts).getTime() - new Date(a.ts).getTime();
      });
  }, [
    baseItems,
    filterDomain,
    searchQuery,
    viewOptions.filterPreset,
    viewOptions.sortBy,
    bookmarkNotes,
    bookmarkTags,
    sessionSnapshots,
    urlFrequencyMap,
    domainFrequencyMap
  ]);

  // Reset visible count when filters or dataset change
  useEffect(() => {
    setVisibleCount(60);
    setIsLoadingMore(false);
  }, [baseItems, filterDomain, searchQuery, viewScope, viewOptions.filterPreset, viewOptions.sortBy, viewOptions.layoutMode]);

  // IntersectionObserver for ultra-smooth lazy infinite scroll
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          requestAnimationFrame(() => {
            setVisibleCount((prev) => Math.min(prev + 50, filteredItems.length));
            setTimeout(() => setIsLoadingMore(false), 200);
          });
        }
      },
      {
        root: scrollContainerRef.current || null,
        threshold: 0.01,
        rootMargin: '600px'
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredItems.length, scrollContainerRef.current]);

  // Lazily sliced items to keep DOM performant
  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const activeItem = selectedBrowserItem || (filteredItems.length > 0 ? filteredItems[0] : null);
  const activeUrl = activeItem?.url || '';
  const activeMeta = useMemo(() => (activeUrl ? extractUrlMetadata(activeUrl, activeItem?.title) : null), [activeUrl, activeItem?.title]);
  const activeDomain = activeItem?.domain || (activeUrl ? extractDomain(activeUrl) : '');
  const activeFavicon = activeItem?.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(activeDomain)}&sz=128`;
  const activeNote = activeUrl ? (bookmarkNotes[activeUrl] || '') : '';
  const activeTags = activeUrl ? (bookmarkTags[activeUrl] || []) : [];
  const activeCustomSnapshot = activeUrl ? (sessionSnapshots[activeUrl] || '') : '';

  // Reset extraction state when inspecting a new URL
  React.useEffect(() => {
    setExtractionStatus('extracting');
  }, [activeUrl]);

  // Stats across dataset
  const urlVisits = useMemo(() => allBrowserItems.filter(d => d.url === activeUrl).length || 1, [allBrowserItems, activeUrl]);
  const domainVisits = useMemo(() => allBrowserItems.filter(d => (d.domain || d.url?.includes(activeDomain))).length || 1, [allBrowserItems, activeDomain]);

  // URL parsed query parameters
  const parsedQueryParams = useMemo(() => {
    if (!activeUrl) return [];
    try {
      let clean = activeUrl.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      const u = new URL(clean);
      const params: { key: string; value: string }[] = [];
      u.searchParams.forEach((value, key) => {
        params.push({ key, value });
      });
      return params;
    } catch {
      return [];
    }
  }, [activeUrl]);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim() || !activeUrl) return;
    onAddBookmarkTag(activeUrl, tagInput.trim());
    setTagInput('');
    showToast(`Tag #${tagInput.trim()} added`);
  };

  const handleCopyUrl = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(activeUrl).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        showToast('Link copied to clipboard');
      });
    }
  };

  const handleCopyMarkdown = () => {
    const md = `[${activeItem?.title || activeUrl}](${activeUrl})`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(() => {
        setCopyMdFeedback(true);
        setTimeout(() => setCopyMdFeedback(false), 2000);
        showToast('Markdown link copied');
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onSaveSessionSnapshot(activeUrl, evt.target.result as string);
          showToast('Session snapshot attached!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden min-h-0 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 px-3.5 py-1.5 rounded-xl bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 text-xs font-semibold shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Top Reusable ViewToolbar with Most-Used Controls in Front */}
      <ViewToolbar
        title="Browsing Activity"
        icon={<Globe className="w-4 h-4 text-sky-500" />}
        badge={
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
            {filteredItems.length} visits {viewScope === 'day' ? '(Day)' : '(All Time)'}
          </span>
        }
        currentDate={currentDate}
        onPrevDate={onPrevDate}
        onNextDate={onNextDate}
        onSetToday={onSetToday}
        onOpenCalendar={onOpenCalendar}
        showDateNavigation={viewScope === 'day'}
        dateRange={viewScope === 'day' ? dateRange : null}
        onClearDateRange={onClearDateRange}
        onOpenDateRangePicker={onOpenDateRangePicker}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search URLs, titles, notes, tags..."
        searchResultsCount={searchQuery ? filteredItems.length : undefined}
        onImportClick={onImportClick}
        importLabel="Import"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scope Switcher: Day vs All */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
            <button
              onClick={() => setViewScope('day')}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                viewScope === 'day'
                  ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewScope('all')}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                viewScope === 'all'
                  ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              All
            </button>
          </div>

          {/* Unified View Mode Switcher (Cards, Feed, Compact, Table) */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
            <button
              onClick={() => updateViewOption('layoutMode', 'cards')}
              className={`px-2 py-1 font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                viewOptions.layoutMode === 'cards'
                  ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              title="mymind Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden xl:inline">Cards</span>
            </button>
            <button
              onClick={() => updateViewOption('layoutMode', 'feed')}
              className={`px-2 py-1 font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                viewOptions.layoutMode === 'feed'
                  ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              title="Feed List View"
            >
              <Layout className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Feed</span>
            </button>
            <button
              onClick={() => updateViewOption('layoutMode', 'compact')}
              className={`px-2 py-1 font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                viewOptions.layoutMode === 'compact'
                  ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              title="Compact Row View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Compact</span>
            </button>
            <button
              onClick={() => updateViewOption('layoutMode', 'table')}
              className={`px-2 py-1 font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                viewOptions.layoutMode === 'table'
                  ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              title="Table Log View"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Table</span>
            </button>
          </div>

          {/* Sort By Dropdown (In Front) */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <select
              value={viewOptions.sortBy}
              onChange={(e) => updateViewOption('sortBy', e.target.value as BrowserSortOption)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs pr-1"
              title="Sort Order"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_visited">Most Visited Page</option>
              <option value="domain_freq">Top Domains</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="domain_asc">Domain (A-Z)</option>
            </select>
          </div>

          {/* Domain Filter Dropdown (In Front) */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-[170px] truncate"
              title="Filter by Domain"
            >
              <option value="all">All Domains ({uniqueDomains.length})</option>
              {uniqueDomains.map(dom => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
            {filterDomain !== 'all' && (
              <button
                onClick={() => setFilterDomain('all')}
                className="text-sky-500 hover:text-sky-700 font-bold px-1 rounded-md hover:bg-sky-500/10 cursor-pointer"
                title="Clear domain filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Preset (In Front) */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <select
              value={viewOptions.filterPreset}
              onChange={(e) => updateViewOption('filterPreset', e.target.value as BrowserFilterPreset)}
              className="bg-transparent text-gray-700 dark:text-gray-300 font-semibold outline-none cursor-pointer text-xs"
              title="Filter Presets"
            >
              <option value="all">All Visits</option>
              <option value="with_notes">With Notes</option>
              <option value="with_tags">Tagged Items</option>
              <option value="with_snapshots">With Snapshots</option>
              <option value="secure_only">HTTPS Only</option>
            </select>
          </div>

          {/* Display Options Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsViewOptionsOpen(!isViewOptionsOpen)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isViewOptionsOpen
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
              title="Display Options (Favicons, Timestamps, Badges)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Display</span>
            </button>

            {/* Compact Floating Display Options Popover */}
            {isViewOptionsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3.5 space-y-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
                    <span>Display Customization</span>
                  </div>
                  <button
                    onClick={() => setIsViewOptionsOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Checkbox Toggles */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Visibility
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={viewOptions.showFavicon}
                        onChange={(e) => updateViewOption('showFavicon', e.target.checked)}
                        className="rounded text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Favicon Icons</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={viewOptions.showDomainBadge}
                        onChange={(e) => updateViewOption('showDomainBadge', e.target.checked)}
                        className="rounded text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Domain Badge</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={viewOptions.showTimestamp}
                        onChange={(e) => updateViewOption('showTimestamp', e.target.checked)}
                        className="rounded text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Timestamp</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={viewOptions.showSnapshotBadge}
                        onChange={(e) => updateViewOption('showSnapshotBadge', e.target.checked)}
                        className="rounded text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Snapshot Indicators</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <button
                    onClick={resetViewOptions}
                    className="text-[11px] text-gray-500 hover:text-sky-500 font-medium cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={() => setIsViewOptionsOpen(false)}
                    className="px-2.5 py-1 bg-sky-500 text-white rounded-lg text-xs font-semibold hover:bg-sky-600 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel Toggle Button */}
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isRightPanelOpen
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-800 hover:text-gray-800'
            }`}
            title={isRightPanelOpen ? 'Hide Inspect Panel' : 'Open Inspect Panel'}
          >
            <BarChart2 className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">{isRightPanelOpen ? 'Hide Panel' : 'Panel'}</span>
          </button>
        </div>
      </ViewToolbar>

      {/* Main Content: Split History List and Integrated Link Preview Inspect Page */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Visits List according to Layout Mode */}
        <div
          ref={scrollContainerRef}
          className={`overflow-y-auto min-h-0 transition-all border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 ${
            isRightPanelOpen
              ? viewOptions.layoutMode === 'cards'
                ? 'w-full lg:w-3/5 xl:w-7/12'
                : 'w-full lg:w-2/5 xl:w-1/3'
              : 'w-full'
          }`}
        >
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-xs text-gray-400 space-y-2">
              <Globe className="w-8 h-8 mx-auto opacity-30 text-gray-400" />
              <div>No browsing records match the current filters.</div>
            </div>
          ) : viewOptions.layoutMode === 'cards' ? (
            /* mymind-style Visual Card Grid */
            <div className="p-3 sm:p-4">
              <div
                className={`grid gap-3.5 ${
                  isRightPanelOpen
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5'
                }`}
              >
                {visibleItems.map(item => {
                  const isSelected = activeItem?.id === item.id;
                  const itemUrl = item.url || '';
                  const userNote = bookmarkNotes[itemUrl] || '';
                  const userTags = bookmarkTags[itemUrl] || [];
                  const customSnapshot = sessionSnapshots[itemUrl] || '';

                  return (
                    <BrowserMymindCard
                      key={item.id}
                      item={item}
                      isSelected={isSelected}
                      onSelect={(selected) => onSelectBrowserItem(selected)}
                      onShowDomainProfile={onShowDomainProfile}
                      onTagClick={(tag) => setSearchQuery(tag)}
                      userNote={userNote}
                      userTags={userTags}
                      customSnapshot={customSnapshot}
                      showTimestamp={viewOptions.showTimestamp}
                      showDomainBadge={viewOptions.showDomainBadge}
                      showFavicon={viewOptions.showFavicon}
                      showSnapshotBadge={viewOptions.showSnapshotBadge}
                    />
                  );
                })}
              </div>
            </div>
          ) : viewOptions.layoutMode === 'table' ? (
            /* Table Layout Mode */
            <div className="p-3">
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 font-semibold text-gray-500">
                      {viewOptions.showTimestamp && <th className="px-3 py-2">Time</th>}
                      {viewOptions.showDomainBadge && <th className="px-3 py-2">Domain</th>}
                      <th className="px-3 py-2">Page Title & URL</th>
                      <th className="px-3 py-2 text-right">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {visibleItems.map(item => {
                      const isSelected = activeItem?.id === item.id;
                      const domain = item.domain || extractDomain(item.url || '');
                      const favicon = item.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
                      const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
                      const dateStr = item.dateObj ? item.dateObj.toLocaleDateString() : '';

                      return (
                        <tr
                          key={item.id}
                          onClick={() => onSelectBrowserItem(item)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-sky-500/10 dark:bg-sky-500/20 font-medium text-sky-900 dark:text-sky-100'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-900/40 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {viewOptions.showTimestamp && (
                            <td className="px-3 py-2 text-[11px] font-mono text-gray-400 whitespace-nowrap">
                              {timeStr} {viewScope === 'all' && `(${dateStr})`}
                            </td>
                          )}
                          {viewOptions.showDomainBadge && (
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowDomainProfile(domain);
                                }}
                                className="font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                              >
                                {viewOptions.showFavicon && (
                                  <img
                                    src={favicon}
                                    className="w-3.5 h-3.5 rounded object-contain"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                )}
                                {domain}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-2 min-w-[200px] max-w-sm">
                            <div className="font-bold text-gray-900 dark:text-white truncate" title={item.title}>
                              {item.title}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono truncate">
                              {item.url}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 text-gray-400 hover:text-sky-500 inline-block transition-colors"
                                title="Open Link Directly"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewOptions.layoutMode === 'compact' ? (
            /* Compact Single-Row Layout Mode */
            <div className="p-2 space-y-1">
              {visibleItems.map(item => {
                const isSelected = activeItem?.id === item.id;
                const domain = item.domain || extractDomain(item.url || '');
                const favicon = item.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
                const timeStr = item.dateObj ? formatTime(item.dateObj) : '';

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectBrowserItem(item)}
                    className={`px-3 py-2 rounded-xl cursor-pointer transition-all border flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/40 shadow-xs'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {viewOptions.showFavicon && (
                        <img
                          src={favicon}
                          className="w-4 h-4 rounded shrink-0 bg-gray-100 dark:bg-gray-800 object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate hover:text-sky-500 transition-colors">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono truncate">
                          {viewOptions.showDomainBadge && (
                            <span className="text-sky-600 dark:text-sky-400 font-semibold">{domain}</span>
                          )}
                          {viewOptions.showTimestamp && <span>{timeStr}</span>}
                        </div>
                      </div>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-lg text-gray-400 hover:text-sky-500 transition-colors"
                        title="Open Link Directly"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Feed / Detailed Layout Mode */
            <div className="p-3 space-y-2 divide-y divide-gray-100 dark:divide-gray-800/40">
              {visibleItems.map(item => {
                const isSelected = activeItem?.id === item.id;
                const domain = item.domain || extractDomain(item.url || '');
                const favicon = item.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
                const timeStr = item.dateObj ? formatTime(item.dateObj) : '';
                const dateStr = item.dateObj ? item.dateObj.toLocaleDateString() : '';

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectBrowserItem(item)}
                    className={`pt-2 p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/40 shadow-xs'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {viewOptions.showDomainBadge && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowDomainProfile(domain);
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-1 hover:underline"
                          >
                            <Globe className="w-3 h-3" /> {domain}
                          </span>
                        )}
                        {viewOptions.showSnapshotBadge && sessionSnapshots[item.url || ''] && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Camera className="w-2.5 h-2.5" /> Captured
                          </span>
                        )}
                      </div>
                      {viewOptions.showTimestamp && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                          {viewScope === 'all' && <span>{dateStr}</span>}
                          <span>{timeStr}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2.5">
                      {viewOptions.showFavicon && (
                        <img
                          src={favicon}
                          className="w-4 h-4 rounded mt-0.5 shrink-0 bg-gray-100 dark:bg-gray-800 object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate hover:text-sky-500 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                          {item.url}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lazy loading sentinel & progress button */}
          {visibleCount < filteredItems.length && (
            <div ref={observerTarget} className="py-6 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount(prev => Math.min(prev + 50, filteredItems.length))}
                className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 bg-gray-100 dark:bg-gray-850 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-2xs"
              >
                <span className={`w-2 h-2 rounded-full bg-sky-500 ${isLoadingMore ? 'animate-ping' : 'animate-pulse'}`} />
                <span>
                  {isLoadingMore ? 'Loading more records...' : `Showing ${Math.min(visibleCount, filteredItems.length)} of ${filteredItems.length.toLocaleString()}`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: The Inspect Page (Integrated Link Preview & Deep Metadata Inspector) */}
        {isRightPanelOpen && activeItem && activeMeta ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-gray-50/50 dark:bg-[#0d0d0d]">
            {/* Inspect Page Top Bar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] space-y-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <img
                    src={activeFavicon}
                    className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 p-1.5 border border-gray-200 dark:border-gray-700 shrink-0 object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        onClick={() => onShowDomainProfile(activeDomain)}
                        className="text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-sky-500 hover:underline cursor-pointer"
                      >
                        {activeDomain}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                        <Globe className="w-3 h-3 text-sky-500" />
                        <span>{activeMeta.category || 'Web Link'}</span>
                      </span>
                      {activeCustomSnapshot ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>Captured Session</span>
                        </span>
                      ) : null}
                      {activeMeta.isSecure && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          <Lock className="w-2.5 h-2.5" /> HTTPS
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                      {activeItem.title}
                    </h3>
                  </div>
                </div>

                {/* Inspect Page Action Buttons (Most used in front) */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={handleCopyUrl}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#202020] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 cursor-pointer shadow-2xs"
                    title="Copy Link URL"
                  >
                    {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                    <span className="hidden sm:inline">{copyFeedback ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleCopyMarkdown}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#202020] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 cursor-pointer shadow-2xs"
                    title="Copy Markdown Link"
                  >
                    {copyMdFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileCode className="w-3.5 h-3.5 text-sky-500" />}
                    <span className="hidden sm:inline">{copyMdFeedback ? 'Copied MD' : 'MD'}</span>
                  </button>

                  <button
                    onClick={() => onShowDomainProfile(activeDomain)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#202020] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 cursor-pointer shadow-2xs"
                    title="Domain Statistics"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
                    <span className="hidden sm:inline">Stats</span>
                  </button>

                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-sky-500 hover:bg-sky-600 text-white py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>Open URL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Preview Modes Switcher */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800/80 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1c1c1c] p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setPreviewTab('snapshot')}
                    className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewTab === 'snapshot'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-sky-500" />
                    <span>Visual Preview</span>
                  </button>
                  <button
                    onClick={() => setPreviewTab('frame')}
                    className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewTab === 'frame'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Live Frame</span>
                  </button>
                  <button
                    onClick={() => setPreviewTab('raw')}
                    className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewTab === 'raw'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                    <span>URL Params</span>
                  </button>
                </div>

                {previewTab === 'frame' && (
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1c1c1c] p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setViewportMode('desktop')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewportMode === 'desktop' ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-xs' : 'text-gray-400'
                      }`}
                      title="Desktop View (100%)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewportMode('tablet')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewportMode === 'tablet' ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-xs' : 'text-gray-400'
                      }`}
                      title="Tablet View (768px)"
                    >
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewportMode('mobile')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewportMode === 'mobile' ? 'bg-white dark:bg-gray-800 text-sky-500 shadow-xs' : 'text-gray-400'
                      }`}
                      title="Mobile View (375px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIframeKey(k => k + 1)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      title="Reload Frame"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Inspect Page Main Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* 1. Integrated Link Preview Area */}
              {previewTab === 'snapshot' && (
                <div className="space-y-3">
                  <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-[#161616] to-[#0a0a0a] border border-gray-200 dark:border-gray-800 shadow-sm group flex flex-col transition-all">
                    {activeCustomSnapshot ? (
                      <div className="w-full relative flex flex-col items-center justify-center bg-[#0d0d0d] min-h-[220px]">
                        <img
                          src={activeCustomSnapshot}
                          className="w-full h-auto max-h-[65vh] object-contain object-top block"
                          alt={`${activeItem.title} snapshot`}
                        />
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
                          <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Captured Session Snapshot
                          </span>
                        </div>
                      </div>
                    ) : extractionStatus === 'failed' || extractionStatus === 'insufficient' ? (
                      /* Fallback to Authenticated Session when Extraction Fails or is Insufficient */
                      <div className="w-full min-h-[220px] p-6 text-left relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-neutral-900 to-black">
                        <div className="absolute -right-6 -bottom-6 font-black text-6xl text-white/5 select-none pointer-events-none uppercase tracking-tighter truncate max-w-full">
                          {activeDomain}
                        </div>
                        <div className="flex items-center justify-between z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center p-2">
                              <img
                                src={activeFavicon}
                                className="w-6 h-6 object-contain"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                                {activeDomain}
                                <Lock className="w-3 h-3 text-amber-400" />
                              </span>
                              <div className="text-[10px] text-amber-300/90 font-mono">
                                Auth Session Available
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="z-10 my-3 space-y-1">
                          <h4 className="text-sm font-bold text-white leading-snug">{activeItem.title}</h4>
                          <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
                            Launch an authenticated browser tab or capture screen grab to view page snapshot.
                          </p>
                        </div>

                        <div className="z-10 flex flex-wrap gap-2">
                          <button
                            onClick={() => onLaunchAuthenticatedSession(activeUrl)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Launch Auth Session
                          </button>
                          <button
                            onClick={() => onCaptureActiveScreen(activeUrl)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-amber-200 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Screen Grab
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Try Extraction First: Attempt standard web view render */
                      <div className="w-full relative flex flex-col items-center justify-center bg-[#0d0d0d] min-h-[220px]">
                        <img
                          src={activeMeta.snapshotUrl}
                          className="w-full h-auto max-h-[65vh] object-contain object-top block"
                          alt={`${activeItem.title} snapshot`}
                          loading="lazy"
                          onLoad={() => setExtractionStatus('extracted')}
                          onError={() => setExtractionStatus('failed')}
                        />
                        {extractionStatus === 'extracting' && (
                          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-xs flex items-center justify-center flex-col gap-2">
                            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-medium text-gray-300">Extracting page snapshot...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Snapshot Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/65 backdrop-blur-md text-white text-[11px] font-bold border border-white/10 shadow-sm pointer-events-auto">
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        <span>{activeMeta.category}</span>
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 pointer-events-none">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md text-gray-200 text-[10px] font-mono font-semibold border border-white/10 shadow-sm pointer-events-auto">
                        <span>~{activeMeta.readMinutes}m read</span>
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 z-10">
                      {activeMeta.palette.map(c => (
                        <span key={c} className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  {/* Clean Single Session Snapshot Toolbar */}
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-sky-500" />
                      <span>{activeCustomSnapshot ? 'Snapshot Attached' : 'Capture Snapshot'}</span>
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onLaunchAuthenticatedSession(activeUrl)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                        title="Launch authenticated tab"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Auth Tab</span>
                      </button>
                      <button
                        onClick={() => onCaptureActiveScreen(activeUrl)}
                        className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-500" />
                        <span>Screen Grab</span>
                      </button>
                      <label className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors">
                        <Upload className="w-3.5 h-3.5 text-sky-500" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {activeCustomSnapshot && (
                        <button
                          onClick={() => {
                            onSaveSessionSnapshot(activeUrl, '');
                            showToast('Custom snapshot removed');
                          }}
                          className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Interactive Sandboxed Iframe Preview */}
              {previewTab === 'frame' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Info className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Note: Sites with strict CSP may restrict embedded preview.</span>
                    </span>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sky-600 dark:text-sky-400 font-bold hover:underline flex items-center gap-1"
                    >
                      Open Directly <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="w-full flex justify-center bg-gray-200 dark:bg-[#111] p-3 rounded-2xl border border-gray-300 dark:border-gray-800 overflow-x-auto">
                    <div
                      className="bg-white rounded-xl overflow-hidden shadow-md transition-all border border-gray-200 dark:border-gray-700"
                      style={{
                        width: viewportMode === 'mobile' ? '375px' : viewportMode === 'tablet' ? '768px' : '100%',
                        height: '520px'
                      }}
                    >
                      <iframe
                        key={iframeKey}
                        src={activeUrl}
                        title={activeItem.title}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. URL Parameters & Breakdown */}
              {previewTab === 'raw' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Address</span>
                    <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-900 font-mono text-xs text-gray-700 dark:text-gray-300 break-all select-all">
                      {activeUrl}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Query Parameters ({parsedQueryParams.length})
                    </span>
                    {parsedQueryParams.length === 0 ? (
                      <div className="text-xs text-gray-400 py-3">No query string parameters detected on this URL.</div>
                    ) : (
                      <div className="space-y-1.5 divide-y divide-gray-100 dark:divide-gray-800">
                        {parsedQueryParams.map(({ key, value }, i) => (
                          <div key={i} className="pt-1.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 font-mono">
                            <span className="font-bold text-sky-600 dark:text-sky-400">{key}:</span>
                            <span className="text-gray-600 dark:text-gray-400 break-all select-all">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. AI Content Overview / Smart Synopsis */}
              <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 text-xs leading-relaxed space-y-1.5">
                <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  <span>AI Content Overview</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {activeMeta.smartSynopsis}
                </p>
              </div>

              {/* 5. Security & Page Profile Matrix */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Security & Page Profile</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800">
                    <div className="text-[10px] text-gray-400">Category</div>
                    <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 capitalize">
                      {activeMeta.category || 'General Web'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800">
                    <div className="text-[10px] text-gray-400">Security</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 capitalize flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {activeMeta.isSecure ? 'HTTPS Encrypted' : 'HTTP Plain'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800">
                    <div className="text-[10px] text-gray-400">Page Visits</div>
                    <div className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                      {urlVisits} visit{urlVisits !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800">
                    <div className="text-[10px] text-gray-400">Domain Footprint</div>
                    <div className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                      {domainVisits} visits total
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Smart Tags & Bookmark Tags */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-500" /> Bookmark Tags & Topics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {/* Smart topic tags */}
                  {activeMeta.smartTags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                  {/* Custom user tags */}
                  {activeTags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => {
                          onRemoveBookmarkTag(activeUrl, tag);
                          showToast(`Tag #${tag} removed`);
                        }}
                        className="hover:text-red-500 ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddTag} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Add a custom bookmark tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 cursor-pointer shadow-2xs"
                  >
                    Add Tag
                  </button>
                </form>
              </div>

              {/* 7. Notes & Annotations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <StickyNote className="w-3 h-3 text-amber-500" /> Annotations & Web Notes
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Auto-saved to database</span>
                </div>
                <textarea
                  value={activeNote}
                  onChange={(e) => onSaveBookmarkNote(activeUrl, e.target.value)}
                  placeholder="Add your notes, takeaways, code snippets, or research reflections on this page..."
                  className="w-full h-28 p-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          </div>
        ) : isRightPanelOpen ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-gray-400 space-y-2">
            <Globe className="w-10 h-10 opacity-30 text-gray-400" />
            <div>Select a browsing history item to open the live Inspect Page.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
