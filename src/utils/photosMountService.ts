import { TimelineItem } from '../types';
import { normalizeTimestamp } from './dataParser';

export interface MountedPhotoFolderInfo {
  name: string;
  photoCount: number;
  geoCount: number;
  mountedAt: string;
}

export interface GooglePhotosTakeoutJson {
  title?: string;
  description?: string;
  imageViews?: string;
  creationTime?: {
    timestamp?: string | number;
    formatted?: string;
  };
  photoTakenTime?: {
    timestamp?: string | number;
    formatted?: string;
  };
  geoData?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    latitudeSpan?: number;
    longitudeSpan?: number;
  };
  geoDataExif?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  people?: Array<{ name: string }>;
  url?: string;
  googlePhotosOrigin?: {
    mobileUpload?: {
      deviceType?: string;
    };
    webUpload?: Record<string, any>;
    driveDesktopSync?: Record<string, any>;
  };
}

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif', 'bmp', 'tiff'
]);

export function isImageFile(fileName: string): boolean {
  const parts = fileName.split('.');
  if (parts.length < 2) return false;
  const ext = parts[parts.length - 1].toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Parses timestamp from typical Google Photos filenames if no JSON sidecar exists.
 * e.g., IMG_20240514_143022.jpg, PXL_20231105_091522812.jpg, 2024-05-14 14.30.22.jpg
 */
export function extractDateFromFilename(fileName: string): string | null {
  // Pattern 1: YYYYMMDD_HHMMSS or PXL_YYYYMMDD_HHMMSS or IMG_YYYYMMDD_HHMMSS
  const match1 = fileName.match(/(?:IMG_|PXL_|VID_)?(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/i);
  if (match1) {
    const [_, y, m, d, hh, mm, ss] = match1;
    const date = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Pattern 2: YYYY-MM-DD HH.MM.SS or YYYY-MM-DD_HH-MM-SS
  const match2 = fileName.match(/(\d{4})[-_](\d{2})[-_](\d{2})[\s_T](\d{2})[.:\-](\d{2})[.:\-](\d{2})/);
  if (match2) {
    const [_, y, m, d, hh, mm, ss] = match2;
    const date = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Pattern 3: Just date YYYY-MM-DD or YYYYMMDD
  const match3 = fileName.match(/(?:Photos from )?(\d{4})[-_](\d{2})[-_](\d{2})/i);
  if (match3) {
    const [_, y, m, d] = match3;
    const date = new Date(Date.UTC(+y, +m - 1, +d, 12, 0, 0));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  return null;
}

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Process a list of File objects (e.g. from directory picker, folder upload, or drag-and-drop)
 * Matches image files with their Google Takeout JSON sidecars.
 */
export async function processMountedPhotoFiles(
  files: File[],
  folderName: string = 'Mounted Folder',
  onProgress?: (progress: number, status: string) => void
): Promise<TimelineItem[]> {
  const fileMap = new Map<string, File>();
  const jsonMap = new Map<string, File>();

  onProgress?.(5, `Scanning ${files.length} files...`);

  // Index files by normalized path/name
  for (const file of files) {
    const relativePath = (file as any).webkitRelativePath || file.name;
    const nameLower = relativePath.toLowerCase();

    if (nameLower.endsWith('.json')) {
      jsonMap.set(relativePath, file);
      // Also map by basename for looser pairing
      const baseName = file.name.toLowerCase();
      jsonMap.set(baseName, file);
    } else if (isImageFile(file.name)) {
      fileMap.set(relativePath, file);
    }
  }

  const photoFiles = Array.from(fileMap.entries());
  const totalPhotos = photoFiles.length;
  const items: TimelineItem[] = [];

  for (let i = 0; i < totalPhotos; i++) {
    const [path, file] = photoFiles[i];
    if (i % 10 === 0 && onProgress) {
      const pct = Math.min(95, Math.round(10 + (i / totalPhotos) * 80));
      onProgress(pct, `Mounting photo ${i + 1} of ${totalPhotos}...`);
    }

    // Attempt to locate sidecar JSON in Takeout:
    // Pattern A: path + ".json" (e.g. "Photos/IMG_01.jpg.json")
    // Pattern B: file.name + ".json"
    // Pattern C: path without extension + ".json"
    let sidecarFile = jsonMap.get(path + '.json') ||
      jsonMap.get(file.name.toLowerCase() + '.json') ||
      jsonMap.get(path.replace(/\.[^/.]+$/, '') + '.json');

    // Google Takeout truncated names handle (e.g. "photo(1).jpg" -> "photo.jpg(1).json")
    if (!sidecarFile) {
      const parenMatch = file.name.match(/^(.+?)\((\d+)\)\.([^.]+)$/);
      if (parenMatch) {
        const altJson = `${parenMatch[1]}.${parenMatch[3]}(${parenMatch[2]}).json`.toLowerCase();
        sidecarFile = jsonMap.get(altJson);
      }
    }

    let takeoutMeta: GooglePhotosTakeoutJson | null = null;
    if (sidecarFile) {
      try {
        const text = await sidecarFile.text();
        takeoutMeta = JSON.parse(text);
      } catch (err) {
        console.warn('Failed to parse sidecar JSON for', file.name, err);
      }
    }

    // Determine timestamp
    let rawTimestamp: string | null = null;
    if (takeoutMeta?.photoTakenTime?.timestamp) {
      rawTimestamp = normalizeTimestamp(+takeoutMeta.photoTakenTime.timestamp * 1000);
    } else if (takeoutMeta?.photoTakenTime?.formatted) {
      rawTimestamp = normalizeTimestamp(takeoutMeta.photoTakenTime.formatted);
    } else if (takeoutMeta?.creationTime?.timestamp) {
      rawTimestamp = normalizeTimestamp(+takeoutMeta.creationTime.timestamp * 1000);
    }

    if (!rawTimestamp) {
      rawTimestamp = extractDateFromFilename(file.name);
    }

    if (!rawTimestamp) {
      rawTimestamp = new Date(file.lastModified || Date.now()).toISOString();
    }

    const dateObj = new Date(rawTimestamp);

    // Extract GPS
    let lat: number | null = null;
    let lng: number | null = null;

    if (takeoutMeta?.geoData && (takeoutMeta.geoData.latitude !== 0 || takeoutMeta.geoData.longitude !== 0)) {
      lat = takeoutMeta.geoData.latitude || null;
      lng = takeoutMeta.geoData.longitude || null;
    } else if (takeoutMeta?.geoDataExif && (takeoutMeta.geoDataExif.latitude !== 0 || takeoutMeta.geoDataExif.longitude !== 0)) {
      lat = takeoutMeta.geoDataExif.latitude || null;
      lng = takeoutMeta.geoDataExif.longitude || null;
    }

    // Extract People
    const people = (takeoutMeta?.people || []).map(p => p.name).filter(Boolean);

    // Camera / Device
    let camera: string | undefined;
    if (takeoutMeta?.googlePhotosOrigin?.mobileUpload?.deviceType) {
      camera = takeoutMeta.googlePhotosOrigin.mobileUpload.deviceType.replace(/_/g, ' ');
    }

    // Local Blob URL for high performance rendering without network cost
    const blobUrl = URL.createObjectURL(file);

    // Clean folder/album name from path
    const pathSegments = path.split('/');
    let album = folderName;
    if (pathSegments.length > 1) {
      album = pathSegments[pathSegments.length - 2];
      if (album === 'Photos from ' || album.toLowerCase() === 'google photos') {
        album = folderName;
      }
    }

    const title = takeoutMeta?.description || file.name;
    const subtitle = camera ? `${camera} • ${formatBytes(file.size)}` : `${album} • ${formatBytes(file.size)}`;

    const photoItem: TimelineItem = {
      id: `photo_${dateObj.getTime()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'photo',
      ts: dateObj.toISOString(),
      dateObj,
      title,
      subtitle,
      platform: 'Google Photos',
      photoUrl: blobUrl,
      thumbnailUrl: blobUrl,
      localBlobUrl: blobUrl,
      description: takeoutMeta?.description || '',
      camera,
      people: people.length > 0 ? people : undefined,
      album,
      folderName,
      lat,
      lng,
      fileSizeBytes: file.size,
      formattedFileSize: formatBytes(file.size),
      isMountedDirectly: true,
      takeoutUrl: takeoutMeta?.url
    };

    items.push(photoItem);
  }

  onProgress?.(100, `Successfully mounted ${items.length} Google Photos!`);
  return items;
}

/**
 * Triggers native directory picker (File System Access API) if available,
 * or returns null to signal falling back to standard input element.
 */
export async function promptNativeDirectoryMount(
  onProgress?: (progress: number, status: string) => void
): Promise<{ items: TimelineItem[]; folderName: string } | null> {
  if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) {
    return null;
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'google_photos_mount',
      mode: 'read'
    });

    const folderName = dirHandle.name || 'Google Photos';
    onProgress?.(5, `Scanning folder "${folderName}"...`);

    const files: File[] = [];

    async function scanDirectory(handle: any, currentPath: string = '') {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          try {
            const file = await entry.getFile();
            // Attach relative path for sidecar mapping
            Object.defineProperty(file, 'webkitRelativePath', {
              value: currentPath ? `${currentPath}/${file.name}` : file.name,
              writable: false
            });
            files.push(file);
          } catch (e) {
            console.warn('Could not read file in directory:', entry.name, e);
          }
        } else if (entry.kind === 'directory') {
          const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          await scanDirectory(entry, nextPath);
        }
      }
    }

    await scanDirectory(dirHandle);
    const items = await processMountedPhotoFiles(files, folderName, onProgress);
    return { items, folderName };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    console.warn('Native directory picker failed, falling back:', err);
    return null;
  }
}

/**
 * Curated high-resolution Google Photos demo collection with authentic
 * Takeout metadata, GPS coordinates matching demo cities, camera models, and people tags.
 */
export function getDemoPhotos(): TimelineItem[] {
  const baseDate = new Date(2025, 4, 15); // May 15, 2025 (matches demo timeline)

  const makeDate = (daysAgo: number, hour: number, min: number = 0) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, min, 0, 0);
    return d;
  };

  const demoItems: Array<Partial<TimelineItem> & { url: string }> = [
    // Today (May 15, 2025)
    {
      url: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?q=80&w=1200&auto=format&fit=crop',
      title: 'Morning Golden Hour at Golden Gate Bridge',
      subtitle: 'San Francisco, CA • Google Pixel 8 Pro',
      camera: 'Google Pixel 8 Pro (Main 50MP, f/1.68, ISO 32)',
      description: 'The fog rolling beneath the towers as the sun crested the East Bay hills.',
      dateObj: makeDate(0, 7, 45),
      lat: 37.8199,
      lng: -122.4783,
      album: 'San Francisco & Bay Area',
      people: ['Alex', 'Jordan'],
      favorite: true,
      fileSizeBytes: 4820000,
      formattedFileSize: '4.6 MB'
    },
    {
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
      title: 'Artisan Espresso at Blue Bottle Cafe',
      subtitle: 'Mission District • Google Pixel 8 Pro',
      camera: 'Google Pixel 8 Pro (Portrait Mode, f/1.7)',
      description: 'Fuel before diving into the architecture review session.',
      dateObj: makeDate(0, 9, 30),
      lat: 37.7610,
      lng: -122.4214,
      album: 'Daily Moments',
      people: ['Alex'],
      favorite: false,
      fileSizeBytes: 3150000,
      formattedFileSize: '3.0 MB'
    },
    {
      url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1200&auto=format&fit=crop',
      title: 'Design Sprint Whiteboard Session',
      subtitle: 'Financial District Innovation Hub • Google Pixel Fold',
      camera: 'Google Pixel Fold (Wide, f/2.2)',
      description: 'System topology breakdown for real-time edge processing.',
      dateObj: makeDate(0, 14, 15),
      lat: 37.7892,
      lng: -122.4014,
      album: 'Work & Projects',
      people: ['Alex', 'Elena', 'Marcus'],
      favorite: false,
      fileSizeBytes: 3940000,
      formattedFileSize: '3.8 MB'
    },
    {
      url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop',
      title: 'Rooftop Dinner Sunset in SoMa',
      subtitle: 'San Francisco • iPhone 15 Pro Max',
      camera: 'iPhone 15 Pro Max (3x Telephoto, 77mm, f/2.8)',
      description: 'Catching up over grilled salmon and sparkling water overlooking the skyline.',
      dateObj: makeDate(0, 19, 45),
      lat: 37.7786,
      lng: -122.3995,
      album: 'San Francisco & Bay Area',
      people: ['Elena', 'Jordan'],
      favorite: true,
      fileSizeBytes: 5200000,
      formattedFileSize: '5.0 MB'
    },

    // Yesterday (May 14, 2025)
    {
      url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=1200&auto=format&fit=crop',
      title: 'Yosemite Valley Mist Trail Trek',
      subtitle: 'Yosemite National Park • Sony Alpha A7 IV',
      camera: 'Sony Alpha A7 IV (24-70mm GM II, f/4, 1/500s)',
      description: 'Rainbow mist rising from Vernal Falls in the afternoon sunlight.',
      dateObj: makeDate(1, 11, 20),
      lat: 37.7275,
      lng: -119.5441,
      album: 'Yosemite Wilderness Adventure',
      people: ['Alex', 'Liam', 'Sofia'],
      favorite: true,
      fileSizeBytes: 8700000,
      formattedFileSize: '8.3 MB'
    },
    {
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop',
      title: 'Summit Vista Over Half Dome',
      subtitle: 'Glacier Point, Yosemite • Google Pixel 8 Pro',
      camera: 'Google Pixel 8 Pro (5x Optical Telephoto, f/2.8, ISO 40)',
      description: 'Clear granite majesty with snow lingering along the High Sierra crest.',
      dateObj: makeDate(1, 16, 50),
      lat: 37.7303,
      lng: -119.5735,
      album: 'Yosemite Wilderness Adventure',
      people: ['Liam'],
      favorite: true,
      fileSizeBytes: 6100000,
      formattedFileSize: '5.8 MB'
    },

    // 4 Days Ago (May 11, 2025)
    {
      url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
      title: 'Tokyo Shibuya Crossing Neon Reflections',
      subtitle: 'Shibuya, Tokyo • Google Pixel 8 Pro',
      camera: 'Google Pixel 8 Pro (Night Sight, f/1.68, ISO 180)',
      description: 'Rain slicks highlighting the neon billboards and bustling umbrellas.',
      dateObj: makeDate(4, 20, 15),
      lat: 35.6595,
      lng: 139.7005,
      album: 'Japan Spring Journey',
      people: ['Alex', 'Elena'],
      favorite: true,
      fileSizeBytes: 5400000,
      formattedFileSize: '5.1 MB'
    },
    {
      url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop',
      title: 'Arashiyama Bamboo Forest at Dawn',
      subtitle: 'Kyoto, Japan • Sony Alpha A7 IV',
      camera: 'Sony Alpha A7 IV (35mm F1.4 GM, f/2.0, 1/250s)',
      description: 'Absolute stillness as morning wind rustled through towering stalks.',
      dateObj: makeDate(5, 6, 10),
      lat: 35.0167,
      lng: 135.6713,
      album: 'Japan Spring Journey',
      people: ['Alex'],
      favorite: true,
      fileSizeBytes: 7200000,
      formattedFileSize: '6.9 MB'
    },

    // 10 Days Ago (May 5, 2025)
    {
      url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop',
      title: 'Parisian Cafe Terrace by Montmartre',
      subtitle: 'Paris, France • iPhone 15 Pro Max',
      camera: 'iPhone 15 Pro Max (24mm Main, f/1.78)',
      description: 'Fresh croissants and café au lait watching artists set up their easels.',
      dateObj: makeDate(10, 10, 0),
      lat: 48.8867,
      lng: 2.3431,
      album: 'European Architecture & Cafes',
      people: ['Jordan', 'Sofia'],
      favorite: false,
      fileSizeBytes: 4100000,
      formattedFileSize: '3.9 MB'
    },
    {
      url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=1200&auto=format&fit=crop',
      title: 'Eiffel Tower Twilight Glow',
      subtitle: 'Champ de Mars, Paris • Google Pixel 8 Pro',
      camera: 'Google Pixel 8 Pro (Night Sight 2x, f/1.68)',
      description: 'The golden hour beacon lights up the Seine river reflections.',
      dateObj: makeDate(10, 21, 10),
      lat: 48.8584,
      lng: 2.2945,
      album: 'European Architecture & Cafes',
      people: ['Sofia'],
      favorite: true,
      fileSizeBytes: 5800000,
      formattedFileSize: '5.5 MB'
    },

    // 14 Days Ago (May 1, 2025)
    {
      url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=1200&auto=format&fit=crop',
      title: 'Sunset over DUMBO & Brooklyn Bridge',
      subtitle: 'New York, NY • Google Pixel 8 Pro',
      camera: 'Google Pixel 8 Pro (Main 50MP, f/1.68)',
      description: 'Strolling through Washington Street towards the river at sunset.',
      dateObj: makeDate(14, 18, 40),
      lat: 40.7033,
      lng: -73.9897,
      album: 'NYC Springtime',
      people: ['Alex', 'Marcus'],
      favorite: true,
      fileSizeBytes: 6300000,
      formattedFileSize: '6.0 MB'
    },
    {
      url: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?q=80&w=1200&auto=format&fit=crop',
      title: 'Central Park Conservatory Water Afternoon',
      subtitle: 'New York, NY • Google Pixel Fold',
      camera: 'Google Pixel Fold (Wide, f/1.7)',
      description: 'Miniature sailboats drifting across the reflective pool.',
      dateObj: makeDate(14, 15, 10),
      lat: 40.7725,
      lng: -73.9686,
      album: 'NYC Springtime',
      people: ['Marcus'],
      favorite: false,
      fileSizeBytes: 4400000,
      formattedFileSize: '4.2 MB'
    }
  ];

  return demoItems.map((item, idx) => {
    const ts = item.dateObj!.toISOString();
    return {
      id: `photo_demo_${idx + 1}_${item.dateObj!.getTime()}`,
      type: 'photo',
      ts,
      dateObj: item.dateObj!,
      title: item.title || 'Photo',
      subtitle: item.subtitle || 'Google Photos',
      platform: 'Google Photos',
      photoUrl: item.url,
      thumbnailUrl: item.url,
      localBlobUrl: item.url,
      description: item.description,
      camera: item.camera,
      lat: item.lat,
      lng: item.lng,
      people: item.people,
      album: item.album,
      folderName: item.album || 'Google Photos',
      favorite: item.favorite ?? false,
      fileSizeBytes: item.fileSizeBytes,
      formattedFileSize: item.formattedFileSize,
      isMountedDirectly: true
    };
  });
}
