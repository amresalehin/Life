import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  ExternalLink,
  Headphones,
  Globe,
  Map as MapIcon,
  Plus,
  Sparkles,
  Trash2,
  Video,
  Eye,
  EyeOff
} from 'lucide-react';
import { CalendarEvent, TimelineItem } from '../types';
import { TimelineCard } from './TimelineCard';
import { LeafletMap } from './LeafletMap';

interface JournalDayCardProps {
  dateKey: string;
  dateObj: Date;
  isToday: boolean;
  isCurrentSelected: boolean;
  items: TimelineItem[];
  events: CalendarEvent[];
  dailyNote: string;
  onSaveDailyNote: (text: string) => void;
  onOpenAddEventForDate: (dateKey: string) => void;
  onDeleteEvent: (id: string | number) => void;
  onSelectBrowser?: (item: TimelineItem) => void;
  onShowTrackProfile?: (track: string, artist?: string) => void;
  onShowArtistProfile?: (artist: string) => void;
  onShowVideoProfile?: (title: string, channel?: string) => void;
  onShowChannelProfile?: (channel: string) => void;
  onShowDomainProfile?: (domain: string) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
}

export const JournalDayCard: React.FC<JournalDayCardProps> = ({
  dateKey,
  dateObj,
  isToday,
  isCurrentSelected,
  items,
  events,
  dailyNote,
  onSaveDailyNote,
  onOpenAddEventForDate,
  onDeleteEvent,
  onSelectBrowser,
  onShowTrackProfile,
  onShowArtistProfile,
  onShowVideoProfile,
  onShowChannelProfile,
  onShowDomainProfile,
  onOpenMapModal,
  onResolveGeo
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [noteText, setNoteText] = useState(dailyNote || '');
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync local note text with external changes
  useEffect(() => {
    setNoteText(dailyNote || '');
  }, [dailyNote]);

  // Lazy loading observer for performance
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleNoteBlur = () => {
    setIsNoteFocused(false);
    if (noteText !== dailyNote) {
      onSaveDailyNote(noteText);
    }
  };

  const mapItems = useMemo(() => items.filter(s => s.type === 'maps'), [items]);
  const spotifyCount = useMemo(() => items.filter(s => s.type === 'spotify').length, [items]);
  const youtubeCount = useMemo(() => items.filter(s => s.type === 'youtube').length, [items]);
  const browserCount = useMemo(() => items.filter(s => s.type === 'browser').length, [items]);
  const mapsCount = mapItems.length;
  const totalCount = items.length + events.length;

  // Formatted date string
  const formattedDayTitle = useMemo(() => {
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, [dateObj]);

  // Group items by hours for structured 24-hour presentation
  const hoursRows = useMemo(() => {
    if (!isVisible && !isCurrentSelected) return null;

    return Array.from({ length: 24 }, (_, hour) => {
      const itemsInHour = items.filter(
        s => s.dateObj && s.dateObj.getHours() === hour && s.type !== 'maps'
      );
      const hourEvents = events.filter(ev => {
        if (!ev.start) return false;
        return parseInt(ev.start.split(':')[0], 10) === hour;
      });

      if (itemsInHour.length === 0 && hourEvents.length === 0) {
        return null;
      }

      const displayHour =
        hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

      return (
        <div
          key={hour}
          className="flex min-h-[52px] border-b border-gray-100/80 dark:border-gray-800/40 px-3 py-2 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-900/20"
        >
          <div className="w-16 text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-1 shrink-0 select-none font-mono">
            {displayHour}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {hourEvents.map(ev => (
              <div
                key={ev.id}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-xs text-emerald-900 dark:text-emerald-100 max-w-xl shadow-2xs"
              >
                <div className="flex justify-between items-start font-bold">
                  <span className="flex items-center gap-1.5">• {ev.title}</span>
                  <button
                    onClick={() => onDeleteEvent(ev.id)}
                    className="text-red-500 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {ev.description && (
                  <p className="mt-1 text-[11px] text-emerald-800/80 dark:text-emerald-200/80">
                    {ev.description}
                  </p>
                )}
                {ev.start && (
                  <div className="mt-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    {ev.start} {ev.end ? `→ ${ev.end}` : ''}
                  </div>
                )}
              </div>
            ))}
            {itemsInHour.map(item => (
              <div key={item.id} className="max-w-xl">
                <TimelineCard
                  item={item}
                  onSelectBrowser={onSelectBrowser}
                  onShowTrackProfile={onShowTrackProfile}
                  onShowArtistProfile={onShowArtistProfile}
                  onShowVideoProfile={onShowVideoProfile}
                  onShowChannelProfile={onShowChannelProfile}
                  onShowDomainProfile={onShowDomainProfile}
                  onOpenMapModal={onOpenMapModal}
                  onResolveGeo={onResolveGeo}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }).filter(Boolean);
  }, [isVisible, isCurrentSelected, items, events, onDeleteEvent, onSelectBrowser, onShowTrackProfile, onShowArtistProfile, onShowVideoProfile, onShowChannelProfile, onShowDomainProfile, onOpenMapModal, onResolveGeo]);

  return (
    <div
      id={`journal-day-${dateKey}`}
      ref={cardRef}
      className={`scroll-mt-16 rounded-2xl border transition-all mb-8 overflow-hidden ${
        isCurrentSelected
          ? 'border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-md bg-white dark:bg-[#0e0e0e]'
          : 'border-gray-200 dark:border-gray-800/90 shadow-xs bg-white dark:bg-[#111111] hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      {/* Sticky Day Header Banner */}
      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-[#161616]/95 backdrop-blur-md px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs border border-emerald-500/20">
            {dateObj.getDate()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {formattedDayTitle}
              </h3>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] tracking-wide uppercase shadow-2xs">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 font-mono flex-wrap">
              <span>{totalCount} log{totalCount !== 1 ? 's' : ''}</span>
              {spotifyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  • <Headphones className="w-2.5 h-2.5" /> {spotifyCount}
                </span>
              )}
              {youtubeCount > 0 && (
                <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400">
                  • <Video className="w-2.5 h-2.5" /> {youtubeCount}
                </span>
              )}
              {browserCount > 0 && (
                <span className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400">
                  • <Globe className="w-2.5 h-2.5" /> {browserCount}
                </span>
              )}
              {mapsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400">
                  • <MapIcon className="w-2.5 h-2.5" /> {mapsCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Day Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {mapsCount > 0 && (
            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showMap
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-500/40'
              }`}
              title="Toggle Day Movement Map"
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">{showMap ? 'Hide Map' : 'Day Map'}</span>
            </button>
          )}

          <button
            onClick={() => onOpenAddEventForDate(dateKey)}
            className="px-2.5 py-1 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="Add event on this date"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Event</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse day' : 'Expand day'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Day Content */}
      {isExpanded && (
        <div className="space-y-0">
          {/* Daily Reflection / Diary Entry Box */}
          <div className="p-3.5 bg-gray-50/40 dark:bg-[#131313] border-b border-gray-100 dark:border-gray-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Edit3 className="w-3 h-3 text-emerald-500" /> Daily Reflections & Notes
              </label>
              {dailyNote && !isNoteFocused && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  ✓ Saved
                </span>
              )}
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onFocus={() => setIsNoteFocused(true)}
              onBlur={handleNoteBlur}
              placeholder={`Write your daily notes, thoughts, and reflections for ${dateKey}...`}
              rows={noteText || isNoteFocused ? 3 : 2}
              className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-500 resize-y transition-all placeholder:text-gray-400 leading-relaxed shadow-2xs"
            />
          </div>

          {/* Day Map (if toggled) */}
          {showMap && mapItems.length > 0 && (
            <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0c0c0c]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <MapIcon className="w-3.5 h-3.5 text-blue-500" />
                  Day Movement Path ({mapItems.length} locations)
                </h4>
              </div>
              <div className="w-full h-72 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner relative z-0 isolate">
                <LeafletMap
                  containerId={`journal-day-map-${dateKey}`}
                  items={mapItems}
                  onPreviewOpen={onOpenMapModal}
                />
              </div>
            </div>
          )}

          {/* 24-Hour Chronological Activity Stream */}
          {totalCount === 0 ? (
            <div className="py-6 px-4 text-center text-xs text-gray-400 font-mono">
              No recorded activity or events for this date.
            </div>
          ) : (
            <div className="divide-y divide-gray-100/60 dark:divide-gray-800/40">
              {hoursRows && hoursRows.length > 0 ? (
                hoursRows
              ) : (
                <div className="p-4 space-y-2">
                  {events.map(ev => (
                    <div
                      key={ev.id}
                      className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-xs text-emerald-900 dark:text-emerald-100 max-w-xl"
                    >
                      <div className="flex justify-between items-start font-bold">
                        <span>• {ev.title}</span>
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="text-red-500 hover:text-red-600 p-0.5 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {ev.description && <p className="mt-1 text-[11px]">{ev.description}</p>}
                    </div>
                  ))}
                  {items.map(item => (
                    <div key={item.id} className="max-w-xl">
                      <TimelineCard
                        item={item}
                        onSelectBrowser={onSelectBrowser}
                        onShowTrackProfile={onShowTrackProfile}
                        onShowArtistProfile={onShowArtistProfile}
                        onShowVideoProfile={onShowVideoProfile}
                        onShowChannelProfile={onShowChannelProfile}
                        onShowDomainProfile={onShowDomainProfile}
                        onOpenMapModal={onOpenMapModal}
                        onResolveGeo={onResolveGeo}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
