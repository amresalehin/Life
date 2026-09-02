import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Map as MapIcon,
  Sparkles,
  ArrowUp,
  Calendar as CalendarIcon,
  Loader2,
  Layers,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { CalendarEvent, TimelineItem, DateRange } from '../../types';
import { TimelineCard } from '../TimelineCard';
import { LeafletMap } from '../LeafletMap';
import { ViewToolbar } from '../ViewToolbar';
import { JournalDayCard } from '../JournalDayCard';

interface JournalViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onImportClick?: () => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  items?: TimelineItem[];
  events?: CalendarEvent[];
  dailyNote?: string;
  onSaveDailyNote?: (text: string) => void;
  onOpenAddEvent?: () => void;
  onDeleteEvent: (id: string | number) => void;
  onSelectBrowser?: (item: TimelineItem) => void;
  onShowTrackProfile?: (track: string, artist?: string) => void;
  onShowArtistProfile?: (artist: string) => void;
  onShowVideoProfile?: (title: string, channel?: string) => void;
  onShowChannelProfile?: (channel: string) => void;
  onShowDomainProfile?: (domain: string) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
  // Multi-day & Infinite Stream Props
  allTimelineData?: TimelineItem[];
  allEvents?: CalendarEvent[];
  dailyNotesMap?: Record<string, string>;
  onSaveSpecificDailyNote?: (dateKey: string, text: string) => void;
  onAddEventForDate?: (dateKey: string) => void;
  onJumpToDate?: (d: Date) => void;
}

const INITIAL_DAYS_BATCH = 7;
const DAYS_BATCH_STEP = 7;

