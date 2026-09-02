export type ItemType = 'spotify' | 'youtube' | 'maps' | 'browser';

export interface TimelineItem {
  id: string;
  type: ItemType;
  ts: string; // ISO 8601 string
  endTs?: string | null;
  dateObj: Date;
  title: string;
  subtitle: string;
  platform?: string;
  // Spotify specifics
  ms_played?: number;
  album?: string;
  spotify_track_uri?: string;
  trackId?: string | null;
  master_metadata_track_name?: string;
  master_metadata_album_artist_name?: string;
  master_metadata_album_album_name?: string;
  // YouTube specifics
  youtube_video_id?: string | null;
  titleUrl?: string;
  // Maps specifics
  lat?: number | null;
  lng?: number | null;
  address?: string;
  placeId?: string | null;
  isRoute?: boolean;
  activityType?: string;
  travelMode?: string;
  distance?: number;
  distanceKm?: string | null;
  origin?: { lat: number; lng: number; address: string } | null;
  destination?: { lat: number; lng: number; address: string } | null;
  pathPoints?: { lat: number; lng: number }[];
  isGeocoded?: boolean;
  category?: string;
  place_name?: string;
  // Browser specifics
  url?: string;
  domain?: string;
  favicon_url?: string;
  transition?: string;
  client_id?: string | null;
}

export interface CalendarEvent {
  id: number | string;
  title: string;
  date?: string;
  start: string;
  end?: string;
  category: string;
  description?: string;
  source?: string;
}

export interface ImportedFileRecord {
  id: string;
  name?: string;
  size?: string;
  importDate: string;
  count?: number;
  spotifyCount?: number;
  ytCount?: number;
  mapsCount?: number;
  browserCount?: number;
  fileName?: string;
  filename?: string;
  fileSize?: string;
  recordCount?: number;
  fileType?: string;
}

export type MetricType = 'track' | 'artist' | 'video' | 'channel' | 'domain';

export interface UrlMetadata {
  domain: string;
  protocol: string;
  isSecure: boolean;
  pathname: string;
  pathSegments: string[];
  category: string;
  categoryIcon: string;
  icon: string;
  accentColor: string;
  palette: string[];
  smartTags: string[];
  tags: string[];
  smartSynopsis: string;
  synopsis: string;
  readMinutes: number;
  readTime: string;
  snapshotUrl: string;
  imageUrl: string;
  requiresAuth: boolean;
  isLoginPage: boolean;
  authType: string | null;
  authServiceName: string;
  authBrandIcon: string;
  authBrandGradient: string;
  fallbackHeroSvg: string;
}

export interface ResolvedGeoInfo {
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
}

export type ViewType = 'timeline' | 'maptimeline' | 'spotify' | 'youtube' | 'browser' | 'notes';
export type SubViewType = 'day' | 'week' | 'month' | 'log' | 'grid' | 'domains';
export type BrowserPreviewTab = 'card' | 'reader' | 'frame' | 'session';
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface MetricsModalState {
  isOpen: boolean;
  type: 'track' | 'artist' | 'youtube-video' | 'youtube-channel' | 'browser-domain';
  title: string;
  subtitle?: string;
}

export interface MapOverleafModalState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  embedUrl: string;
  externalUrl: string;
}

export interface BrowserLeafletModalState {
  isOpen: boolean;
  url: string;
  title: string;
  domain: string;
  ts: string;
}

export interface RecentSearchItem {
  id: string;
  query: string;
  timestamp: number;
  type?: 'all' | 'spotify' | 'youtube' | 'maps' | 'browser';
  matchCount?: number;
}

// Project & Dev types for auxiliary components
export interface VirtualFile {
  name: string;
  path: string;
  content: string;
  size?: number;
  blobUrl?: string;
  blob?: Blob;
  mimeType?: string;
  isDirectory?: boolean;
  lastModified?: number;
}

export interface FileTreeNode {
  id?: string;
  name: string;
  path: string;
  type?: 'file' | 'folder';
  isDirectory?: boolean;
  children?: FileTreeNode[];
  size?: number;
  mimeType?: string;
  extension?: string;
}

export interface ZipProject {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  entryPoint?: string;
  availableHtmlFiles?: string[];
  totalSize?: number;
  fileCount?: number;
  loadedAt?: Date;
  rawZipBlob?: Blob;
  files: Map<string, VirtualFile>;
}

export interface SampleApp {
  id: string;
  title: string;
  description: string;
  category?: string;
  tag?: string;
  tags?: string[];
  icon?: string;
  fileCount?: number;
  entryPoint?: string;
  files?: Record<string, string> | VirtualFile[];
}

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error';
  text: string;
  timestamp: number;
}

export interface ViewportDevice {
  id: string;
  name: string;
  width: number | string;
  height: number | string;
  type?: 'desktop' | 'tablet' | 'mobile';
  icon?: any;
}

export interface DeviceConfig {
  id: string;
  name: string;
  width: number | string;
  height: number | string;
  icon?: any;
}

export interface NetworkLogItem {
  id: string;
  url: string;
  method: string;
  status: number;
  time: number;
  type?: string;
}

