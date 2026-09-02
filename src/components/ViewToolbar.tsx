import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarRange,
  Search,
  X,
  Upload,
  RotateCcw
} from 'lucide-react';
import { DateRange } from '../types';

export interface ViewToolbarProps {
  // Page Title & Identity
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;

  // Calendar & Date Navigation
  currentDate?: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  showDateNavigation?: boolean;

  // Date Range Support
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;

  // In-Page Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  searchResultsCount?: number;
  showSearch?: boolean;

  // Importer
  onImportClick?: () => void;
  showImport?: boolean;
  importLabel?: string;

  // Extra Actions / Custom Filter Controls Slot
  children?: React.ReactNode;
  className?: string;
}

export const ViewToolbar: React.FC<ViewToolbarProps> = ({
  title,
  icon,
  subtitle,
  badge,
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  showDateNavigation = true,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search in page...',
  searchResultsCount,
  showSearch = true,
  onImportClick,
  showImport = true,
  importLabel = 'Import',
  children,
  className = ''
}) => {
  const formattedDate = currentDate && !isNaN(currentDate.getTime())
    ? currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  // Range formatted text
  const formatRangeText = () => {
    if (!dateRange) return '';
    const { startDate, endDate } = dateRange;
    if (startDate === endDate) return startDate;
    return `${startDate} → ${endDate}`;
  };

  const calculateRangeDays = () => {
    if (!dateRange) return 0;
    const s = new Date(dateRange.startDate + 'T00:00:00').getTime();
    const e = new Date(dateRange.endDate + 'T00:00:00').getTime();
    if (isNaN(s) || isNaN(e)) return 1;
    return Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div
      className={`py-2.5 px-3.5 sm:px-4 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md sticky top-0 z-20 flex flex-col gap-2.5 shrink-0 ${className}`}
    >
      {/* Top Main Row: Title, Date Navigator / Range, Search, Importer, & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: View Identity & Stats */}
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 shrink-0 text-gray-700 dark:text-gray-200">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center / Right Controls Container */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* 1. Date & Calendar Range Navigator */}
          {showDateNavigation && (
            <>
              {dateRange ? (
                /* ACTIVE DATE RANGE PILL */
                <div className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 px-1">
                    <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap tracking-tight font-mono">
                      {formatRangeText()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-bold">
                      {calculateRangeDays()}d
                    </span>
                  </div>

                  {onOpenDateRangePicker && (
                    <button
                      onClick={onOpenDateRangePicker}
                      className="px-2 py-0.5 sm:py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      title="Modify date range"
                    >
                      Edit Range
                    </button>
                  )}

                  {onClearDateRange && (
                    <button
                      onClick={onClearDateRange}
                      className="p-1 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                      title="Reset to Single Day"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                /* SINGLE DAY CONTROLS WITH QUICK RANGE BUTTON */
                currentDate && onPrevDate && onNextDate && (
                  <div className="flex items-center gap-1 bg-gray-100/90 dark:bg-white/5 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs">
                    {onSetToday && (
                      <button
                        onClick={onSetToday}
                        className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white dark:bg-white/15 hover:bg-gray-50 dark:hover:bg-white/20 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-gray-800 dark:text-white shadow-2xs transition-all cursor-pointer active:scale-95"
                        title="Jump to today"
                      >
                        Today
                      </button>
                    )}
                    <div className="flex items-center">
                      <button
                        onClick={onPrevDate}
                        className="p-1 hover:bg-gray-200/60 dark:hover:bg-white/10 rounded-lg text-gray-600 dark:text-gray-300 transition-colors cursor-pointer active:scale-95"
                        title="Previous Day"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={onNextDate}
                        className="p-1 hover:bg-gray-200/60 dark:hover:bg-white/10 rounded-lg text-gray-600 dark:text-gray-300 transition-colors cursor-pointer active:scale-95"
                        title="Next Day"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-gray-100 px-1 whitespace-nowrap tracking-tight">
                      {formattedDate}
                    </span>
                    {onOpenCalendar && (
                      <button
                        onClick={onOpenCalendar}
                        className="px-2 py-0.5 sm:py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                        title="Open Calendar selector"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Calendar</span>
                      </button>
                    )}
                    {onOpenDateRangePicker && (
                      <button
                        onClick={onOpenDateRangePicker}
                        className="px-2 py-0.5 sm:py-1 bg-gray-200/80 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                        title="Filter by Date Range"
                      >
                        <CalendarRange className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="hidden sm:inline">Range</span>
                      </button>
                    )}
                  </div>
                )
              )}
            </>
          )}

          {/* 2. In-Page Search Bar */}
          {showSearch && onSearchChange && (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="w-32 sm:w-44 md:w-56 pl-7.5 pr-7 py-1 bg-gray-100/90 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-[#18181c] focus:w-40 sm:focus:w-52 md:focus:w-64 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-2xs"
              />
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : searchResultsCount !== undefined && searchResultsCount > 0 ? (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">
                  {searchResultsCount}
                </span>
              ) : null}
            </div>
          )}

          {/* 3. Importer Button */}
          {showImport && onImportClick && (
            <button
              onClick={onImportClick}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Import timeline, audio, video, or browser history files"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{importLabel}</span>
            </button>
          )}

          {/* 4. Page-Specific Extra Action Buttons */}
          {children}
        </div>
      </div>
    </div>
  );
};
