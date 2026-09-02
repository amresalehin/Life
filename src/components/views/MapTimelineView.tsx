import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MapPin,
  Route,
  Columns2,
  List,
  Maximize2,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Building2,
  Compass,
  Globe,
  Upload,
  Search,
  X,
  Layers,
  Eye,
  EyeOff,
  Download,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { TimelineItem, DateRange } from '../../types';
import { LeafletMap } from '../LeafletMap';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  formatDuration,
  formatTime,
  getPlaceCategory,
  isGenericPlaceName
} from '../../utils/dataParser';
import { PlaceInspector } from '../maps/PlaceInspector';
import { PlaceRenameModal } from '../maps/PlaceRenameModal';
import { ResolvedPlacesLogModal } from '../maps/ResolvedPlacesLogModal';
import { MapDataExportModal } from '../maps/MapDataExportModal';
import { TimelineActivityHistogram } from '../maps/TimelineActivityHistogram';
import { TimelineDayView } from '../maps/TimelineDayView';
import { TimelinePlacesTab } from '../maps/TimelinePlacesTab';
import { TimelineCitiesTab, extractCityName } from '../maps/TimelineCitiesTab';
import { TimelineTripsTab } from '../maps/TimelineTripsTab';
import { TimelineInsightsTab } from '../maps/TimelineInsightsTab';
import { TimelineWorldTab } from '../maps/TimelineWorldTab';
import {
  TimelineSearchFilterBar,
  MapTimelineFilterState,
  INITIAL_FILTER_STATE
} from '../maps/TimelineSearchFilterBar';

export type GoogleTimelineTab = 'day' | 'trips' | 'insights' | 'places' | 'cities' | 'world';

interface MapTimelineViewProps {
  currentDate: Date;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onSetToday?: () => void;
  onOpenCalendar?: () => void;
  onJumpToDate?: (date: Date) => void;
  onImportClick?: () => void;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
  onOpenDateRangePicker?: () => void;
  items: TimelineItem[];
  processedData?: TimelineItem[];
  dateIndexMap?: Map<string, TimelineItem[]>;
  onOpenMapModal?: (title: string, subtitle: string, embedUrl: string, extUrl: string) => void;
  onResolveGeo?: (lat: number, lng: number) => void;
  onShowPlaceProfile?: (item: TimelineItem) => void;
  onRenamePlace?: (
    targetItem: TimelineItem,
    newName: string,
    applyToAllMatching: boolean,
    newCategory?: string,
    newAddress?: string
  ) => void;
  onBatchResolveUnknown?: () => Promise<void> | void;
}

