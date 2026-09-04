import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  Sparkles,
  Search,
  Filter,
  MapPin,
  Star,
  Users,
  Grid,
  Calendar,
  Layers,
  ChevronDown,
  HardDrive,
  Cloud,
  CheckCircle2,
  Loader2,
  Trash2,
  Maximize2,
  Settings,
  X
} from 'lucide-react';
import { TimelineItem, DateRange } from '../../types';
import { ViewToolbar } from '../ViewToolbar';
import {
  promptNativeDirectoryMount,
  processMountedPhotoFiles,
  getDemoPhotos
} from '../../utils/photosMountService';
import { formatTime } from '../../utils/dataParser';
import { pickGooglePhotos } from '../../utils/googlePhotosPicker';

interface PhotosViewProps {
  photos: TimelineItem[];
  onMountNewPhotos: (newPhotos: TimelineItem[], folderName: string) => void;
  onClearPhotos: () => void;
  onSelectPhoto: (photo: TimelineItem) => void;
  onToggleFavorite: (photoId: string) => void;
  onJumpToJournal: (date: Date) => void;
  onJumpToMap: (lat: number, lng: number) => void;
  onOpenCalendar?: () => void;
  currentDate?: Date;
  dateRange?: DateRange | null;
  onClearDateRange?: () => void;
}