export const JournalView: React.FC<JournalViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  items = [],
  events = [],
  dailyNote = '',
  onSaveDailyNote,
  onOpenAddEvent,
  onDeleteEvent,
  onSelectBrowser,
  onShowTrackProfile,
  onShowArtistProfile,
  onShowVideoProfile,
  onShowChannelProfile,
  onShowDomainProfile,
  onOpenMapModal,
  onResolveGeo,
  allTimelineData,
  allEvents,
  dailyNotesMap = {},
  onSaveSpecificDailyNote,
  onAddEventForDate,
  onJumpToDate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleDaysCount, setVisibleDaysCount] = useState(INITIAL_DAYS_BATCH);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Today key
  const todayKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Selected date key
  const selectedDateKey = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  // Comprehensive source of timeline items and calendar events
  const fullTimelineData = allTimelineData || items;
  const fullEvents = allEvents || events;

  // Index items by YYYY-MM-DD
  const dateMap = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    fullTimelineData.forEach(item => {
      const d = item.dateObj;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });
    return map;
  }, [fullTimelineData]);

  // Index events by date
  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    fullEvents.forEach(ev => {
      if (!ev.date) return;
      if (!map.has(ev.date)) {
        map.set(ev.date, []);
      }
      map.get(ev.date)!.push(ev);
    });
    return map;
  }, [fullEvents]);

  // Collect all unique dates with activity, notes, or events
  const sortedDateKeys = useMemo(() => {
    const keySet = new Set<string>();

    // Add keys from timeline data
    for (const k of dateMap.keys()) {
      keySet.add(k);
    }
    // Add keys from events
    for (const k of eventsMap.keys()) {
      keySet.add(k);
    }
    // Add keys from daily notes
    for (const k of Object.keys(dailyNotesMap)) {
      if (dailyNotesMap[k] && dailyNotesMap[k].trim()) {
        keySet.add(k);
      }
    }

    // Always ensure today and selected date are included in the journal
    keySet.add(todayKey);
    keySet.add(selectedDateKey);

    // If date range is specified, filter dates strictly within range
    if (dateRange) {
      return Array.from(keySet)
        .filter(k => k >= dateRange.startDate && k <= dateRange.endDate)
        .sort((a, b) => b.localeCompare(a));
    }

    // Sort in reverse chronological order (newest first)
    return Array.from(keySet).sort((a, b) => b.localeCompare(a));
  }, [dateMap, eventsMap, dailyNotesMap, todayKey, selectedDateKey, dateRange]);

  // In-page search query filter
  const q = searchQuery.trim().toLowerCase();

  const filteredDateKeys = useMemo(() => {
    if (!q) return sortedDateKeys;

    return sortedDateKeys.filter(dateKey => {
      // Check if note matches
      const note = dailyNotesMap[dateKey] || '';
      if (note.toLowerCase().includes(q)) return true;

      // Check if any event matches
      const dayEvents = eventsMap.get(dateKey) || [];
      if (
        dayEvents.some(
          ev =>
            (ev.title || '').toLowerCase().includes(q) ||
            (ev.description || '').toLowerCase().includes(q)
        )
      ) {
        return true;
      }

      // Check if any timeline item matches
      const dayItems = dateMap.get(dateKey) || [];
      if (
        dayItems.some(
          item =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.subtitle || '').toLowerCase().includes(q) ||
            (item.url || '').toLowerCase().includes(q) ||
            (item.album || '').toLowerCase().includes(q)
        )
      ) {
        return true;
      }

      return false;
    });
  }, [sortedDateKeys, q, dailyNotesMap, eventsMap, dateMap]);

  // Total matching records count
  const totalStats = useMemo(() => {
    let count = 0;
    filteredDateKeys.forEach(k => {
      count += (dateMap.get(k) || []).length + (eventsMap.get(k) || []).length;
    });
    return count;
  }, [filteredDateKeys, dateMap, eventsMap]);

  // Visible subset of dates for lazy loading
  const visibleDateKeys = useMemo(() => {
    return filteredDateKeys.slice(0, visibleDaysCount);
  }, [filteredDateKeys, visibleDaysCount]);

  const hasMoreDays = visibleDaysCount < filteredDateKeys.length;

  // Infinite Scroll Sentinel with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0];
        if (first.isIntersecting && hasMoreDays && !isLoadingMore) {
          setIsLoadingMore(true);
          // Smooth progressive lazy load next batch of days
          setTimeout(() => {
            setVisibleDaysCount(prev => prev + DAYS_BATCH_STEP);
            setIsLoadingMore(false);
          }, 150);
        }
      },
      { root: containerRef.current, rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreDays, isLoadingMore]);

  // Handle scroll position to toggle smooth scroll-to-top button
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop > 400) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  }, []);

  // Smooth scroll to target date
  const smoothScrollToDate = useCallback((dateKey: string) => {
    // If the target date is outside currently loaded visible range, expand visible count first
    const targetIdx = filteredDateKeys.indexOf(dateKey);
    if (targetIdx >= 0 && targetIdx >= visibleDaysCount) {
      setVisibleDaysCount(targetIdx + 5);
    }

    setTimeout(() => {
      const el = document.getElementById(`journal-day-${dateKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [filteredDateKeys, visibleDaysCount]);

  // If currentDate prop changes externally (e.g. from Toolbar date picker), smoothly scroll to that day
  useEffect(() => {
    if (selectedDateKey) {
      smoothScrollToDate(selectedDateKey);
    }
  }, [selectedDateKey, smoothScrollToDate]);

  const handleScrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveNote = (dateKey: string, text: string) => {
    if (onSaveSpecificDailyNote) {
      onSaveSpecificDailyNote(dateKey, text);
    } else if (onSaveDailyNote && dateKey === selectedDateKey) {
      onSaveDailyNote(text);
    }
  };

  const handleAddEventForSpecificDate = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    if (y && m && d && onJumpToDate) {
      onJumpToDate(new Date(y, m - 1, d));
    }
    if (onAddEventForDate) {
      onAddEventForDate(dateKey);
    } else if (onOpenAddEvent) {
      onOpenAddEvent();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto scroll-smooth bg-gray-50/50 dark:bg-black flex flex-col min-h-0 relative"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* View Toolbar with Global Date Navigator, Search, Importer & Add Event */}
      <ViewToolbar
        title="Journal & Timeline"
        icon={<BookOpen className="w-4 h-4 text-emerald-500" />}
        badge={
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {filteredDateKeys.length} days • {totalStats} entries
          </span>
        }
        currentDate={currentDate}
        onPrevDate={onPrevDate}
        onNextDate={onNextDate}
        onSetToday={onSetToday}
        onOpenCalendar={onOpenCalendar}
        dateRange={dateRange}
        onClearDateRange={onClearDateRange}
        onOpenDateRangePicker={onOpenDateRangePicker}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search entries, logs, songs, reflections..."
        searchResultsCount={q ? totalStats : undefined}
        onImportClick={onImportClick}
        importLabel="Import Data"
      >
        <button
          onClick={onOpenAddEvent}
          className="bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer active:scale-95"
          title="Add a custom event or milestone"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Event</span>
        </button>
      </ViewToolbar>

      {/* Main Continuous Infinite Journal Feed */}
      <div className="max-w-4xl w-full mx-auto p-3 sm:p-5 flex-1">
        {visibleDateKeys.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {q ? 'No matching journal entries found' : 'No journal activity yet'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              {q
                ? `No entries or reflections matched "${searchQuery}". Try a different keyword.`
                : 'Import your Google Takeout or Spotify data, or write your first daily reflection to begin your life journal.'}
            </p>
            {onImportClick && !q && (
              <button
                onClick={onImportClick}
                className="mt-4 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Import Takeout Data
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {visibleDateKeys.map(dateKey => {
              const [y, m, d] = dateKey.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const isToday = dateKey === todayKey;
              const isCurrentSelected = dateKey === selectedDateKey;
              const dayItems = dateMap.get(dateKey) || [];
              const dayEvents = eventsMap.get(dateKey) || [];
              const dayNote = dailyNotesMap[dateKey] || (dateKey === selectedDateKey ? dailyNote : '');

              return (
                <JournalDayCard
                  key={dateKey}
                  dateKey={dateKey}
                  dateObj={dateObj}
                  isToday={isToday}
                  isCurrentSelected={isCurrentSelected}
                  items={dayItems}
                  events={dayEvents}
                  dailyNote={dayNote}
                  onSaveDailyNote={text => handleSaveNote(dateKey, text)}
                  onOpenAddEventForDate={handleAddEventForSpecificDate}
                  onDeleteEvent={onDeleteEvent}
                  onSelectBrowser={onSelectBrowser}
                  onShowTrackProfile={onShowTrackProfile}
                  onShowArtistProfile={onShowArtistProfile}
                  onShowVideoProfile={onShowVideoProfile}
                  onShowChannelProfile={onShowChannelProfile}
                  onShowDomainProfile={onShowDomainProfile}
                  onOpenMapModal={onOpenMapModal}
                  onResolveGeo={onResolveGeo}
                />
              );
            })}

            {/* Infinite Sentinel for lazy loading */}
            <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center">
              {hasMoreDays ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Loading past journal days...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono py-4">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Reached the beginning of journal history ({filteredDateKeys.length} days total)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Smooth Scroll to Top / Jump to Today Controls */}
      {showScrollTop && (
        <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2">
          <button
            onClick={() => {
              if (onSetToday) onSetToday();
              smoothScrollToDate(todayKey);
            }}
            className="px-3.5 py-2 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Jump to Today"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>
          <button
            onClick={handleScrollToTop}
            className="p-2.5 rounded-full bg-gray-900/90 hover:bg-black dark:bg-white/90 dark:hover:bg-white text-white dark:text-gray-900 shadow-lg transition-all flex items-center justify-center cursor-pointer active:scale-95"
            title="Scroll to Top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
