import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TimelineItem, CalendarEvent, ImportedFileRecord, ViewType, MetricType, DateRange, UserSettings } from './types';
import { getDemoTimelineData } from './utils/demoData';
import { parseUploadedFiles, reverseGeocodeLocation, reverseGeocodeItem, batchReverseGeocodePlaces, isGenericPlaceName } from './utils/dataParser';
import { dbGet, dbSet, dbDelete } from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { JournalView } from './components/views/JournalView';
import { MapTimelineView } from './components/views/MapTimelineView';
import { SpotifyView } from './components/views/SpotifyView';
import { YouTubeView } from './components/views/YouTubeView';
import { NotesView } from './components/views/NotesView';
import { BrowserView } from './components/views/BrowserView';
import { CalendarModal, CalendarModalMode } from './components/CalendarModal';
import { EventModal } from './components/EventModal';
import { ImportModal, ImportModalMode } from './components/ImportModal';
import { ImportedFilesModal } from './components/ImportedFilesModal';
import { MetricsModal } from './components/MetricsModal';
import { MapOverleafModal } from './components/MapOverleafModal';
import { BrowserLeafletModal } from './components/BrowserLeafletModal';
import { SettingsModal } from './components/SettingsModal';
import { PhotosView } from './components/views/PhotosView';
import { BookmarksView } from './components/views/BookmarksView';
import { BoxCloudView } from './components/views/BoxCloudView';
import { PhotoLightboxModal } from './components/PhotoLightboxModal';
import { promptNativeDirectoryMount } from './utils/photosMountService';
import { RaindropSyncModal } from './components/RaindropSyncModal';
import { BookmarkSyncModal } from './components/BookmarkSyncModal';
import { RaindropSyncResult, getRaindropConfig, syncRaindropBookmarks } from './utils/raindropSync';
import { UniversalBookmarkResult, BookmarkServiceName } from './utils/bookmarkSyncServices';
import { getPinterestConfig, syncPinterestPins } from './utils/pinterestSync';
import { LowPolyWallpaper } from './components/backgrounds/LowPolyWallpaper';
import { ChromeBlurredBackground } from './components/backgrounds/ChromeBlurredBackground';
import { TopographyWallpaper } from './components/backgrounds/TopographyWallpaper';
import { getBookmarkAdaptiveTheme } from './utils/bookmarkAdaptiveTheme';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  backgroundEffect: 'dynamic',
  showFloatingOrbs: true,
  animationSpeed: 'balanced',
  timeFormat: '12h',
  defaultView: 'timeline',
  autoResolveGeo: true
};