export const PhotosView: React.FC<PhotosViewProps> = ({
  photos,
  onMountNewPhotos,
  onClearPhotos,
  onSelectPhoto,
  onToggleFavorite,
  onJumpToJournal,
  onJumpToMap
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'geo' | 'favorites' | 'people' | 'albums'>('all');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [viewDensity, setViewDensity] = useState<'timeline' | 'grid' | 'compact'>('timeline');
  const [isMounting, setIsMounting] = useState(false);
  const [isGooglePhotosPicking, setIsGooglePhotosPicking] = useState(false);
  const [googlePhotosError, setGooglePhotosError] = useState<string | null>(null);
  const [mountProgress, setMountProgress] = useState(0);
  const [mountStatus, setMountStatus] = useState('');
  const [isGearOpen, setIsGearOpen] = useState(false);
  const gearRef = useRef<HTMLDivElement>(null);

  // Close gear popover on outside click or Escape key
  useEffect(() => {
    if (!isGearOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setIsGearOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGearOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGearOpen]);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract all unique people across photos
  const allPeople = useMemo(() => {
    const set = new Set<string>();
    photos.forEach(p => {
      (p.people || []).forEach(person => set.add(person));
    });
    return Array.from(set).sort();
  }, [photos]);

  // Extract all unique albums
  const allAlbums = useMemo(() => {
    const set = new Set<string>();
    photos.forEach(p => {
      if (p.album) set.add(p.album);
    });
    return Array.from(set).sort();
  }, [photos]);

  // Statistics
  const geoCount = useMemo(() => photos.filter(p => p.lat != null && p.lng != null).length, [photos]);
  const favCount = useMemo(() => photos.filter(p => p.favorite).length, [photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = photo.title?.toLowerCase().includes(q);
        const matchDesc = photo.description?.toLowerCase().includes(q);
        const matchCamera = photo.camera?.toLowerCase().includes(q);
        const matchAlbum = photo.album?.toLowerCase().includes(q);
        const matchSubtitle = photo.subtitle?.toLowerCase().includes(q);
        const matchPeople = (photo.people || []).some(p => p.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCamera && !matchAlbum && !matchSubtitle && !matchPeople) {
          return false;
        }
      }

      // 2. Filter Mode
      if (filterMode === 'geo' && (photo.lat == null || photo.lng == null)) {
        return false;
      }
      if (filterMode === 'favorites' && !photo.favorite) {
        return false;
      }
      if (filterMode === 'people') {
        if (selectedPerson && !(photo.people || []).includes(selectedPerson)) {
          return false;
        }
      }
      if (filterMode === 'albums') {
        if (selectedAlbum && photo.album !== selectedAlbum) {
          return false;
        }
      }

      return true;
    });
  }, [photos, searchQuery, filterMode, selectedPerson, selectedAlbum]);

  // Group photos chronologically (Day or Month groups) for Timeline mode
  const chronologicalGroups = useMemo(() => {
    const groups: { [key: string]: { label: string; date: Date; items: TimelineItem[] } } = {};

    filteredPhotos.forEach(p => {
      const d = p.dateObj;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[key]) {
        const label = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        groups[key] = { label, date: d, items: [] };
      }
      groups[key].items.push(p);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(k => groups[k]);
  }, [filteredPhotos]);

  // Handle Directory Mounting
  const handleMountDirectoryClick = async () => {
    setIsMounting(true);
    setMountProgress(0);
    setMountStatus('Opening folder picker...');

    try {
      // Attempt native picker first
      const result = await promptNativeDirectoryMount((pct, status) => {
        setMountProgress(pct);
        setMountStatus(status);
      });

      if (result) {
        onMountNewPhotos(result.items, result.folderName);
        setIsMounting(false);
        return;
      }
    } catch (e) {
      console.warn('Native picker aborted or unsupported, falling back to input:', e);
    }

    // Fallback: trigger HTML directory input
    setIsMounting(false);
    folderInputRef.current?.click();
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files) as File[];
    setIsMounting(true);
    setMountProgress(5);
    setMountStatus('Parsing Google Photos folder...');

    try {
      const folderName = (fileList[0] as any)?.webkitRelativePath?.split('/')[0] || 'Google Photos';
      const items = await processMountedPhotoFiles(fileList, folderName, (pct, status) => {
        setMountProgress(pct);
        setMountStatus(status);
      });
      onMountNewPhotos(items, folderName);
    } catch (err) {
      console.error('Error mounting folder:', err);
    } finally {
      setIsMounting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files) as File[];
    setIsMounting(true);
    setMountProgress(5);
    setMountStatus('Mounting selected photos...');

    try {
      const items = await processMountedPhotoFiles(fileList, 'Imported Photos', (pct, status) => {
        setMountProgress(pct);
        setMountStatus(status);
      });
      onMountNewPhotos(items, 'Imported Photos');
    } catch (err) {
      console.error('Error importing photos:', err);
    } finally {
      setIsMounting(false);
      if (e.target) e.target.value = '';
    }
  };


  const handleGooglePhotosClick = async () => {
    setGooglePhotosError(null);
    setIsGooglePhotosPicking(true);
    setIsMounting(true);
    setMountProgress(2);
    setMountStatus('Connecting to Google Photos…');
    try {
      const items = await pickGooglePhotos(({ progress, status }) => {
        setMountProgress(progress);
        setMountStatus(status);
      });
      if (items.length > 0) onMountNewPhotos(items, 'Google Photos');
      else setGooglePhotosError('No photos were selected.');
    } catch (error) {
      console.error('Google Photos Picker failed:', error);
      setGooglePhotosError(error instanceof Error ? error.message : 'Google Photos could not be connected.');
    } finally {
      setIsGooglePhotosPicking(false);
      setIsMounting(false);
    }
  };
  const handleLoadDemo = () => {
    const demo = getDemoPhotos();
    onMountNewPhotos(demo, 'Demo Google Photos');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent overflow-hidden">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputChange}
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="image/*,.json,.zip"
        className="hidden"
      />

      {/* Mounting Progress Modal */}
      {isMounting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center animate-spin">
              <Loader2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Mounting Google Photos</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mountStatus}</p>
            </div>
            <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${mountProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400">{mountProgress}% complete</span>
          </div>
        </div>
      )}

      {/* Top Reusable ViewToolbar */}
      <ViewToolbar
        badge={
          <span className="font-['Space_Mono',monospace] text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1a1a1a]/8 dark:bg-white/10 text-[#1a1a1a] dark:text-stone-200">
            {photos.length} photos
          </span>
        }
        showDateNavigation={false}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search photos, people, places..."
        searchResultsCount={searchQuery.trim() ? filteredPhotos.length : undefined}
        onImportClick={handleMountDirectoryClick}
        importLabel="Import"
        leftActions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex bg-rose-500/10 dark:bg-rose-500/15 p-0.5 rounded-lg border border-rose-500/20 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 font-medium rounded transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-rose-500 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300'
                }`}
              >
                All ({photos.length})
              </button>
              <button
                onClick={() => setFilterMode('geo')}
                className={`px-2 py-0.5 font-medium rounded flex items-center gap-1 transition-all cursor-pointer ${
                  filterMode === 'geo'
                    ? 'bg-rose-500 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>Places ({geoCount})</span>
              </button>
              <button
                onClick={() => setFilterMode('favorites')}
                className={`px-2 py-0.5 font-medium rounded flex items-center gap-1 transition-all cursor-pointer ${
                  filterMode === 'favorites'
                    ? 'bg-rose-500 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300'
                }`}
              >
                <Star className="w-3 h-3" />
                <span>Favorites ({favCount})</span>
              </button>
              {allPeople.length > 0 && (
                <button
                  onClick={() => setFilterMode('people')}
                  className={`px-2 py-0.5 font-medium rounded flex items-center gap-1 transition-all cursor-pointer ${
                    filterMode === 'people'
                      ? 'bg-rose-500 text-white shadow-2xs font-semibold'
                      : 'text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>People</span>
                </button>
              )}
            </div>

            {/* Density toggles */}
            <div className="flex bg-rose-500/10 dark:bg-rose-500/15 p-0.5 rounded-lg border border-rose-500/20 text-xs">
              <button
                onClick={() => setViewDensity('timeline')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewDensity === 'timeline' ? 'bg-rose-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300'
                }`}
                title="Timeline Grouping"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewDensity('grid')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewDensity === 'grid' ? 'bg-rose-500 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-300'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        }
      >
        {/* Source and options in Gear menu */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
            Source & Actions
          </span>
          <div className="flex flex-col gap-1.5">

            <button
              onClick={handleGooglePhotosClick}
              disabled={isGooglePhotosPicking}
              className="w-full px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5" />
                <span>{isGooglePhotosPicking ? 'Connecting…' : 'Connect Google Photos'}</span>
              </div>
              <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded font-mono">Picker</span>
            </button>
            <button
              onClick={handleMountDirectoryClick}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Mount Local Folder</span>
              </div>
              <span className="text-[10px] bg-blue-700/60 px-1.5 py-0.5 rounded font-mono">FS API</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Files & Takeout</span>
              </div>
            </button>
            <button
              onClick={handleLoadDemo}
              className="w-full px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-between border border-amber-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Photos</span>
              </div>
            </button>
            {photos.length > 0 && (
              <button
                onClick={onClearPhotos}
                className="w-full px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Unmount All Photos</span>
              </button>
            )}
          </div>
        </div>
      </ViewToolbar>


      {googlePhotosError && (
        <div className="shrink-0 mx-6 mt-3 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-3">
          <span>{googlePhotosError}</span>
          <button onClick={() => setGooglePhotosError(null)} className="font-bold opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Secondary People selector bar if people mode active */}
      {filterMode === 'people' && allPeople.length > 0 && (
        <div className="shrink-0 px-6 py-2 bg-purple-500/5 border-b border-purple-500/10 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 shrink-0">Filter Person:</span>
          <button
            onClick={() => setSelectedPerson(null)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
              selectedPerson === null
                ? 'bg-purple-600 text-white'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            }`}
          >
            Everyone
          </button>
          {allPeople.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPerson(p)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                selectedPerson === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Main Photos Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        {filteredPhotos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center shadow-inner">
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 2a5 5 0 0 0-5 5v5h5a5 5 0 0 0 0-10z" />
                <path fill="#FBBC05" d="M22 12a5 5 0 0 0-5-5h-5v5a5 5 0 0 0 10 0z" />
                <path fill="#34A853" d="M12 22a5 5 0 0 0 5-5v-5h-5a5 5 0 0 0 0 10z" />
                <path fill="#4285F4" d="M2 12a5 5 0 0 0 5 5h5v-5a5 5 0 0 0-10 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {photos.length === 0 ? 'Mount Your Google Photos' : 'No matching photos found'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {photos.length === 0
                  ? 'Mount your unzipped Google Takeout folder directly from your disk or upload image files. Direct mounting gives you instant access to your life memories with zero cloud upload.'
                  : 'Try clearing your search query or changing active filter filters.'}
              </p>
            </div>
            {photos.length === 0 && (
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full justify-center pt-2">
                <button
                  onClick={handleMountDirectoryClick}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Mount Google Photos Folder</span>
                </button>
                <button
                  onClick={handleLoadDemo}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-amber-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Explore Demo Photos</span>
                </button>
              </div>
            )}
          </div>
        ) : viewDensity === 'timeline' ? (
          // Timeline grouping (Day by day / Month by month)
          <div className="space-y-8 max-w-7xl mx-auto">
            {chronologicalGroups.map(group => (
              <section key={group.label} className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{group.label}</h3>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{group.items.length} photos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {group.items.map(photo => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onClick={() => onSelectPhoto(photo)}
                      onToggleFavorite={() => onToggleFavorite(photo.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          // Uniform Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 max-w-7xl mx-auto">
            {filteredPhotos.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => onSelectPhoto(photo)}
                onToggleFavorite={() => onToggleFavorite(photo.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PhotoCardProps {
  photo: TimelineItem;
  onClick: () => void;
  onToggleFavorite: () => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onClick, onToggleFavorite }) => {
  const timeStr = photo.dateObj ? formatTime(photo.dateObj) : '';
  const dateStr = photo.dateObj ? photo.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  return (
    <div
      onClick={onClick}
      className="group bg-white/60 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-black/8 dark:border-white/10 p-2.5 shadow-xs hover:shadow-md hover:border-black/15 dark:hover:border-white/15 transition-all cursor-pointer flex flex-col justify-between"
    >
      {/* Thumbnail Container (YouTube video style) */}
      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0">
        <img
          src={photo.thumbnailUrl || photo.photoUrl || photo.localBlobUrl}
          alt={photo.title || 'Google Photos'}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Favorite Star Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer z-10 ${
            photo.favorite
              ? 'bg-amber-500 text-white opacity-100 scale-100 shadow-xs'
              : 'bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/60'
          }`}
          title={photo.favorite ? 'Favorited' : 'Mark Favorite'}
        >
          <Star className={`w-3.5 h-3.5 ${photo.favorite ? 'fill-white' : ''}`} />
        </button>

        {/* Bottom Time & Badge overlay (YouTube duration style) */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {photo.lat != null && photo.lng != null && (
            <span className="p-1 rounded-md bg-black/70 backdrop-blur-md text-emerald-300">
              <MapPin className="w-3 h-3" />
            </span>
          )}
          {timeStr && (
            <span className="text-[10px] font-mono font-bold bg-black/70 text-white px-1.5 py-0.5 rounded-md backdrop-blur-md">
              {timeStr}
            </span>
          )}
        </div>
      </div>

      {/* Card Body Information (YouTube style metadata below thumbnail) */}
      <div className="pt-2 px-1 min-w-0">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 leading-tight group-hover:text-[#1A73E8] transition-colors">
          {photo.title || 'Photo'}
        </h4>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium flex-wrap">
          {dateStr && <span>{dateStr}</span>}
          {(photo.album || photo.camera) && (
            <>
              <span>•</span>
              <span className="truncate max-w-[120px]">{photo.album || photo.camera}</span>
            </>
          )}
        </div>

        {/* People Tags */}
        {photo.people && photo.people.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {photo.people.slice(0, 2).map((person, pIdx) => (
              <span
                key={pIdx}
                className="px-1.5 py-0.5 rounded-md bg-purple-500/10 dark:bg-purple-900/30 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-[9px]"
              >
                {person}
              </span>
            ))}
            {photo.people.length > 2 && (
              <span className="text-[9px] text-gray-400">+{photo.people.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
