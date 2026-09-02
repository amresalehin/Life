import React, { useState, useMemo } from 'react';
import { StickyNote, Search, Calendar, Clock, Bookmark } from 'lucide-react';
import { DateRange } from '../../types';
import { ViewToolbar } from '../ViewToolbar';

interface NotesViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onImportClick?: () => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  dailyNotesMap: Record<string, string>;
  onSaveDailyNote: (dateKey: string, text: string) => void;
  onJumpToDate: (date: Date) => void;
  bookmarkNotes: Record<string, string>;
}

export const NotesView: React.FC<NotesViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  dailyNotesMap,
  onSaveDailyNote,
  onJumpToDate,
  bookmarkNotes
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'daily' | 'bookmarks'>('daily');

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const currentKey = getDateKey(currentDate);
  const currentDailyNote = dailyNotesMap[currentKey] || '';

  // All daily notes sorted by date desc, filtered by dateRange if present
  const allDailyNotes = useMemo(() => {
    return (Object.entries(dailyNotesMap) as [string, string][])
      .filter(([dateKey, text]) => {
        if (!text || !text.trim()) return false;
        if (dateRange) {
          return dateKey >= dateRange.startDate && dateKey <= dateRange.endDate;
        }
        return true;
      })
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [dailyNotesMap, dateRange]);

  const allBookmarkNotes = (Object.entries(bookmarkNotes) as [string, string][])
    .filter(([_, text]) => (text || '').trim().length > 0);

  const q = searchQuery.toLowerCase().trim();

  const filteredDailyNotes = allDailyNotes.filter(([dateKey, text]) => {
    if (!q) return true;
    return dateKey.toLowerCase().includes(q) || (text || '').toLowerCase().includes(q);
  });

  const filteredBookmarkNotes = allBookmarkNotes.filter(([url, text]) => {
    if (!q) return true;
    return url.toLowerCase().includes(q) || (text || '').toLowerCase().includes(q);
  });

  const totalFilteredCount = activeTab === 'daily' ? filteredDailyNotes.length : filteredBookmarkNotes.length;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden min-h-0">
      {/* Top Reusable ViewToolbar */}
      <ViewToolbar
        title="Notes & Diary"
        icon={<StickyNote className="w-4 h-4 text-amber-500" />}
        badge={
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {allDailyNotes.length} diaries • {allBookmarkNotes.length} bookmarks
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
        searchPlaceholder="Search notes & bookmarks..."
        searchResultsCount={q ? totalFilteredCount : undefined}
        onImportClick={onImportClick}
        importLabel="Import Notes"
      >
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                : 'text-gray-400'
            }`}
          >
            Daily Diary ({allDailyNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'bg-white dark:bg-gray-800 shadow-xs text-gray-900 dark:text-white'
                : 'text-gray-400'
            }`}
          >
            Bookmark Notes ({allBookmarkNotes.length})
          </button>
        </div>
      </ViewToolbar>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Active Note Editor */}
        <div className="flex-1 p-4 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
              Auto-Saving
            </span>
          </div>
          <textarea
            value={currentDailyNote}
            onChange={e => onSaveDailyNote(currentKey, e.target.value)}
            placeholder="Write your personal diary, daily thoughts, achievements, or reflections for this date..."
            className="flex-1 w-full bg-gray-50/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-black resize-none transition-all leading-relaxed placeholder:text-gray-400"
          />
        </div>

        {/* Right Side: Saved Notes Archive */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col min-h-0 bg-gray-50/40 dark:bg-[#0a0a0a]">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] flex items-center justify-between shrink-0 text-xs font-bold text-gray-700 dark:text-gray-300">
            <span>
              {activeTab === 'daily' ? 'All Daily Logs' : 'All Bookmarks'} ({totalFilteredCount})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {activeTab === 'daily' ? (
              filteredDailyNotes.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  {q ? `No diary notes match "${searchQuery}".` : 'No diary notes found.'}
                </div>
              ) : (
                filteredDailyNotes.map(([dateKey, text]) => {
                  const isCurrent = dateKey === currentKey;
                  return (
                    <div
                      key={dateKey}
                      onClick={() => onJumpToDate(new Date(dateKey + 'T00:00:00'))}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/30 shadow-2xs'
                          : 'bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {dateKey}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-bold">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
                        {text}
                      </p>
                    </div>
                  );
                })
              )
            ) : filteredBookmarkNotes.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                {q ? `No bookmarks match "${searchQuery}".` : 'No bookmark notes found.'}
              </div>
            ) : (
              filteredBookmarkNotes.map(([url, text]) => (
                <div
                  key={url}
                  className="p-3 rounded-xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 hover:border-amber-500/30 transition-all space-y-1.5"
                >
                  <div className="text-[10px] font-mono text-gray-400 truncate" title={url}>
                    {url}
                  </div>
                  <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed">
                    {text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
