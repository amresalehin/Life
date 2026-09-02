import React from 'react';
import { Headphones, Youtube, MapPin, Globe, BarChart2, ExternalLink, Eye, Key, Lock, Map as MapIcon } from 'lucide-react';
import { TimelineItem } from '../types';
import { buildGoogleMapsEmbedUrl, buildGoogleMapsUrl, formatTime, isGenericPlaceName } from '../utils/dataParser';
import { extractDomain, extractUrlMetadata } from '../utils/urlMetadata';
import { SpotifyCoverArt } from './SpotifyCoverArt';

interface TimelineCardProps {
  item: TimelineItem;
  isSelected?: boolean;
  onSelectBrowser?: (item: TimelineItem) => void;
  onSelectYouTube?: (item: TimelineItem) => void;
  onSelectSpotify?: (item: TimelineItem) => void;
  onShowTrackProfile?: (track: string, artist?: string) => void;
  onShowArtistProfile?: (artist: string) => void;
  onShowVideoProfile?: (title: string, channel?: string) => void;
  onShowChannelProfile?: (channel: string) => void;
  onShowDomainProfile?: (domain: string) => void;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  item,
  isSelected = false,
  onSelectBrowser,
  onSelectYouTube,
  onSelectSpotify,
  onShowTrackProfile,
  onShowArtistProfile,
  onShowVideoProfile,
  onShowChannelProfile,
  onShowDomainProfile,
  onOpenMapModal,
  onResolveGeo
}) => {
  const timeStr = item.dateObj ? formatTime(item.dateObj) : '';

  // 1. Browser Item
  if (item.type === 'browser') {
    const domain = item.domain || extractDomain(item.url || '');
    const favicon = item.favicon_url || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
    const url = item.url || '#';
    const meta = extractUrlMetadata(url, item.title);

    return (
      <div
        onClick={() => onSelectBrowser && onSelectBrowser(item)}
        className={`bg-white dark:bg-[#121212] border ${
          isSelected
            ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10 shadow-sm'
            : 'border-gray-200 dark:border-gray-800 hover:border-sky-500/40'
        } rounded-xl p-3 shadow-2xs transition-all space-y-2 cursor-pointer group`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Globe className="w-3 h-3" /> {domain}
            </span>
            {meta.category && (
              <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {meta.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-gray-400">{timeStr}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectBrowser && onSelectBrowser(item);
              }}
              className="px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Show Preview on right side"
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDomainProfile && onShowDomainProfile(domain);
              }}
              className="p-1 text-gray-400 hover:text-sky-500 transition-colors cursor-pointer"
              title="Domain Analytics"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-sky-500 transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <img
            src={favicon}
            className="w-5 h-5 rounded mt-0.5 shrink-0 bg-gray-100 dark:bg-gray-800 object-contain p-0.5"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-sky-500 transition-colors" title={item.title}>
              {item.title}
            </h4>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate block group-hover:underline mt-0.5 font-mono">
              {url}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Spotify Item
  if (item.type === 'spotify') {
    const trackId = item.trackId;
    return (
      <div
        onClick={() => onSelectSpotify && onSelectSpotify(item)}
        className={`bg-white dark:bg-[#121212] border ${
          isSelected
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
            : 'border-gray-200 dark:border-gray-800 hover:border-emerald-500/40'
        } rounded-xl p-3 shadow-2xs transition-all space-y-2 cursor-pointer group`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Headphones className="w-3 h-3" /> Spotify
            </span>
            {item.album && (
              <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                {item.album}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-gray-400">{timeStr}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectSpotify && onSelectSpotify(item);
              }}
              className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Inspect Track & Analytics on right side"
            >
              <BarChart2 className="w-3 h-3" /> Inspect
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowTrackProfile && onShowTrackProfile(item.title, item.subtitle);
              }}
              className="p-1 text-gray-400 hover:text-purple-500 transition-colors cursor-pointer"
              title="Track Deep Dive Profile"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          <SpotifyCoverArt
            title={item.title}
            artist={item.subtitle}
            album={item.album}
            trackId={trackId}
            size="xs"
            className="w-10 h-10 rounded-lg shrink-0 border border-white/10 shadow-2xs"
          />
          <div className="min-w-0 flex-1">
            <h4
              onClick={(e) => {
                e.stopPropagation();
                onSelectSpotify ? onSelectSpotify(item) : onShowTrackProfile?.(item.title, item.subtitle);
              }}
              className="text-xs font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-emerald-500"
            >
              {item.title}
            </h4>
            <p
              onClick={(e) => {
                e.stopPropagation();
                onShowArtistProfile && onShowArtistProfile(item.subtitle);
              }}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate cursor-pointer hover:underline mt-0.5"
            >
              {item.subtitle}
            </p>
          </div>
        </div>
        {trackId && (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-black">
            <iframe
              src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        )}
      </div>
    );
  }

  // 3. YouTube Item
  if (item.type === 'youtube') {
    const videoId = item.youtube_video_id;
    const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
    return (
      <div
        onClick={() => onSelectYouTube && onSelectYouTube(item)}
        className={`bg-white dark:bg-[#121212] border ${
          isSelected
            ? 'border-red-500 ring-2 ring-red-500/30 bg-red-500/5 dark:bg-red-500/10 shadow-sm'
            : 'border-gray-200 dark:border-gray-800 hover:border-red-500/40'
        } rounded-xl p-3 shadow-2xs transition-all space-y-2 cursor-pointer group`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-1.5">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500">
            <Youtube className="w-3 h-3" /> YouTube
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-gray-400">{timeStr}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Inspect Video Analytics"
            >
              <Eye className="w-3 h-3" /> Inspect
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowVideoProfile && onShowVideoProfile(item.title, item.subtitle);
              }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Video Analytics Modal"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            {item.titleUrl && (
              <a
                href={item.titleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Open in YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2.5 items-start">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="w-20 h-13 object-cover rounded-lg bg-black cursor-pointer group-hover:opacity-90 transition-opacity shrink-0 border border-gray-100 dark:border-gray-800"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="w-20 h-13 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center cursor-pointer shrink-0 border border-red-500/20"
            >
              <Youtube className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4
              onClick={(e) => {
                e.stopPropagation();
                onSelectYouTube && onSelectYouTube(item);
              }}
              className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug cursor-pointer group-hover:text-red-500 transition-colors"
              title={item.title}
            >
              {item.title}
            </h4>
            <p
              onClick={(e) => {
                e.stopPropagation();
                onShowChannelProfile && onShowChannelProfile(item.subtitle);
              }}
              className="text-[11px] text-gray-500 dark:text-gray-400 truncate cursor-pointer hover:underline mt-0.5"
            >
              {item.subtitle}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. Maps Item
  if (item.type === 'maps') {
    const gmapsEmbedUrl = buildGoogleMapsEmbedUrl(item);
    const gmapsUrl = buildGoogleMapsUrl(item);
    const isGeneric = isGenericPlaceName(item.title);

    return (
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-2xs hover:border-blue-500/40 transition-all space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-1.5">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <MapPin className="w-3 h-3" /> Maps
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-gray-400">{timeStr}</span>
            <button
              onClick={() => onOpenMapModal && onOpenMapModal(item.title, item.subtitle, gmapsEmbedUrl, gmapsUrl)}
              className="px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Preview on Google Maps"
            >
              <MapIcon className="w-3 h-3" /> Preview
            </button>
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="Open in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate hover:text-blue-500">
              {item.title}
            </span>
            {isGeneric && item.lat != null && item.lng != null && onResolveGeo && (
              <button
                onClick={() => onResolveGeo(item.lat!, item.lng!)}
                className="text-[9px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
              >
                Resolve
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</p>
        </div>
        {gmapsEmbedUrl && (
          <div className="h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-900">
            <iframe src={gmapsEmbedUrl} width="100%" height="100%" style={{ border: 0 }} loading="lazy" />
          </div>
        )}
      </div>
    );
  }

  return null;
};
