import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TimelineItem, CalendarEvent, ImportedFileRecord, ViewType, MetricType, DateRange } from './types';
import { getDemoTimelineData } from './utils/demoData';
import { parseUploadedFiles, reverseGeocodeLocation, reverseGeocodeItem, batchReverseGeocodePlaces, isGenericPlaceName } from './utils/dataParser';
import { dbGet, dbSet, dbDelete } from './utils/storage';
import { Header } from './components/Header';
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

export const App: React.FC = () => {
  // Theme state
  const [isAmoled, setIsAmoled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mylife_amoled') !== 'false';
    } catch {
      return true;
    }
  });

  // Current selected Date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Current active navigation view
  const [currentView, setCurrentView] = useState<ViewType>('timeline');

  // Sidebar collapse & mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Individualized Date Range state per view
  const [viewDateRanges, setViewDateRanges] = useState<Record<CalendarModalMode, DateRange | null>>({
    all: null,
    journal: null,
    spotify: null,
    youtube: null,
    maps: null,
    browser: null,
    notes: null
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

  // Search selection handler
  const handleSelectSearchResult = (dateStr: string, item: TimelineItem) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y && m && d) {
      setCurrentDate(new Date(y, m - 1, d));
    }
    if (item.type === 'spotify') {
      setCurrentView('spotify');
    } else if (item.type === 'youtube') {
      setCurrentView('youtube');
    } else if (item.type === 'maps') {
      setCurrentView('maptimeline');
    } else if (item.type === 'browser') {
      setCurrentView('browser');
      setSelectedBrowserItem(item);
    } else {
      setCurrentView('timeline');
    }
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
      const { newItems, fileBreakdowns } = await parseUploadedFiles(files, () => {});
      if (newItems.length > 0) {
        // Merge with existing items, deduping by id
        const existingMap = new Map<string, TimelineItem>();
        timelineData.forEach(item => existingMap.set(item.id, item));
        newItems.forEach(item => existingMap.set(item.id, item));

        const merged = Array.from(existingMap.values());
        persistTimeline(merged);
        setImportedFiles(prev => [...fileBreakdowns, ...prev]);

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

  return (
    <div className="h-[100dvh] w-full min-h-0 flex flex-col bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* Universal Simplified Header with Global Search */}
      <Header
        currentView={currentView}
        isAmoled={isAmoled}
        onToggleAmoled={() => setIsAmoled(!isAmoled)}
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setIsMobileSidebarOpen(!isMobileSidebarOpen);
          } else {
            setIsSidebarCollapsed(!isSidebarCollapsed);
          }
        }}
        totalEventsCount={timelineData.length}
        timelineData={timelineData}
        dailyNotesMap={dailyNotesMap}
        calendarEvents={calendarEvents}
        onSelectView={setCurrentView}
        onJumpToDate={handleJumpToDate}
        onSelectSearchResult={handleSelectSearchResult}
        onOpenMetricsModal={setMetricsModal}
        onOpenBrowserModal={handleOpenBrowserDetailModal}
        onOpenMapModal={handleOpenMapModal}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSetView={setCurrentView}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          importedFilesCount={importedFiles.length}
          onOpenImportedFiles={() => setIsImportedFilesModalOpen(true)}
          onBatchResolveGeo={handleBatchResolveGeo}
          unresolvedCount={unresolvedItems.length}
          isGeoResolving={isGeoResolving}
        />

        {/* View Router */}
        <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-white dark:bg-black">
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
    </div>
  );
};
export default App;
