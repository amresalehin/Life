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
  onSelectPhoto?: (item: TimelineItem) => void;
}

export const JournalDayCard: React.FC<JournalDayCardProps> = React.memo(({
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
  onResolveGeo,
  onSelectPhoto
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [noteText, setNoteText] = useState(dailyNote || '');
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync local note text with external changes
  useEffect(() => {
    setNoteText(dailyNote || '');
  }, [dailyNote]);

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

  // Fast O(N) bucketing by hour
  const itemsByHour = useMemo(() => {
    const buckets: { items: TimelineItem[]; events: CalendarEvent[] }[] = Array.from(
      { length: 24 },
      () => ({ items: [], events: [] })
    );

    events.forEach(ev => {
      if (ev.start) {
        const h = parseInt(ev.start.split(':')[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) {
          buckets[h].events.push(ev);
        }
      }
    });

    items.forEach(it => {
      if (it.type !== 'maps' && it.dateObj) {
        const h = it.dateObj.getHours();
        if (h >= 0 && h < 24) {
          buckets[h].items.push(it);
        }
      }
    });

    return buckets;
  }, [items, events]);

  const hoursRows = useMemo(() => {
    return itemsByHour.map((bucket, hour) => {
      if (bucket.items.length === 0 && bucket.events.length === 0) {
        return null;
      }

      const displayHour =
        hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

      return (
        <div
          key={hour}
          className="space-y-2.5 pt-1"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>{displayHour}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bucket.events.map(ev => (
              <div
                key={ev.id}
                className="bg-blue-500/10 dark:bg-blue-950/40 backdrop-blur-md border border-blue-500/25 dark:border-blue-700/50 rounded-2xl p-3.5 text-xs text-blue-950 dark:text-blue-100 shadow-2xs hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start font-bold">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold text-blue-900 dark:text-blue-100">
                      • {ev.title}
                    </span>
                    <button
                      onClick={() => onDeleteEvent(ev.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-500/10 cursor-pointer transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {ev.description && (
                    <p className="mt-1 text-xs text-blue-800 dark:text-blue-200/90 leading-relaxed font-normal">
                      {ev.description}
                    </p>
                  )}
                </div>
                {ev.start && (
                  <div className="mt-2 pt-1 border-t border-blue-500/15 flex items-center justify-between text-[10px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                    <span>Scheduled Time</span>
                    <span>{ev.start} {ev.end ? `→ ${ev.end}` : ''}</span>
                  </div>
                )}
              </div>
            ))}
            {bucket.items.map(item => (
              <div key={item.id} className="w-full">
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
                  onSelectPhoto={onSelectPhoto}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }).filter(Boolean);
  }, [itemsByHour, onDeleteEvent, onSelectBrowser, onShowTrackProfile, onShowArtistProfile, onShowVideoProfile, onShowChannelProfile, onShowDomainProfile, onOpenMapModal, onResolveGeo, onSelectPhoto]);

  return (
    <div
      id={`journal-day-${dateKey}`}
      ref={cardRef}
      className={`scroll-mt-16 mb-10 transition-all ${
        isCurrentSelected ? 'ring-2 ring-blue-500/40 rounded-3xl p-1' : ''
      }`}
    >
      {/* Clean Day Header Bar (YouTube Section Style - Not a giant enclosing card) */}
      <div className="sticky top-0 z-20 py-2.5 px-3 mb-4 rounded-2xl bg-white/70 dark:bg-[#121214]/75 backdrop-blur-xl border border-black/8 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 font-bold text-xs border border-blue-500/30 shadow-2xs">
            {dateObj.getDate()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-950 dark:text-white leading-tight">
                {formattedDayTitle}
              </h3>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] tracking-wide uppercase shadow-2xs">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-600 dark:text-gray-400 font-mono flex-wrap font-medium">
              <span>{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
              {spotifyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                  • <Headphones className="w-2.5 h-2.5" /> {spotifyCount}
                </span>
              )}
              {youtubeCount > 0 && (
                <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                  • <Video className="w-2.5 h-2.5" /> {youtubeCount}
                </span>
              )}
              {browserCount > 0 && (
                <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold">
                  • <Globe className="w-2.5 h-2.5" /> {browserCount}
                </span>
              )}
              {mapsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
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
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showMap
                  ? 'bg-blue-500/20 dark:bg-blue-950/70 border-blue-500/40 text-blue-900 dark:text-blue-200 font-bold'
                  : 'bg-white/80 dark:bg-white/10 border-black/10 dark:border-white/15 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-white/20'
              }`}
              title="Toggle Day Movement Map"
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">{showMap ? 'Hide Map' : 'Day Map'}</span>
            </button>
          )}

          <button
            onClick={() => onOpenAddEventForDate(dateKey)}
            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Add event on this date"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Event</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/15 text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse day' : 'Expand day'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Day Content - Series of Individual Cards */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Standalone Card: Daily Reflection / Diary Entry Box */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-black/35 backdrop-blur-md border border-black/8 dark:border-white/10 shadow-xs hover:border-black/15 dark:hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Daily Reflections & Notes
              </label>
              {dailyNote && !isNoteFocused && (
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
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
              className="w-full bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl p-2.5 text-xs sm:text-sm text-gray-950 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-y transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed font-medium"
            />
          </div>

          {/* Standalone Card: Day Map (if toggled) */}
          {showMap && mapItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-black/35 backdrop-blur-md border border-black/8 dark:border-white/10 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-gray-950 dark:text-white flex items-center gap-1.5">
                  <MapIcon className="w-3.5 h-3.5 text-blue-500" />
                  Day Movement Path ({mapItems.length} locations)
                </h4>
              </div>
              <div className="w-full h-72 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-inner relative z-0 isolate">
                <LeafletMap
                  containerId={`journal-day-map-${dateKey}`}
                  items={mapItems}
                  onPreviewOpen={onOpenMapModal}
                />
              </div>
            </div>
          )}

          {/* Activity & Event Items Feed - Individual Cards (YouTube Style) */}
          {totalCount === 0 ? (
            <div className="py-6 px-4 text-center text-xs text-gray-500 dark:text-gray-400 font-mono bg-white/40 dark:bg-white/[0.02] rounded-2xl border border-black/5 dark:border-white/5">
              No recorded activity or events for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {hoursRows}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

JournalDayCard.displayName = 'JournalDayCard';