export const MapTimelineView: React.FC<MapTimelineViewProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onSetToday,
  onOpenCalendar,
  onJumpToDate,
  onImportClick,
  dateRange,
  onClearDateRange,
  onOpenDateRangePicker,
  items,
  processedData,
  dateIndexMap,
  onOpenMapModal,
  onResolveGeo,
  onShowPlaceProfile,
  onRenamePlace,
  onBatchResolveUnknown
}) => {
  // Google Maps Timeline Primary Tabs (Day, Trips, Insights, Places, Cities, World)
  const [activeTab, setActiveTab] = useState<GoogleTimelineTab>('day');
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showHistogram, setShowHistogram] = useState<boolean>(true);

  // Selected place / item for map & inspector
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] = useState<TimelineItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // Custom Place Renaming Modal
  const [renameModalItem, setRenameModalItem] = useState<TimelineItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);

  // Resolved Places Log & Map Data Export Modals
  const [isPlacesLogOpen, setIsPlacesLogOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const handleOpenRenameModal = (item: TimelineItem) => {
    setRenameModalItem(item);
    setIsRenameModalOpen(true);
  };

  const handleCloseRenameModal = () => {
    setIsRenameModalOpen(false);
    setRenameModalItem(null);
  };

  const handleSaveRenameModal = (newName: string, applyToAllMatching: boolean, category?: string, address?: string) => {
    if (renameModalItem && onRenamePlace) {
      onRenamePlace(renameModalItem, newName, applyToAllMatching, category, address);
      // Also update inspected item if active
      if (inspectedItem && (inspectedItem.id === renameModalItem.id || inspectedItem.title === renameModalItem.title)) {
        setInspectedItem({
          ...inspectedItem,
          title: newName,
          place_name: newName,
          category: category || inspectedItem.category,
          address: address !== undefined ? address : inspectedItem.address
        });
      }
    }
    handleCloseRenameModal();
  };

  // Unified Global Filter State across all Timeline tabs
  const [filterState, setFilterState] = useState<MapTimelineFilterState>(INITIAL_FILTER_STATE);

  const handleFilterChange = (updates: Partial<MapTimelineFilterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilterState(INITIAL_FILTER_STATE);
  };

  // Active sub-filters inside Places and Cities tabs
  const selectedPlaceCategory = filterState.category !== 'all' ? filterState.category : null;
  const setSelectedPlaceCategory = (cat: string | null) => {
    handleFilterChange({ category: cat || 'all' });
  };

  const selectedCityName = filterState.selectedCity !== 'all' ? filterState.selectedCity : null;
  const setSelectedCityName = (city: string | null) => {
    handleFilterChange({ selectedCity: city || 'all' });
  };

  // Local place notes & custom tags
  const [placeNotes, setPlaceNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('maps_place_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [placeTags, setPlaceTags] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('maps_place_tags');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSavePlaceNote = (key: string, note: string) => {
    setPlaceNotes(prev => {
      const updated = { ...prev, [key]: note };
      try {
        localStorage.setItem('maps_place_notes', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleAddPlaceTag = (key: string, tag: string) => {
    setPlaceTags(prev => {
      const existing = prev[key] || [];
      if (existing.includes(tag)) return prev;
      const updated = { ...prev, [key]: [...existing, tag] };
      try {
        localStorage.setItem('maps_place_tags', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleRemovePlaceTag = (key: string, tag: string) => {
    setPlaceTags(prev => {
      const existing = prev[key] || [];
      const updated = { ...prev, [key]: existing.filter(t => t !== tag) };
      try {
        localStorage.setItem('maps_place_tags', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dayKey = getDateKey(currentDate);

  // All maps items in dataset
  const allMapsInDataset = useMemo(() => {
    return (processedData || items).filter(s => s.type === 'maps');
  }, [processedData, items]);

  // Dynamically compute available distinct years and top visited cities
  const { availableYears, topCities } = useMemo(() => {
    const yearsSet = new Set<string>();
    const cityMap = new Map<string, number>();

    allMapsInDataset.forEach(i => {
      if (i.ts) {
        yearsSet.add(i.ts.slice(0, 4));
      }
      const city = extractCityName(i);
      if (city && city !== 'Other Locations') {
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }
    });

    const years = Array.from(yearsSet).filter(Boolean).sort((a, b) => b.localeCompare(a));
    const cities = Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    return { availableYears: years, topCities: cities };
  }, [allMapsInDataset]);

  // Compute Place visit counts across all history for badges
  const placeVisitCounts = useMemo(() => {
    const map = new Map<string, number>();
    allMapsInDataset.forEach(i => {
      if (i.title) {
        map.set(i.title, (map.get(i.title) || 0) + 1);
      }
    });
    return map;
  }, [allMapsInDataset]);

  // Unified Multi-Dimensional Filtered Dataset
  const filteredDataset = useMemo(() => {
    let list = allMapsInDataset;
    const q = filterState.searchQuery.trim().toLowerCase();

    return list.filter(item => {
      // 1. Omnisearch Query (title, address, city, notes, tags, dates, mode, category)
      if (q) {
        const title = (item.title || '').toLowerCase();
        const subtitle = (item.subtitle || '').toLowerCase();
        const address = (item.address || '').toLowerCase();
        const city = extractCityName(item).toLowerCase();
        const mode = (item.activityType || item.travelMode || '').toLowerCase();
        const catInfo = getPlaceCategory(item);
        const cat = (item.category || catInfo.id || catInfo.label).toLowerCase();
        const dateStr = item.ts ? item.ts.slice(0, 10) : '';
        const notes = (placeNotes[item.title || ''] || '').toLowerCase();
        const tags = (placeTags[item.title || ''] || []).join(' ').toLowerCase();

        const matches =
          title.includes(q) ||
          subtitle.includes(q) ||
          address.includes(q) ||
          city.includes(q) ||
          mode.includes(q) ||
          cat.includes(q) ||
          dateStr.includes(q) ||
          notes.includes(q) ||
          tags.includes(q);

        if (!matches) return false;
      }

      // 2. Category Filter
      if (filterState.category && filterState.category !== 'all') {
        const cat = getPlaceCategory(item);
        if (cat.id !== filterState.category) return false;
      }

      // 3. Activity / Mode Filter
      if (filterState.activityMode && filterState.activityMode !== 'all') {
        if (filterState.activityMode === 'places_only' && item.isRoute) return false;
        if (filterState.activityMode === 'trips_only' && !item.isRoute && !item.activityType && !item.travelMode) return false;
        if (filterState.activityMode === 'driving') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!item.isRoute || (!m.includes('driv') && !m.includes('car') && !m.includes('vehic'))) return false;
        }
        if (filterState.activityMode === 'walking') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('walk') && !m.includes('foot') && !m.includes('run')) return false;
        }
        if (filterState.activityMode === 'transit') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('transit') && !m.includes('train') && !m.includes('bus') && !m.includes('subway')) return false;
        }
        if (filterState.activityMode === 'flight') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('flight') && !m.includes('plane')) return false;
        }
        if (filterState.activityMode === 'biking') {
          const m = (item.activityType || item.travelMode || item.title || '').toLowerCase();
          if (!m.includes('bike') && !m.includes('cycl')) return false;
        }
      }

      // 4. Year Filter
      if (filterState.selectedYear && filterState.selectedYear !== 'all') {
        const itemYear = item.ts ? item.ts.slice(0, 4) : '';
        if (itemYear !== filterState.selectedYear) return false;
      }

      // 5. City Filter
      if (filterState.selectedCity && filterState.selectedCity !== 'all') {
        const itemCity = extractCityName(item);
        if (itemCity !== filterState.selectedCity) return false;
      }

      // 6. Attribute / Status Filter
      if (filterState.attribute === 'resolved' && isGenericPlaceName(item.title)) return false;
      if (filterState.attribute === 'unresolved' && !isGenericPlaceName(item.title)) return false;
      if (filterState.attribute === 'with_notes') {
        const hasNote = !!placeNotes[item.title || ''];
        const hasTags = (placeTags[item.title || ''] || []).length > 0;
        if (!hasNote && !hasTags) return false;
      }
      if (filterState.attribute === 'frequent') {
        const count = placeVisitCounts.get(item.title || '') || 0;
        if (count < 3) return false;
      }

      return true;
    });
  }, [allMapsInDataset, filterState, placeNotes, placeTags, placeVisitCounts]);

  // Day items for current selected date (filtered by active global filter state)
  const dayItems = useMemo(() => {
    if (dateRange) {
      return filteredDataset.filter(s => {
        const k = s.ts.slice(0, 10);
        return k >= dateRange.startDate && k <= dateRange.endDate;
      });
    }
    return filteredDataset.filter(s => s.ts.slice(0, 10) === dayKey);
  }, [dateRange, filteredDataset, dayKey]);

  const formattedDayTitle = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Map items to feed into the Leaflet Map depending on active tab and active filter
  // Crucial: strictly excludes route lines in Places and Cities tab unless explicitly toggled
  const { mapDisplayItems, activeFilterLabel } = useMemo(() => {
    if (activeTab === 'day') {
      const label = dateRange
        ? `Filtered: ${dateRange.startDate} to ${dateRange.endDate} (${dayItems.length} locations)`
        : `Day: ${formattedDayTitle} (${dayItems.length} locations)`;
      return { mapDisplayItems: dayItems, activeFilterLabel: label };
    }

    if (activeTab === 'places') {
      const placesOnly = filteredDataset.filter(i => !i.isRoute);
      const itemsToRender = filterState.showRoutesInPlaces
        ? filteredDataset
        : placesOnly;

      const catLabel = selectedPlaceCategory ? ` (${selectedPlaceCategory.toUpperCase()})` : '';
      return {
        mapDisplayItems: itemsToRender,
        activeFilterLabel: `Places${catLabel}: ${placesOnly.length} locations`
      };
    }

    if (activeTab === 'cities') {
      const placesInCity = selectedCityName
        ? filteredDataset.filter(i => !i.isRoute && extractCityName(i) === selectedCityName)
        : filteredDataset.filter(i => !i.isRoute);

      let itemsToRender = placesInCity;
      if (filterState.showRoutesInCities) {
        if (selectedCityName) {
          const cityRoutes = filteredDataset.filter(
            i =>
              i.isRoute &&
              (extractCityName(i) === selectedCityName ||
                extractCityName({ address: i.origin?.address } as any) === selectedCityName ||
                extractCityName({ address: i.destination?.address } as any) === selectedCityName)
          );
          itemsToRender = [...placesInCity, ...cityRoutes];
        } else {
          itemsToRender = filteredDataset;
        }
      }

      const cityLabel = selectedCityName ? ` in ${selectedCityName}` : '';
      return {
        mapDisplayItems: itemsToRender,
        activeFilterLabel: `Cities: ${placesInCity.length} places${cityLabel}`
      };
    }

    if (activeTab === 'trips') {
      const tripsOnly = filteredDataset.filter(i => i.isRoute || i.activityType || i.travelMode);
      return {
        mapDisplayItems: tripsOnly,
        activeFilterLabel: `Trips & Pathways (${tripsOnly.length} segments)`
      };
    }

    if (activeTab === 'insights') {
      const places = filteredDataset.filter(i => !i.isRoute);
      return {
        mapDisplayItems: places,
        activeFilterLabel: `Insights (${places.length} places)`
      };
    }

    // World tab
    const worldPlaces = filteredDataset.filter(i => !i.isRoute);
    return {
      mapDisplayItems: worldPlaces,
      activeFilterLabel: `World (${worldPlaces.length} spots)`
    };
  }, [
    activeTab,
    dayItems,
    filteredDataset,
    selectedPlaceCategory,
    selectedCityName,
    filterState.showRoutesInPlaces,
    filterState.showRoutesInCities,
    dateRange,
    formattedDayTitle
  ]);

  // Combined key that changes when the user switches tabs, dates, categories, or cities to trigger smooth fitBounds
  const fitKey = `${activeTab}_${dayKey}_${dateRange?.startDate || ''}_${dateRange?.endDate || ''}_${selectedPlaceCategory || ''}_${selectedCityName || ''}_${mapDisplayItems.length}`;

  const handleSelectWaypoint = (item: TimelineItem) => {
    setSelectedItemId(item.id);
    let coord: [number, number] | null = null;
    if (item.lat != null && item.lng != null && !isNaN(Number(item.lat)) && !isNaN(Number(item.lng))) {
      coord = [Number(item.lat), Number(item.lng)];
    } else if (
      item.origin?.lat != null &&
      item.origin?.lng != null &&
      !isNaN(Number(item.origin.lat)) &&
      !isNaN(Number(item.origin.lng))
    ) {
      coord = [Number(item.origin.lat), Number(item.origin.lng)];
    } else if (
      item.destination?.lat != null &&
      item.destination?.lng != null &&
      !isNaN(Number(item.destination.lat)) &&
      !isNaN(Number(item.destination.lng))
    ) {
      coord = [Number(item.destination.lat), Number(item.destination.lng)];
    }
    if (coord) {
      setSelectedCoord([coord[0], coord[1]]);
    }
  };

  const handleOpenInspector = (item: TimelineItem) => {
    setInspectedItem(item);
    setIsInspectorOpen(true);
    handleSelectWaypoint(item);
    if (onShowPlaceProfile) {
      onShowPlaceProfile(item);
    }
  };

  const handleHistogramSelectDate = (date: Date) => {
    if (onJumpToDate) {
      onJumpToDate(date);
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-white dark:bg-[#121212] flex flex-col min-h-0">
      {/* 1. Google Maps Timeline Top App Bar */}
      <header className="px-4 py-2.5 bg-white dark:bg-[#181818] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0 select-none z-20">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1A73E8] flex items-center justify-center shadow-xs">
            <MapPin className="w-5 h-5 fill-[#1A73E8] text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 leading-tight">
              <span>Google Maps Timeline</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium">
              {allMapsInDataset.length.toLocaleString()} location events recorded
            </p>
          </div>
        </div>

        {/* Center: Google Maps Timeline Navigation Tabs (Screenshot 1, 2, 3, 4) */}
        <nav className="hidden md:flex items-center p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 text-xs font-bold">
          {(
            [
              { id: 'day', label: 'Day', icon: CalendarIcon },
              { id: 'trips', label: 'Trips', icon: Route },
              { id: 'insights', label: 'Insights', icon: BarChart2 },
              { id: 'places', label: 'Places', icon: ShoppingBag },
              { id: 'cities', label: 'Cities', icon: Building2 },
              { id: 'world', label: 'World', icon: Globe }
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-gray-800 text-[#1A73E8] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1A73E8]' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Date Navigation & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Day Navigation (active when on Day tab) */}
          {activeTab === 'day' && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-0.5 rounded-xl border border-gray-200/80 dark:border-gray-800 text-xs font-bold">
              <button
                onClick={onPrevDate}
                className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCalendar}
                className="px-2 py-0.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-200 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Pick Date"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#1A73E8]" />
                <span className="hidden sm:inline">{formattedDayTitle}</span>
              </button>

              <button
                onClick={onNextDate}
                className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {onSetToday && (
                <button
                  onClick={onSetToday}
                  className="px-2 py-0.5 bg-[#1A73E8] text-white hover:bg-blue-600 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer ml-0.5"
                >
                  Today
                </button>
              )}
            </div>
          )}

          {/* Resolved Places & Geocoding Log */}
          <button
            onClick={() => setIsPlacesLogOpen(true)}
            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/80 transition-colors cursor-pointer flex items-center gap-1.5"
            title="View Resolved Places Log & Coordinates"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Places Log</span>
          </button>

          {/* Export Resolved Map Data */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Export Map Data as GeoJSON, KML, CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Import Takeout Maps button */}
          {onImportClick && (
            <button
              onClick={onImportClick}
              className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#1A73E8] rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer flex items-center gap-1"
              title="Import Google Takeout Location History"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Import Takeout</span>
            </button>
          )}

          {/* Layout Mode Toggles */}
          <div className="hidden sm:flex items-center p-0.5 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-gray-800 text-[#1A73E8] shadow-xs'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Split View"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-800 text-[#1A73E8] shadow-xs'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Full List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-gray-800 text-[#1A73E8] shadow-xs'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Full Map"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Segmented Navigation Bar */}
      <nav className="md:hidden flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar gap-1 text-xs font-bold">
        {(
          [
            { id: 'day', label: 'Day' },
            { id: 'trips', label: 'Trips' },
            { id: 'insights', label: 'Insights' },
            { id: 'places', label: 'Places' },
            { id: 'cities', label: 'Cities' },
            { id: 'world', label: 'World' }
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#1A73E8] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Global Search & Multi-Dimensional Filter Toolbar across all Tabs */}
      <TimelineSearchFilterBar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalCount={allMapsInDataset.length}
        filteredCount={filteredDataset.length}
        availableYears={availableYears}
        topCities={topCities}
        activeTab={activeTab}
      />

      {/* 2. Main Content Split View (Sidebar Panel + Full Map) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
        {/* Left / Bottom Panel: Google Maps Timeline Views */}
        {viewMode !== 'map' && (
          <div
            className={`overflow-y-auto overscroll-contain min-h-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] relative shrink-0 transition-all ${
              viewMode === 'list'
                ? 'w-full h-full max-w-5xl mx-auto p-4'
                : isInspectorOpen
                ? 'w-full md:w-[390px] lg:w-[430px] h-1/2 md:h-full'
                : 'w-full md:w-[440px] lg:w-[480px] h-1/2 md:h-full'
            }`}
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
          >
            {/* SUB-VIEW 1: DAY TIMELINE (With Activity Histogram) */}
            {activeTab === 'day' && (
              <div className="flex flex-col h-full">
                {/* Monthly Activity Histogram Bar Chart (Screenshot 4) */}
                {showHistogram && (
                  <TimelineActivityHistogram
                    currentDate={currentDate}
                    onSelectDate={handleHistogramSelectDate}
                    dateIndexMap={dateIndexMap}
                    allMapsItems={filteredDataset}
                  />
                )}

                <div className="p-4 flex-1">
                  <TimelineDayView
                    currentDate={currentDate}
                    items={dayItems}
                    selectedItemId={selectedItemId}
                    onSelectItem={handleSelectWaypoint}
                    onOpenInspector={handleOpenInspector}
                    onOpenMapModal={onOpenMapModal}
                    placeVisitCounts={placeVisitCounts}
                    onImportClick={onImportClick}
                    onRenamePlace={onRenamePlace}
                    onResolveGeo={onResolveGeo}
                    onOpenRenameModal={handleOpenRenameModal}
                  />
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: PLACES TAB (Screenshot 1 Category Cards) */}
            {activeTab === 'places' && (
              <div className="p-4">
                <TimelinePlacesTab
                  items={filteredDataset}
                  onSelectPlace={handleSelectWaypoint}
                  onOpenInspector={handleOpenInspector}
                  onOpenMapModal={onOpenMapModal}
                  selectedCategory={selectedPlaceCategory}
                  onSelectCategory={setSelectedPlaceCategory}
                  onRenamePlace={onRenamePlace}
                  onResolveGeo={onResolveGeo}
                  onBatchResolveUnknown={onBatchResolveUnknown}
                  onOpenRenameModal={handleOpenRenameModal}
                />
              </div>
            )}

            {/* SUB-VIEW 3: CITIES TAB (Screenshot 1, 3) */}
            {activeTab === 'cities' && (
              <div className="p-4">
                <TimelineCitiesTab
                  items={filteredDataset}
                  onSelectPlace={handleSelectWaypoint}
                  onOpenInspector={handleOpenInspector}
                  selectedCity={selectedCityName}
                  onSelectCity={setSelectedCityName}
                />
              </div>
            )}

            {/* SUB-VIEW 4: TRIPS TAB */}
            {activeTab === 'trips' && (
              <div className="p-4">
                <TimelineTripsTab
                  items={filteredDataset}
                  onSelectTrip={handleSelectWaypoint}
                  onOpenInspector={handleOpenInspector}
                  onJumpToDate={onJumpToDate}
                />
              </div>
            )}

            {/* SUB-VIEW 5: INSIGHTS TAB */}
            {activeTab === 'insights' && (
              <div className="p-4">
                <TimelineInsightsTab
                  items={filteredDataset}
                  onSelectPlace={handleSelectWaypoint}
                  onOpenInspector={handleOpenInspector}
                />
              </div>
            )}

            {/* SUB-VIEW 6: WORLD TAB */}
            {activeTab === 'world' && (
              <div className="p-4">
                <TimelineWorldTab
                  items={filteredDataset}
                  onSelectPlace={handleSelectWaypoint}
                />
              </div>
            )}
          </div>
        )}

        {/* Right / Top: Interactive Leaflet Map Engine with Google Maps Styling */}
        {viewMode !== 'list' && (
          <div
            className="h-1/2 md:h-full relative overflow-hidden bg-gray-100 dark:bg-[#1e1e1e] flex-1 z-0 isolate contain-paint"
            style={{
              contain: 'paint layout',
              isolation: 'isolate'
            }}
          >
            <LeafletMap
              containerId="google-timeline-leaflet-map"
              items={mapDisplayItems}
              selectedCoord={selectedCoord}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectWaypoint}
              onPreviewOpen={onOpenMapModal}
              showRoutes={showRoutes}
              onToggleRoutes={setShowRoutes}
              fitKey={fitKey}
              filterLabel={activeFilterLabel}
            />
          </div>
        )}

        {/* Slide-out / Right-Side PlaceInspector Drawer */}
        {isInspectorOpen && inspectedItem && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            <PlaceInspector
              item={inspectedItem}
              allItems={allMapsInDataset}
              isOpen={isInspectorOpen}
              onClose={() => setIsInspectorOpen(false)}
              onJumpToDate={onJumpToDate}
              placeNotes={placeNotes}
              onSavePlaceNote={handleSavePlaceNote}
              placeTags={placeTags}
              onAddPlaceTag={handleAddPlaceTag}
              onRemovePlaceTag={handleRemovePlaceTag}
              onRenamePlace={onRenamePlace}
              onResolveGeo={onResolveGeo}
              onOpenRenameModal={handleOpenRenameModal}
            />
          </div>
        )}

        {/* Custom Place Renaming Modal */}
        {isRenameModalOpen && renameModalItem && (
          <PlaceRenameModal
            item={renameModalItem}
            allItems={allMapsInDataset}
            isOpen={isRenameModalOpen}
            onClose={handleCloseRenameModal}
            onSave={handleSaveRenameModal}
          />
        )}

        {/* Resolved Places Log & Geocoding Explorer Modal */}
        {isPlacesLogOpen && (
          <ResolvedPlacesLogModal
            isOpen={isPlacesLogOpen}
            onClose={() => setIsPlacesLogOpen(false)}
            timelineData={allMapsInDataset}
            onSelectPlace={item => {
              handleOpenInspector(item);
            }}
            onExportClick={() => {
              setIsExportModalOpen(true);
            }}
          />
        )}

        {/* Map Data Export Modal (GeoJSON, KML, CSV, JSON) */}
        {isExportModalOpen && (
          <MapDataExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            timelineData={allMapsInDataset}
            currentDate={currentDate}
          />
        )}
      </div>
    </div>
  );
};