export const App: React.FC = () => {
  // User Settings state (persisted in localStorage)
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('mylife_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Settings Modal Open State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Theme state
  const [isAmoled, setIsAmoled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mylife_settings');
      if (saved) {
        return JSON.parse(saved).theme !== 'light';
      }
      return localStorage.getItem('mylife_amoled') !== 'false';
    } catch {
      return true;
    }
  });

  // Current selected Date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Current active navigation view
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    try {
      const saved = localStorage.getItem('mylife_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultView) return parsed.defaultView;
      }
    } catch {}
    return 'timeline';
  });

  // Individualized Date Range state per view
  const [viewDateRanges, setViewDateRanges] = useState<Record<CalendarModalMode, DateRange | null>>({
    all: null,
    journal: null,
    spotify: null,
    youtube: null,
    maps: null,
    browser: null,
    notes: null,
    photos: null,
    bookmarks: null,
    box: null
  });

  // Storage hydration flag to prevent premature state overwrites
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Timeline Data State (clean initial state, loaded on import or from IndexedDB)
  const [timelineData, setTimelineData] = useState<TimelineItem[]>(() => []);

  // Calendar Events State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Daily Notes Map: { 'YYYY-MM-DD': 'Note content' }
  const [dailyNotesMap, setDailyNotesMap] = useState<Record<string, string>>({});

  // Imported Files Tracking
  const [importedFiles, setImportedFiles] = useState<ImportedFileRecord[]>([]);

  // Bookmark Notes & Tags
  const [bookmarkNotes, setBookmarkNotes] = useState<Record<string, string>>({});

  const [bookmarkTags, setBookmarkTags] = useState<Record<string, string[]>>({});

  // Session custom snapshots / captures
  const [sessionSnapshots, setSessionSnapshots] = useState<Record<string, string>>({});

  // Active Bookmark Service & Media for dynamic adaptive theme styling (initial: pink & sea green)
  const [activeBookmarkService, setActiveBookmarkService] = useState<string>('all');
  const [activeBookmarkMedia, setActiveBookmarkMedia] = useState<string | undefined>(undefined);

  // Hydrate state from IndexedDB on initial mount
  useEffect(() => {
    async function hydrateState() {
      try {
        const [
          savedTimeline,
          savedEvents,
          savedNotes,
          savedFiles,
          savedBookmarkNotes,
          savedBookmarkTags,
          savedSnapshots
        ] = await Promise.all([
          dbGet<TimelineItem[] | null>('mylife_timeline_items', null),
          dbGet<CalendarEvent[] | null>('mylife_calendar_events', null),
          dbGet<Record<string, string> | null>('mylife_daily_notes', null),
          dbGet<ImportedFileRecord[] | null>('mylife_imported_files', null),
          dbGet<Record<string, string> | null>('mylife_bookmark_notes', null),
          dbGet<Record<string, string[]> | null>('mylife_bookmark_tags', null),
          dbGet<Record<string, string> | null>('mylife_session_snapshots', null)
        ]);

        if (savedTimeline && Array.isArray(savedTimeline) && savedTimeline.length > 0) {
          setTimelineData(
            savedTimeline.map((item: any) => ({
              ...item,
              dateObj: new Date(item.ts)
            }))
          );
        }
        if (savedEvents && Array.isArray(savedEvents) && savedEvents.length > 0) {
          setCalendarEvents(savedEvents);
        }
        if (savedNotes && typeof savedNotes === 'object' && Object.keys(savedNotes).length > 0) {
          setDailyNotesMap(savedNotes);
        }
        if (savedFiles && Array.isArray(savedFiles) && savedFiles.length > 0) {
          setImportedFiles(savedFiles);
        }
        if (savedBookmarkNotes && typeof savedBookmarkNotes === 'object') {
          setBookmarkNotes(savedBookmarkNotes);
        }
        if (savedBookmarkTags && typeof savedBookmarkTags === 'object') {
          setBookmarkTags(savedBookmarkTags);
        }
        if (savedSnapshots && typeof savedSnapshots === 'object') {
          setSessionSnapshots(savedSnapshots);
        }
      } catch (e) {
        console.error('Failed to hydrate state from IndexedDB:', e);
      } finally {
        setIsHydrated(true);
      }
    }

    hydrateState();
  }, []);

  // Modals state
  const [calendarModal, setCalendarModal] = useState<{
    isOpen: boolean;
    mode: CalendarModalMode;
    initialTab: 'single' | 'range';
  }>({
    isOpen: false,
    mode: 'journal',
    initialTab: 'single'
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    mode: ImportModalMode;
  }>({
    isOpen: false,
    mode: 'journal'
  });

  const [isImportedFilesModalOpen, setIsImportedFilesModalOpen] = useState(false);

  const handleOpenCalendarFor = (mode: CalendarModalMode, initialTab: 'single' | 'range' = 'single') => {
    setCalendarModal({ isOpen: true, mode, initialTab });
  };

  const handleOpenImportFor = (mode: ImportModalMode) => {
    setImportModal({ isOpen: true, mode });
  };

  // Bookmarks & Services Sync Modal state
  const [isRaindropModalOpen, setIsRaindropModalOpen] = useState(false);
  const [bookmarkModalService, setBookmarkModalService] = useState<BookmarkServiceName>('raindrop');

  const handleOpenBookmarkSync = (service: BookmarkServiceName = 'raindrop') => {
    setBookmarkModalService(service);
    setIsRaindropModalOpen(true);
  };

  // Metrics Modal state
  const [metricsModal, setMetricsModal] = useState<{
    isOpen: boolean;
    type: MetricType;
    targetName: string;
    subTargetName?: string;
  }>({
    isOpen: false,
    type: 'track',
    targetName: '',
    subTargetName: ''
  });

  // Map Overleaf Preview Modal state
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    embedUrl: string;
    externalUrl: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    embedUrl: '',
    externalUrl: ''
  });

  // Browser Detail Inspector Modal state
  const [browserModal, setBrowserModal] = useState<{
    isOpen: boolean;
    item: TimelineItem | null;
  }>({
    isOpen: false,
    item: null
  });

  // Selected browser item in sidebar / split view
  const [selectedBrowserItem, setSelectedBrowserItem] = useState<TimelineItem | null>(null);

  // Google Photos Lightbox & Selected State
  const [selectedPhoto, setSelectedPhoto] = useState<TimelineItem | null>(null);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState<boolean>(false);

  // Geocoding Batch Resolver state
  const [isGeoResolving, setIsGeoResolving] = useState(false);

  // Theme effect
  useEffect(() => {
    try {
      localStorage.setItem('mylife_amoled', String(isAmoled));
      if (isAmoled) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [isAmoled]);

  // Asynchronous IndexedDB Persistence
  useEffect(() => {
    if (!isHydrated) return;
    dbSet('mylife_calendar_events', calendarEvents).catch(err => console.error(err));
  }, [calendarEvents, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    dbSet('mylife_daily_notes', dailyNotesMap).catch(err => console.error(err));
  }, [dailyNotesMap, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    dbSet('mylife_imported_files', importedFiles).catch(err => console.error(err));
  }, [importedFiles, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    dbSet('mylife_bookmark_notes', bookmarkNotes).catch(err => console.error(err));
  }, [bookmarkNotes, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    dbSet('mylife_bookmark_tags', bookmarkTags).catch(err => console.error(err));
  }, [bookmarkTags, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    dbSet('mylife_session_snapshots', sessionSnapshots).catch(err => console.error(err));
  }, [sessionSnapshots, isHydrated]);

  // Global keyboard shortcut: Cmd+, / Ctrl+, for Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-sync Raindrop bookmarks on startup if configured & enabled
  useEffect(() => {
    if (!isHydrated) return;
    const cfg = getRaindropConfig();
    if (cfg.autoSync && cfg.apiToken) {
      syncRaindropBookmarks({ token: cfg.apiToken, collectionId: cfg.selectedCollectionId })
        .then(res => {
          if (res.items.length > 0) {
            handleApplyBookmarkData(res, `Raindrop Auto-Sync (${cfg.collectionName || 'All Bookmarks'})`);
          }
        })
        .catch(err => {
          console.warn('Raindrop auto-sync on startup was skipped or failed:', err);
        });
    }

    // Auto-sync Pinterest pins on startup if configured & enabled
    const pCfg = getPinterestConfig();
    if (pCfg.autoSync && pCfg.apiToken) {
      syncPinterestPins({
        token: pCfg.apiToken,
        boardId: pCfg.selectedBoardId === 'all' ? undefined : pCfg.selectedBoardId
      })
        .then(res => {
          if (res.items.length > 0) {
            handleApplyBookmarkData(res, `Pinterest Auto-Sync (${pCfg.boardName || 'All Boards'})`);
          }
        })
        .catch(err => {
          console.warn('Pinterest auto-sync on startup was skipped or failed:', err);
        });
    }
  }, [isHydrated]);

  const persistTimeline = (items: TimelineItem[]) => {
    setTimelineData(items);
    dbSet('mylife_timeline_items', items).catch(e => {
      console.error('Failed to store timeline items in IndexedDB:', e);
    });
  };

  // Date index map for lightning fast day filtering
  const dateIndexMap = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    timelineData.forEach(item => {
      const d = item.dateObj;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });
    return map;
  }, [timelineData]);

  // Current Date string key
  const currentDateKey = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  // Items for the selected day / date range for Journal
  const journalItems = useMemo(() => {
    const range = viewDateRanges.journal;
    if (range) {
      return timelineData.filter(item => {
        const d = item.dateObj;
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key >= range.startDate && key <= range.endDate;
      });
    }
    return dateIndexMap.get(currentDateKey) || [];
  }, [viewDateRanges.journal, timelineData, dateIndexMap, currentDateKey]);

  // Events for the selected day / date range for Journal
  const journalEvents = useMemo(() => {
    const range = viewDateRanges.journal;
    if (range) {
      return calendarEvents.filter(ev => ev.date >= range.startDate && ev.date <= range.endDate);
    }
    return calendarEvents.filter(ev => ev.date === currentDateKey);
  }, [viewDateRanges.journal, calendarEvents, currentDateKey]);

  // Items for Map Timeline view (day or range)
  const mapTimelineItems = useMemo(() => {
    const range = viewDateRanges.maps;
    if (range) {
      return timelineData.filter(item => {
        if (item.type !== 'maps') return false;
        const d = item.dateObj;
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key >= range.startDate && key <= range.endDate;
      });
    }
    return (dateIndexMap.get(currentDateKey) || []).filter(i => i.type === 'maps');
  }, [viewDateRanges.maps, timelineData, dateIndexMap, currentDateKey]);

  // All Mounted Photos List (supporting date ranges if applied)
  const photosList = useMemo(() => {
    const range = viewDateRanges.photos;
    if (range) {
      return timelineData.filter(item => {
        if (item.type !== 'photo') return false;
        const d = item.dateObj;
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key >= range.startDate && key <= range.endDate;
      });
    }
    return timelineData.filter(item => item.type === 'photo');
  }, [viewDateRanges.photos, timelineData]);

  // Daily note for current day
  const currentDailyNote = dailyNotesMap[currentDateKey] || '';

  // Date Navigation Handlers
  const handlePrevDate = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDate = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleSetToday = () => {
    setCurrentDate(new Date());
  };

  const handleJumpToDate = (d: Date) => {
    setCurrentDate(d);
  };

  // Calendar Event actions
  const handleAddEvent = (evData: Omit<CalendarEvent, 'id' | 'date'>) => {
    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      date: currentDateKey,
      ...evData
    };
    setCalendarEvents(prev => [...prev, newEvent]);
  };

  const handleDeleteEvent = (id: string | number) => {
    setCalendarEvents(prev => prev.filter(ev => ev.id !== id));
  };

  // Daily Note save handler
  const handleSaveDailyNote = (text: string) => {
    setDailyNotesMap(prev => ({
      ...prev,
      [currentDateKey]: text
    }));
  };

  const handleSaveSpecificDailyNote = (dateKey: string, text: string) => {
    setDailyNotesMap(prev => ({
      ...prev,
      [dateKey]: text
    }));
  };

  // Bookmark Notes & Tags
  const handleSaveBookmarkNote = (url: string, note: string) => {
    setBookmarkNotes(prev => ({
      ...prev,
      [url]: note
    }));
  };

  const handleAddBookmarkTag = (url: string, tag: string) => {
    setBookmarkTags(prev => {
      const existing = prev[url] || [];
      if (existing.includes(tag)) return prev;
      return {
        ...prev,
        [url]: [...existing, tag]
      };
    });
  };

  const handleRemoveBookmarkTag = (url: string, tag: string) => {
    setBookmarkTags(prev => {
      const existing = prev[url] || [];
      return {
        ...prev,
        [url]: existing.filter(t => t !== tag)
      };
    });
  };

  const handleSaveSessionSnapshot = (url: string, snapshot: string) => {
    setSessionSnapshots(prev => {
      if (!snapshot) {
        const next = { ...prev };
        delete next[url];
        return next;
      }
      return {
        ...prev,
        [url]: snapshot
      };
    });
  };

  // Authenticated-page preview bridge: use the user's native browser session,
  // then capture the selected browser tab/window via Screen Capture API.
  const captureAuthenticatedTab = async (url: string, autoOpen = true) => {
    if (!url) return;

    // Open synchronously while this handler still has user activation so
    // popup blockers do not swallow the authenticated browser tab.
    let openedWindow: Window | null = null;
    if (autoOpen) {
      try {
        openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        openedWindow = null;
      }
    }

    let captured = false;
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: false
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        await new Promise(resolve => setTimeout(resolve, 120));

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stream.getTracks().forEach(track => track.stop());

        if (dataUrl && dataUrl.length > 500) {
          handleSaveSessionSnapshot(url, dataUrl);
          captured = true;
        }
      } catch (err) {
        console.info('Authenticated tab capture cancelled or unavailable:', err);
      }
    }

    // Avoid an unused variable warning while still retaining the opened tab
    // reference for future browser-shell integrations.
    void openedWindow;

    if (captured) {
      // The UI will update from state persistence; no additional action needed.
      return;
    }
  };

  const captureActiveScreen = async (url: string) => {
    if (!url) return;
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: false
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        await new Promise(resolve => setTimeout(resolve, 120));

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stream.getTracks().forEach(track => track.stop());

        if (dataUrl && dataUrl.length > 500) {
          handleSaveSessionSnapshot(url, dataUrl);
        }
      } catch (err) {
        console.info('Active screen capture cancelled or unavailable:', err);
      }
    }
  };

  // File Import handler
  const handleImportFiles = async (files: File[]) => {
    try {
      const { newItems, fileBreakdowns, bookmarkNotes: newNotes, bookmarkTags: newTags, sessionSnapshots: newSnapshots } = await parseUploadedFiles(files, () => {});
      if (newItems.length > 0) {
        // Merge with existing items, deduping by id
        const existingMap = new Map<string, TimelineItem>();
        timelineData.forEach(item => existingMap.set(item.id, item));
        newItems.forEach(item => existingMap.set(item.id, item));

        const merged = Array.from(existingMap.values());
        persistTimeline(merged);
        setImportedFiles(prev => [...fileBreakdowns, ...prev]);

        if (newNotes && Object.keys(newNotes).length > 0) {
          setBookmarkNotes(prev => ({ ...prev, ...newNotes }));
        }
        if (newTags && Object.keys(newTags).length > 0) {
          setBookmarkTags(prev => {
            const next = { ...prev };
            Object.entries(newTags).forEach(([url, tags]) => {
              next[url] = Array.from(new Set([...(next[url] || []), ...tags]));
            });
            return next;
          });
        }
        if (newSnapshots && Object.keys(newSnapshots).length > 0) {
          setSessionSnapshots(prev => ({ ...prev, ...newSnapshots }));
        }

        // Jump to the date of the most recent imported record if available
        const latest = newItems.reduce((max, item) => (item.dateObj > max ? item.dateObj : max), newItems[0].dateObj);
        if (latest && !isNaN(latest.getTime())) {
          setCurrentDate(latest);
        }
      }
    } catch (err) {
      console.error('Error importing files:', err);
    }
  };

  // Raindrop.io & Bookmark Services Synced Data handler
  const handleApplyBookmarkData = (result: RaindropSyncResult | UniversalBookmarkResult, sourceName: string) => {
    if (!result || result.items.length === 0) return;

    const existingMap = new Map<string, TimelineItem>();
    timelineData.forEach(item => existingMap.set(item.id, item));
    result.items.forEach(item => existingMap.set(item.id, item));

    const merged = Array.from(existingMap.values());
    persistTimeline(merged);

    if (Object.keys(result.notes).length > 0) {
      setBookmarkNotes(prev => ({ ...prev, ...result.notes }));
    }

    if (Object.keys(result.tags).length > 0) {
      setBookmarkTags(prev => {
        const next = { ...prev };
        Object.entries(result.tags).forEach(([url, tags]) => {
          next[url] = Array.from(new Set([...(next[url] || []), ...tags]));
        });
        return next;
      });
    }

    if (Object.keys(result.snapshots).length > 0) {
      setSessionSnapshots(prev => ({ ...prev, ...result.snapshots }));
    }

    const newRecord: ImportedFileRecord = {
      id: `bookmarks_${Date.now()}`,
      name: sourceName,
      fileName: sourceName,
      filename: sourceName,
      fileType: 'browser',
      recordCount: result.count,
      count: result.count,
      browserCount: result.count,
      importDate: new Date().toISOString()
    };
    setImportedFiles(prev => [newRecord, ...prev]);

    const latest = result.items.reduce((max, item) => (item.dateObj > max ? item.dateObj : max), result.items[0].dateObj);
    if (latest && !isNaN(latest.getTime())) {
      setCurrentDate(latest);
    }
  };

  // Notes & Diary Import handler
  const handleImportNotes = async (files: File[]) => {
    for (const file of files) {
      try {
        const text = await file.text();
        const sections = text.split(/(?=^#+\s*\d{4}-\d{2}-\d{2}|^\[\d{4}-\d{2}-\d{2}\])/gm);
        const newNotes: Record<string, string> = {};
        sections.forEach(sec => {
          const match = sec.match(/^(?:#+\s*|\[)(\d{4}-\d{2}-\d{2})(?:\]|\b)/);
          if (match) {
            const dateStr = match[1];
            const content = sec.replace(/^(?:#+\s*|\[)(\d{4}-\d{2}-\d{2})(?:\]|\b)/, '').trim();
            if (content) {
              newNotes[dateStr] = content;
            }
          }
        });
        if (Object.keys(newNotes).length > 0) {
          setDailyNotesMap(prev => ({ ...prev, ...newNotes }));
        } else {
          setDailyNotesMap(prev => ({ ...prev, [currentDateKey]: text }));
        }
      } catch (e) {
        console.warn('Failed to parse notes file', e);
      }
    }
  };

  // Delete Imported File and associated items
  const handleDeleteImportedFile = (fileId: string) => {
    setImportedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Google Photos Mounting & Management Handlers
  const handleMountNewPhotos = (newPhotos: TimelineItem[], folderName: string) => {
    if (newPhotos.length === 0) return;

    const existingMap = new Map<string, TimelineItem>();
    timelineData.forEach(item => existingMap.set(item.id, item));
    newPhotos.forEach(item => existingMap.set(item.id, item));

    const merged = Array.from(existingMap.values());
    persistTimeline(merged);

    const newRecord: ImportedFileRecord = {
      id: 'photos_' + Date.now(),
      fileName: folderName || 'Google Photos Folder',
      fileType: 'photos',
      recordCount: newPhotos.length,
      photoCount: newPhotos.length,
      importDate: new Date().toISOString()
    };
    setImportedFiles(prev => [newRecord, ...prev]);

    // Jump to the date of the latest photo
    const latest = newPhotos.reduce((max, item) => (item.dateObj > max ? item.dateObj : max), newPhotos[0].dateObj);
    if (latest && !isNaN(latest.getTime())) {
      setCurrentDate(latest);
    }
  };

  const handleClearPhotos = () => {
    const updated = timelineData.filter(i => i.type !== 'photo');
    persistTimeline(updated);
    setImportedFiles(prev => prev.filter(f => f.fileType !== 'photos'));
  };

  const handleTogglePhotoFavorite = (photoId: string) => {
    const updated = timelineData.map(item => {
      if (item.id === photoId) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });
    persistTimeline(updated);
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
    }
  };

  const handleUpdatePhotoDescription = (photoId: string, desc: string) => {
    const updated = timelineData.map(item => {
      if (item.id === photoId) {
        return { ...item, description: desc };
      }
      return item;
    });
    persistTimeline(updated);
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto(prev => prev ? { ...prev, description: desc } : null);
    }
  };

  const handleSelectPhoto = (photo: TimelineItem) => {
    setSelectedPhoto(photo);
    setIsPhotoLightboxOpen(true);
  };

  // Update Settings
  const handleUpdateSettings = (updater: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updater };
      try {
        localStorage.setItem('mylife_settings', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      if (updater.theme) {
        setIsAmoled(updater.theme === 'dark');
      }
      return next;
    });
  };

  // Toggle theme synced with settings
  const handleToggleTheme = () => {
    const nextAmoled = !isAmoled;
    setIsAmoled(nextAmoled);
    handleUpdateSettings({ theme: nextAmoled ? 'dark' : 'light' });
  };

  // Live item counts categorized by type
  const itemsByType = useMemo(() => {
    let spotify = 0;
    let youtube = 0;
    let maps = 0;
    let browser = 0;
    for (const item of timelineData) {
      if (item.type === 'spotify') spotify++;
      else if (item.type === 'youtube') youtube++;
      else if (item.type === 'maps') maps++;
      else if (item.type === 'browser') browser++;
    }
    return { spotify, youtube, maps, browser };
  }, [timelineData]);

  // Selectively clear single dataset without losing other data
  const handleClearDataset = async (type: 'spotify' | 'youtube' | 'maps' | 'browser' | 'notes' | 'events') => {
    if (type === 'notes') {
      setDailyNotesMap({});
      setBookmarkNotes({});
      setBookmarkTags({});
      try {
        await Promise.all([
          dbDelete('mylife_daily_notes'),
          dbDelete('mylife_bookmark_notes'),
          dbDelete('mylife_bookmark_tags')
        ]);
      } catch (e) {
        console.warn('Failed to clear notes in IndexedDB', e);
      }
      return;
    }

    if (type === 'events') {
      setCalendarEvents([]);
      try {
        await dbDelete('mylife_calendar_events');
      } catch (e) {
        console.warn('Failed to clear events in IndexedDB', e);
      }
      return;
    }

    // Otherwise timeline data type (spotify, youtube, maps, browser)
    const updatedTimeline = timelineData.filter(item => item.type !== type);
    persistTimeline(updatedTimeline);
    setImportedFiles(prev => prev.filter(f => f.fileType !== type));
  };

  // Export Complete User Archive as Single JSON
  const handleExportFullBackup = () => {
    const backupData = {
      app: 'Emreh Takeout Dashboard',
      version: '2.5',
      exportDate: new Date().toISOString(),
      timelineData: timelineData.map(({ dateObj, ...rest }) => ({
        ...rest,
        dateObj: dateObj ? dateObj.toISOString() : rest.ts
      })),
      calendarEvents,
      dailyNotesMap,
      importedFiles,
      bookmarkNotes,
      bookmarkTags,
      sessionSnapshots,
      settings
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('download', `mylife-archive-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Restore Complete User Archive from JSON
  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.timelineData && Array.isArray(data.timelineData)) {
          const restoredTimeline: TimelineItem[] = data.timelineData.map((item: any) => ({
            ...item,
            dateObj: new Date(item.ts || item.dateObj)
          }));
          persistTimeline(restoredTimeline);
        }
        if (data.calendarEvents && Array.isArray(data.calendarEvents)) {
          setCalendarEvents(data.calendarEvents);
        }
        if (data.dailyNotesMap && typeof data.dailyNotesMap === 'object') {
          setDailyNotesMap(data.dailyNotesMap);
        }
        if (data.importedFiles && Array.isArray(data.importedFiles)) {
          setImportedFiles(data.importedFiles);
        }
        if (data.bookmarkNotes && typeof data.bookmarkNotes === 'object') {
          setBookmarkNotes(data.bookmarkNotes);
        }
        if (data.bookmarkTags && typeof data.bookmarkTags === 'object') {
          setBookmarkTags(data.bookmarkTags);
        }
        if (data.sessionSnapshots && typeof data.sessionSnapshots === 'object') {
          setSessionSnapshots(data.sessionSnapshots);
        }
        if (data.settings && typeof data.settings === 'object') {
          handleUpdateSettings(data.settings);
        }
      } catch (err) {
        console.error('Failed to parse and restore backup file:', err);
      }
    };
    reader.readAsText(file);
  };

  // Clear all data completely
  const handleClearAllData = async () => {
    setTimelineData([]);
    setCalendarEvents([]);
    setDailyNotesMap({});
    setImportedFiles([]);
    setBookmarkNotes({});
    setBookmarkTags({});
    setSessionSnapshots({});
    try {
      await Promise.all([
        dbDelete('mylife_timeline_items'),
        dbDelete('mylife_calendar_events'),
        dbDelete('mylife_daily_notes'),
        dbDelete('mylife_imported_files'),
        dbDelete('mylife_bookmark_notes'),
        dbDelete('mylife_bookmark_tags'),
        dbDelete('mylife_session_snapshots')
      ]);
    } catch (e) {
      console.warn('Error clearing IndexedDB storage', e);
    }
  };

  // Optional: Load sample demo data
  const handleLoadDemoData = () => {
    const demoItems = getDemoTimelineData();
    persistTimeline(demoItems);
    setCurrentDate(new Date(2025, 4, 15));
    setImportedFiles([
      { id: 'demo-1', fileName: 'Spotify_Streaming_History_2025.json', fileType: 'spotify', recordCount: 14, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-2', fileName: 'Google_Takeout_Location_History.json', fileType: 'maps', recordCount: 6, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-3', fileName: 'YouTube_Watch_History.html', fileType: 'youtube', recordCount: 5, importDate: '2025-05-15T08:00:00.000Z' },
      { id: 'demo-4', fileName: 'Chrome_Browser_History.json', fileType: 'browser', recordCount: 7, importDate: '2025-05-15T08:00:00.000Z' }
    ]);
  };

  // Metric Profile Drilldown Triggers
  const handleShowTrackProfile = (track: string, artist?: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'track',
      targetName: track,
      subTargetName: artist
    });
  };

  const handleShowArtistProfile = (artist: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'artist',
      targetName: artist
    });
  };

  const handleShowVideoProfile = (title: string, channel?: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'video',
      targetName: title,
      subTargetName: channel
    });
  };

  const handleShowChannelProfile = (channel: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'channel',
      targetName: channel
    });
  };

  const handleShowDomainProfile = (domain: string) => {
    setMetricsModal({
      isOpen: true,
      type: 'domain',
      targetName: domain
    });
  };

  // Map Modal preview
  const handleOpenMapModal = (title: string, subtitle: string, embedUrl: string, extUrl: string) => {
    setMapModal({
      isOpen: true,
      title,
      subtitle,
      embedUrl,
      externalUrl: extUrl
    });
  };

  // Browser Detail Modal
  const handleOpenBrowserDetailModal = (item: TimelineItem) => {
    setBrowserModal({
      isOpen: true,
      item
    });
  };

  // Custom Place Renaming & Labeling Across Timeline Visits
  const handleRenamePlace = (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => {
    const targetTitle = targetItem.title;
    const targetLat = targetItem.lat;
    const targetLng = targetItem.lng;

    const updated = timelineData.map(item => {
      let shouldUpdate = false;
      if (applyToAllMatching) {
        if (item.id === targetItem.id) {
          shouldUpdate = true;
        } else if (targetTitle && item.title === targetTitle) {
          shouldUpdate = true;
        } else if (
          targetLat != null &&
          targetLng != null &&
          item.lat != null &&
          item.lng != null &&
          Math.abs(item.lat - targetLat) < 0.0005 &&
          Math.abs(item.lng - targetLng) < 0.0005
        ) {
          shouldUpdate = true;
        }
      } else {
        if (item.id === targetItem.id) {
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        return {
          ...item,
          title: newName,
          place_name: newName,
          category: newCategory || item.category,
          address: newAddress !== undefined ? newAddress : item.address
        };
      }
      return item;
    });

    persistTimeline(updated);
  };

  // Resolve Single or Batch Geocoding with OSM Nominatim Caching & Category Extraction
  const handleResolveGeo = async (lat: number, lng: number) => {
    try {
      const geoInfo = await reverseGeocodeItem(lat, lng);
      if (geoInfo) {
        const updated = timelineData.map(item => {
          if (
            item.lat != null &&
            item.lng != null &&
            Math.abs(item.lat - lat) < 0.0005 &&
            Math.abs(item.lng - lng) < 0.0005
          ) {
            return {
              ...item,
              title: geoInfo.name,
              place_name: geoInfo.name,
              address: geoInfo.address || item.address,
              category: geoInfo.category || item.category
            };
          }
          return item;
        });
        persistTimeline(updated);
      }
    } catch (e) {
      console.error('Failed to resolve geocode:', e);
    }
  };

  // Batch Resolve all unresolved coords across history
  const unresolvedItems = useMemo(() => {
    return timelineData.filter(
      i => i.type === 'maps' && i.lat != null && i.lng != null && isGenericPlaceName(i.title)
    );
  }, [timelineData]);

  const handleBatchResolveGeo = async () => {
    if (isGeoResolving || unresolvedItems.length === 0) return;
    setIsGeoResolving(true);
    try {
      const geoMap = await batchReverseGeocodePlaces(unresolvedItems);
      const updated = timelineData.map(item => {
        if (item.lat != null && item.lng != null) {
          const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
          const info = geoMap.get(key);
          if (info) {
            return {
              ...item,
              title: info.name,
              place_name: info.name,
              address: info.address || item.address,
              category: info.category || item.category
            };
          }
        }
        return item;
      });
      persistTimeline(updated);
    } catch (e) {
      console.error('Batch resolve error:', e);
    } finally {
      setIsGeoResolving(false);
    }
  };

  // Active Adaptive Bookmark Theme (Pink & Sea Green initially, auto by service or media)
  const activeBookmarkTheme = useMemo(() => {
    return getBookmarkAdaptiveTheme(activeBookmarkService, activeBookmarkMedia);
  }, [activeBookmarkService, activeBookmarkMedia]);

  // View Themes Configuration: color gradient & glass frost across the page
  const VIEW_THEMES: Record<ViewType, {
    containerBg: string;
    headerGlass: string;
    sidebarGlass: string;
    glowMesh: React.ReactNode;
  }> = {
    spotify: {
      // Spotify: Dynamic Emerald & Aurora Swirl
      containerBg: 'dynamic-bg-spotify text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 text-white shadow-[0_4px_25px_rgba(16,185,129,0.1)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 shadow-[4px_0_25px_rgba(16,185,129,0.1)]',
      glowMesh: (
        <>
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-500/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-teal-400/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-36 left-1/4 w-[620px] h-[620px] rounded-full bg-emerald-600/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
          <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] rounded-full bg-lime-400/30 blur-[120px] pointer-events-none animate-orb-drift-1" />
        </>
      )
    },
    youtube: {
      // YouTube: Dynamic Crimson, Ruby & Sunset Amber Swirl
      containerBg: 'dynamic-bg-youtube text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/20 text-white shadow-[0_4px_25px_rgba(239,68,68,0.12)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-red-500/20 shadow-[4px_0_25px_rgba(239,68,68,0.12)]',
      glowMesh: (
        <>
          <div className="absolute -top-32 -left-32 w-[620px] h-[620px] rounded-full bg-red-600/45 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-rose-500/40 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-36 left-1/4 w-[620px] h-[620px] rounded-full bg-red-500/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
          <div className="absolute top-1/2 left-1/3 w-[520px] h-[520px] rounded-full bg-amber-500/25 blur-[140px] pointer-events-none animate-orb-drift-1" />
        </>
      )
    },
    browser: {
      // Browser: Google Chrome 4-color blurred style (Yellow, Red, Green, Blue)
      containerBg: 'dynamic-bg-browser text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 text-white shadow-[0_4px_25px_rgba(251,188,5,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 shadow-[4px_0_25px_rgba(251,188,5,0.15)]',
      glowMesh: (
        <>
          <ChromeBlurredBackground />
          <div className="absolute -top-36 -left-36 w-[550px] h-[550px] rounded-full bg-[#FBBC05]/35 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-[#4285F4]/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
        </>
      )
    },
    timeline: {
      // Journal & Life: Crystalline Low-Poly Faceted Art Wallpaper (Dreamy Chromatic Blur)
      containerBg: 'dynamic-bg-journal text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-pink-500/20 text-white shadow-[0_4px_25px_rgba(236,72,153,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-pink-500/20 shadow-[4px_0_25px_rgba(236,72,153,0.15)]',
      glowMesh: (
        <>
          <LowPolyWallpaper blurred={true} blurAmount="38px" className="opacity-75 dark:opacity-85" />
          <div className="absolute inset-0 backdrop-blur-[24px] bg-black/10 dark:bg-black/25 pointer-events-none" />
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-pink-500/25 dark:bg-pink-600/30 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-purple-500/25 dark:bg-purple-600/30 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-36 left-1/3 w-[600px] h-[600px] rounded-full bg-cyan-500/20 dark:bg-cyan-600/25 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    maptimeline: {
      // Map Timeline: Topography Contour Elevation Map Wallpaper
      containerBg: 'dynamic-bg-maptimeline text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 text-white shadow-[0_4px_25px_rgba(16,185,129,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-emerald-500/20 shadow-[4px_0_25px_rgba(16,185,129,0.15)]',
      glowMesh: (
        <>
          <TopographyWallpaper className="opacity-85 dark:opacity-95" />
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-emerald-600/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/2 -right-32 w-[580px] h-[580px] rounded-full bg-amber-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-36 left-1/3 w-[550px] h-[550px] rounded-full bg-teal-500/40 blur-[130px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    notes: {
      // Notes: Dynamic Molten Amber, Honey & Warm Bronze
      containerBg: 'dynamic-bg-notes text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 text-white shadow-[0_4px_25px_rgba(245,158,11,0.12)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-amber-500/20 shadow-[4px_0_25px_rgba(245,158,11,0.12)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-amber-500/45 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute -bottom-40 right-1/4 w-[580px] h-[580px] rounded-full bg-orange-500/40 blur-[130px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute top-1/2 left-1/4 w-[520px] h-[520px] rounded-full bg-yellow-500/30 blur-[140px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    photos: {
      // Google Photos: Dynamic Coral, Sunset Rose & Sunrise Gold
      containerBg: 'dynamic-bg-photos text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-rose-500/20 text-white shadow-[0_4px_25px_rgba(244,63,94,0.12)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-rose-500/20 shadow-[4px_0_25px_rgba(244,63,94,0.12)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-rose-500/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute -bottom-40 right-1/4 w-[580px] h-[580px] rounded-full bg-amber-500/35 blur-[130px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute top-1/2 left-1/4 w-[520px] h-[520px] rounded-full bg-orange-500/30 blur-[140px] pointer-events-none animate-orb-drift-3" />
        </>
      )
    },
    bookmarks: {
      // Bookmarks: Initially Pink & Sea Green, Adaptive by Service/Media (e.g. Pinterest Red, mymind Orange)
      containerBg: activeBookmarkTheme.containerBgClass,
      headerGlass: activeBookmarkTheme.headerGlass,
      sidebarGlass: activeBookmarkTheme.sidebarGlass,
      glowMesh: activeBookmarkTheme.glowOrbs
    },
    box: {
      // Box Cloud: Signature Box Blue & Deep Azure Atmospheric Mesh
      containerBg: 'dynamic-bg-box text-gray-900 dark:text-gray-100',
      headerGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/20 text-white shadow-[0_4px_25px_rgba(0,97,213,0.15)]',
      sidebarGlass: 'bg-black/25 backdrop-blur-2xl border-blue-500/20 shadow-[4px_0_25px_rgba(0,97,213,0.15)]',
      glowMesh: (
        <>
          <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-blue-600/40 blur-[130px] pointer-events-none animate-orb-drift-1" />
          <div className="absolute top-1/4 -right-32 w-[580px] h-[580px] rounded-full bg-cyan-500/35 blur-[140px] pointer-events-none animate-orb-drift-2" />
          <div className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] rounded-full bg-indigo-600/35 blur-[130px] pointer-events-none animate-orb-drift-3" />
          <div className="absolute top-2/3 right-1/4 w-[480px] h-[480px] rounded-full bg-sky-400/25 blur-[120px] pointer-events-none animate-orb-drift-1" />
        </>
      )
    }
  };

  const currentTheme = VIEW_THEMES[currentView] || VIEW_THEMES.timeline;

  // Compute container background based on user's background effect & animation speed settings
  const containerBgClass = useMemo(() => {
    if (settings.backgroundEffect === 'static') {
      return isAmoled ? 'bg-[#121214] text-[#fdfcf9]' : 'bg-[#fdfcf9] text-[#1a1a1a]';
    }
    const speedStyle =
      settings.animationSpeed === 'relaxed'
        ? '[animation-duration:32s]'
        : settings.animationSpeed === 'fast'
        ? '[animation-duration:11s]'
        : '[animation-duration:18s]';
    return `${currentTheme.containerBg} ${speedStyle}`;
  }, [settings.backgroundEffect, settings.animationSpeed, currentTheme.containerBg, isAmoled]);

  return (
    <div className={`h-[100dvh] w-full min-h-0 flex flex-col text-[#1a1a1a] dark:text-[#fdfcf9] overflow-hidden font-['Inter',sans-serif] relative transition-colors duration-700 ${containerBgClass}`}>
      {/* Ambient view color glow mesh across the entire page (toggleable in Settings) */}
      {settings.showFloatingOrbs && settings.backgroundEffect !== 'static' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {currentTheme.glowMesh}
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden z-10">
        {/* Navigation Sidebar: Fixed Editorial Navigation */}
        <Sidebar
          currentView={currentView}
          onSetView={setCurrentView}
          importedFilesCount={importedFiles.length}
          onOpenImportedFiles={() => setIsImportedFilesModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isSettingsOpen={isSettingsModalOpen}
          onBatchResolveGeo={handleBatchResolveGeo}
          unresolvedCount={unresolvedItems.length}
          isGeoResolving={isGeoResolving}
          isAmoled={true}
        />

        {/* View Router */}
        <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-transparent">
          {currentView === 'timeline' && (
            <JournalView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('journal')}
              onImportClick={() => handleOpenImportFor('journal')}
              dateRange={viewDateRanges.journal}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, journal: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('journal', 'range')}
              items={journalItems}
              events={journalEvents}
              dailyNote={currentDailyNote}
              onSaveDailyNote={handleSaveDailyNote}
              onOpenAddEvent={() => setIsEventModalOpen(true)}
              onDeleteEvent={handleDeleteEvent}
              onSelectBrowser={(item) => {
                setSelectedBrowserItem(item);
                setCurrentView('browser');
              }}
              onShowTrackProfile={handleShowTrackProfile}
              onShowArtistProfile={handleShowArtistProfile}
              onShowVideoProfile={handleShowVideoProfile}
              onShowChannelProfile={handleShowChannelProfile}
              onShowDomainProfile={handleShowDomainProfile}
              onOpenMapModal={handleOpenMapModal}
              onResolveGeo={handleResolveGeo}
              allTimelineData={timelineData}
              allEvents={calendarEvents}
              dailyNotesMap={dailyNotesMap}
              onSaveSpecificDailyNote={handleSaveSpecificDailyNote}
              onSelectPhoto={handleSelectPhoto}
              onAddEventForDate={(dateKey) => {
                const [y, m, d] = dateKey.split('-').map(Number);
                if (y && m && d) {
                  setCurrentDate(new Date(y, m - 1, d));
                }
                setIsEventModalOpen(true);
              }}
              onJumpToDate={handleJumpToDate}
            />
          )}

          {currentView === 'maptimeline' && (
            <MapTimelineView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('maps')}
              onImportClick={() => handleOpenImportFor('maps')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.maps}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, maps: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('maps', 'range')}
              items={mapTimelineItems}
              processedData={timelineData}
              dateIndexMap={dateIndexMap}
              onOpenMapModal={handleOpenMapModal}
              onResolveGeo={handleResolveGeo}
              onRenamePlace={handleRenamePlace}
              onBatchResolveUnknown={handleBatchResolveGeo}
              onShowPlaceProfile={(item) =>
                setMetricsModal({
                  isOpen: true,
                  type: 'place',
                  targetName: item.title,
                  subTargetName: item.subtitle || item.address || ''
                })
              }
            />
          )}

          {currentView === 'spotify' && (
            <SpotifyView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('spotify')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.spotify}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, spotify: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('spotify', 'range')}
              processedData={timelineData}
              dateIndexMap={dateIndexMap}
              onShowTrackProfile={handleShowTrackProfile}
              onShowArtistProfile={handleShowArtistProfile}
              onImportClick={() => handleOpenImportFor('spotify')}
            />
          )}

          {currentView === 'youtube' && (
            <YouTubeView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('youtube')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.youtube}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, youtube: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('youtube', 'range')}
              processedData={timelineData}
              dateIndexMap={dateIndexMap}
              onShowVideoProfile={handleShowVideoProfile}
              onShowChannelProfile={handleShowChannelProfile}
              onImportClick={() => handleOpenImportFor('youtube')}
            />
          )}

          {currentView === 'browser' && (
            <BrowserView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('browser')}
              onImportClick={() => handleOpenImportFor('browser')}
              onJumpToDate={handleJumpToDate}
              dateRange={viewDateRanges.browser}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, browser: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('browser', 'range')}
              processedData={timelineData}
              dateIndexMap={dateIndexMap}
              onShowDomainProfile={handleShowDomainProfile}
              selectedBrowserItem={selectedBrowserItem}
              onSelectBrowserItem={setSelectedBrowserItem}
              bookmarkNotes={bookmarkNotes}
              onSaveBookmarkNote={handleSaveBookmarkNote}
              bookmarkTags={bookmarkTags}
              onAddBookmarkTag={handleAddBookmarkTag}
              onRemoveBookmarkTag={handleRemoveBookmarkTag}
              sessionSnapshots={sessionSnapshots}
              onSaveSessionSnapshot={handleSaveSessionSnapshot}
              onLaunchAuthenticatedSession={captureAuthenticatedTab}
              onCaptureActiveScreen={captureActiveScreen}
              onOpenDetailModal={handleOpenBrowserDetailModal}
            />
          )}

          {currentView === 'notes' && (
            <NotesView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('notes')}
              onImportClick={() => handleOpenImportFor('notes')}
              dateRange={viewDateRanges.notes}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, notes: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('notes', 'range')}
              dailyNotesMap={dailyNotesMap}
              onSaveDailyNote={handleSaveSpecificDailyNote}
              onJumpToDate={handleJumpToDate}
              bookmarkNotes={bookmarkNotes}
              timelineData={timelineData}
            />
          )}

          {currentView === 'photos' && (
            <PhotosView
              photos={photosList}
              onMountNewPhotos={handleMountNewPhotos}
              onClearPhotos={handleClearPhotos}
              onSelectPhoto={handleSelectPhoto}
              onToggleFavorite={handleTogglePhotoFavorite}
              onJumpToJournal={(d) => {
                setCurrentDate(d);
                setCurrentView('timeline');
              }}
              onJumpToMap={() => {
                setCurrentView('maptimeline');
              }}
              onOpenCalendar={() => handleOpenCalendarFor('photos')}
              currentDate={currentDate}
              dateRange={viewDateRanges.photos}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, photos: null }))}
            />
          )}

          {currentView === 'bookmarks' && (
            <BookmarksView
              currentDate={currentDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onSetToday={handleSetToday}
              onOpenCalendar={() => handleOpenCalendarFor('bookmarks')}
              onImportClick={() => setIsRaindropModalOpen(true)}
              dateRange={viewDateRanges.bookmarks}
              onClearDateRange={() => setViewDateRanges(prev => ({ ...prev, bookmarks: null }))}
              onOpenDateRangePicker={() => handleOpenCalendarFor('bookmarks', 'range')}
              timelineData={timelineData}
              bookmarkNotes={bookmarkNotes}
              onSaveBookmarkNote={handleSaveBookmarkNote}
              bookmarkTags={bookmarkTags}
              onAddBookmarkTag={handleAddBookmarkTag}
              onRemoveBookmarkTag={handleRemoveBookmarkTag}
              sessionSnapshots={sessionSnapshots}
              onOpenSyncModal={handleOpenBookmarkSync}
              onApplySyncedData={handleApplyBookmarkData}
              onActiveServiceChange={(service, media) => {
                setActiveBookmarkService(service);
                setActiveBookmarkMedia(media);
              }}
              onDeleteItem={(id) => {
                const next = timelineData.filter(i => i.id !== id);
                persistTimeline(next);
              }}
            />
          )}

          {currentView === 'box' && (
            <BoxCloudView
              onImportTimelineItems={(newItems, sourceName) => {
                const next = [...newItems, ...timelineData];
                persistTimeline(next);
                setImportedFiles(prev => [
                  {
                    id: `box_file_${Date.now()}`,
                    fileName: sourceName,
                    fileSize: 'Cloud Sync',
                    fileType: 'Box Cloud Storage',
                    importDate: new Date().toLocaleDateString(),
                    recordCount: newItems.length
                  },
                  ...prev
                ]);
              }}
              onNavigateToView={(view) => setCurrentView(view as ViewType)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <CalendarModal
        isOpen={calendarModal.isOpen}
        onClose={() => setCalendarModal(prev => ({ ...prev, isOpen: false }))}
        currentDate={currentDate}
        onSelectDate={setCurrentDate}
        dateRange={viewDateRanges[calendarModal.mode]}
        onSelectDateRange={(range) =>
          setViewDateRanges(prev => ({ ...prev, [calendarModal.mode]: range }))
        }
        initialTab={calendarModal.initialTab}
        dateIndexMap={dateIndexMap}
        mode={calendarModal.mode}
        dailyNotesMap={dailyNotesMap}
        calendarEvents={calendarEvents}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSaveEvent={handleAddEvent}
        dateKey={currentDateKey}
      />

      <ImportModal
        isOpen={importModal.isOpen}
        onClose={() => setImportModal(prev => ({ ...prev, isOpen: false }))}
        onImportFiles={handleImportFiles}
        mode={importModal.mode}
        onImportNotes={handleImportNotes}
        onOpenRaindropSync={() => handleOpenBookmarkSync('raindrop')}
        onMountPhotosFolder={async () => {
          setImportModal(prev => ({ ...prev, isOpen: false }));
          const res = await promptNativeDirectoryMount();
          if (res) {
            handleMountNewPhotos(res.items, res.folderName);
            setCurrentView('photos');
          }
        }}
      />

      <BookmarkSyncModal
        isOpen={isRaindropModalOpen}
        onClose={() => setIsRaindropModalOpen(false)}
        onApplySyncedData={handleApplyBookmarkData}
        initialService={bookmarkModalService}
      />

      <ImportedFilesModal
        isOpen={isImportedFilesModalOpen}
        onClose={() => setIsImportedFilesModalOpen(false)}
        importedFiles={importedFiles}
        onDeleteFile={handleDeleteImportedFile}
        onClearAllData={handleClearAllData}
      />

      <MetricsModal
        isOpen={metricsModal.isOpen}
        onClose={() => setMetricsModal(prev => ({ ...prev, isOpen: false }))}
        type={metricsModal.type}
        title={metricsModal.targetName}
        subtitle={metricsModal.subTargetName}
        processedData={timelineData}
        onJumpToDate={handleJumpToDate}
      />

      <MapOverleafModal
        isOpen={mapModal.isOpen}
        onClose={() => setMapModal(prev => ({ ...prev, isOpen: false }))}
        title={mapModal.title}
        subtitle={mapModal.subtitle}
        embedUrl={mapModal.embedUrl}
        externalUrl={mapModal.externalUrl}
      />

      <BrowserLeafletModal
        isOpen={browserModal.isOpen}
        onClose={() => setBrowserModal({ isOpen: false, item: null })}
        url={browserModal.item?.url}
        title={browserModal.item?.title}
        domain={browserModal.item?.domain}
        timestamp={browserModal.item?.ts}
        bookmarkNotes={bookmarkNotes}
        onSaveBookmarkNote={handleSaveBookmarkNote}
        sessionSnapshots={sessionSnapshots}
        onSaveSessionSnapshot={handleSaveSessionSnapshot}
        onLaunchAuthenticatedSession={captureAuthenticatedTab}
        onCaptureActiveScreen={captureActiveScreen}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        totalEventsCount={timelineData.length}
        itemsByType={itemsByType}
        notesCount={Object.keys(dailyNotesMap).length}
        eventsCount={calendarEvents.length}
        importedFilesCount={importedFiles.length}
        onClearDataset={handleClearDataset}
        onClearAllData={handleClearAllData}
        onExportFullBackup={handleExportFullBackup}
        onImportBackup={handleImportBackup}
        onLoadDemoData={handleLoadDemoData}
        onBatchResolveGeo={handleBatchResolveGeo}
        unresolvedCount={unresolvedItems.length}
        isGeoResolving={isGeoResolving}
        onOpenRaindropSync={() => setIsRaindropModalOpen(true)}
        onOpenImportedFiles={() => setIsImportedFilesModalOpen(true)}
        isAmoled={isAmoled}
        onToggleAmoled={handleToggleTheme}
      />

      <PhotoLightboxModal
        isOpen={isPhotoLightboxOpen}
        onClose={() => setIsPhotoLightboxOpen(false)}
        photo={selectedPhoto}
        allPhotos={photosList}
        onSelectPhoto={setSelectedPhoto}
        onToggleFavorite={handleTogglePhotoFavorite}
        onUpdateDescription={handleUpdatePhotoDescription}
        onJumpToJournal={(d) => {
          setCurrentDate(d);
          setCurrentView('timeline');
        }}
        onJumpToMap={() => {
          setCurrentView('maptimeline');
        }}
      />
    </div>
  );
};
export default App;
