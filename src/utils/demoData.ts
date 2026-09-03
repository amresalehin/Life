import { TimelineItem } from '../types';
import { parseSpotifyId } from './dataParser';

export function getDemoTimelineData(): TimelineItem[] {
  const now = new Date(2025, 4, 15); // May 15, 2025
  const todayStr = (hours: number, mins = 0) => {
    const d = new Date(now);
    d.setHours(hours, mins, 0, 0);
    return d.toISOString();
  };
  const dayMinus = (daysAgo: number, hours: number, mins = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, mins, 0, 0);
    return d.toISOString();
  };

  const rawDemo: Partial<TimelineItem>[] = [
    // --- TODAY ---
    {
      type: 'spotify',
      ts: todayStr(8, 15),
      title: 'Midnight City',
      subtitle: 'M83',
      album: 'Hurry Up, We\'re Dreaming',
      spotify_track_uri: 'spotify:track:1eyzqe2QqGZUmfcPZtrIyt',
      ms_played: 243000,
      platform: 'Spotify'
    },
    {
      type: 'spotify',
      ts: todayStr(8, 20),
      title: 'Starboy',
      subtitle: 'The Weeknd',
      album: 'Starboy',
      spotify_track_uri: 'spotify:track:7MXVkk9YM5IZxh0vSlIIxt',
      ms_played: 230000,
      platform: 'Spotify'
    },
    {
      type: 'maps',
      ts: todayStr(8, 45),
      endTs: todayStr(9, 15),
      title: 'Commute to Innovation Hub',
      subtitle: '6.4 km trip',
      activityType: 'Driving',
      travelMode: 'driving',
      distance: 6400,
      distanceKm: '6.40',
      isRoute: true,
      origin: { lat: 37.7749, lng: -122.4194, address: 'Home (Mission District)' },
      destination: { lat: 37.7892, lng: -122.4014, address: 'Tech Innovation Hub, Financial District' },
      pathPoints: [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.7765, lng: -122.4172 },
        { lat: 37.7791, lng: -122.4138 },
        { lat: 37.7820, lng: -122.4102 },
        { lat: 37.7853, lng: -122.4065 },
        { lat: 37.7878, lng: -122.4034 },
        { lat: 37.7892, lng: -122.4014 }
      ],
      lat: 37.7892,
      lng: -122.4014,
      ms_played: 1800000,
      platform: 'Google Maps Timeline'
    },
    {
      type: 'browser',
      ts: todayStr(9, 30),
      title: 'GitHub - Tailwind CSS v4 Documentation & Features',
      subtitle: 'github.com',
      url: 'https://github.com/tailwindlabs/tailwindcss',
      domain: 'github.com',
      platform: 'Google Chrome'
    },
    {
      type: 'browser',
      ts: todayStr(10, 15),
      title: 'Figma - Product Design System 2026',
      subtitle: 'figma.com',
      url: 'https://www.figma.com/file/abc12345/Design-System',
      domain: 'figma.com',
      platform: 'Google Chrome'
    },
    {
      type: 'maps',
      ts: todayStr(12, 30),
      endTs: todayStr(13, 15),
      title: 'Blue Bottle Coffee & Bakery',
      subtitle: '66 Mint Plaza, San Francisco, CA',
      address: '66 Mint Plaza, San Francisco, CA',
      lat: 37.7825,
      lng: -122.4075,
      ms_played: 2700000,
      platform: 'Google Maps Timeline'
    },
    {
      type: 'youtube',
      ts: todayStr(13, 0),
      title: 'Building Modern Agentic Workflows with Gemini',
      subtitle: 'Google Cloud Tech',
      youtube_video_id: 'aircAruvnKk',
      titleUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
      ms_played: 180000,
      platform: 'YouTube'
    },
    {
      type: 'browser',
      ts: todayStr(14, 45),
      title: 'Linear - Sprint Planning & Roadmap Management',
      subtitle: 'linear.app',
      url: 'https://linear.app/workspace/issue/APP-1024',
      domain: 'linear.app',
      platform: 'Google Chrome'
    },
    {
      type: 'spotify',
      ts: todayStr(16, 20),
      title: 'Blinding Lights',
      subtitle: 'The Weeknd',
      album: 'After Hours',
      spotify_track_uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
      ms_played: 200000,
      platform: 'Spotify'
    },
    {
      type: 'maps',
      ts: todayStr(18, 10),
      endTs: todayStr(19, 0),
      title: 'Dolores Park Evening Walk',
      subtitle: '2.1 km walk',
      activityType: 'Walking',
      travelMode: 'walking',
      distance: 2100,
      distanceKm: '2.10',
      isRoute: true,
      origin: { lat: 37.7600, lng: -122.4270, address: 'Mission High' },
      destination: { lat: 37.7596, lng: -122.4269, address: 'Mission Dolores Park' },
      pathPoints: [
        { lat: 37.7600, lng: -122.4270 },
        { lat: 37.7615, lng: -122.4285 },
        { lat: 37.7608, lng: -122.4300 },
        { lat: 37.7590, lng: -122.4292 },
        { lat: 37.7582, lng: -122.4275 },
        { lat: 37.7596, lng: -122.4269 }
      ],
      lat: 37.7596,
      lng: -122.4269,
      ms_played: 3000000,
      platform: 'Google Maps Timeline'
    },
    {
      type: 'youtube',
      ts: todayStr(20, 30),
      title: 'Lofi Beats to Relax / Study to - 24/7 Live Stream',
      subtitle: 'Lofi Girl',
      youtube_video_id: 'jfKfPfyJRdk',
      titleUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      ms_played: 180000,
      platform: 'YouTube'
    },
    // --- YESTERDAY (Day - 1) ---
    {
      type: 'spotify',
      ts: dayMinus(1, 9, 10),
      title: 'As It Was',
      subtitle: 'Harry Styles',
      album: 'Harry\'s House',
      spotify_track_uri: 'spotify:track:4Dvkj6JhhA12EX05fT7y2e',
      ms_played: 167000,
      platform: 'Spotify'
    },
    {
      type: 'browser',
      ts: dayMinus(1, 11, 0),
      title: 'OpenAI API Reference & Structured Outputs Guide',
      subtitle: 'openai.com',
      url: 'https://platform.openai.com/docs/guides/structured-outputs',
      domain: 'openai.com',
      platform: 'Google Chrome'
    },
    {
      type: 'maps',
      ts: dayMinus(1, 13, 0),
      title: 'Golden Gate Park Conservatory',
      subtitle: '100 John F Kennedy Dr, San Francisco, CA',
      address: '100 John F Kennedy Dr, San Francisco, CA',
      lat: 37.7726,
      lng: -122.4608,
      ms_played: 3600000,
      platform: 'Google Maps Timeline'
    },
    {
      type: 'youtube',
      ts: dayMinus(1, 17, 45),
      title: 'How WebAssembly & WebGPU are changing modern Web UI',
      subtitle: 'Fireship',
      youtube_video_id: '67_aMPDk2Iw',
      titleUrl: 'https://www.youtube.com/watch?v=67_aMPDk2Iw',
      ms_played: 180000,
      platform: 'YouTube'
    },
    // --- 2 DAYS AGO (Day - 2) ---
    {
      type: 'spotify',
      ts: dayMinus(2, 10, 30),
      title: 'Save Your Tears',
      subtitle: 'The Weeknd',
      album: 'After Hours',
      spotify_track_uri: 'spotify:track:5QO79kh1waicV47BqGRL3g',
      ms_played: 215000,
      platform: 'Spotify'
    },
    {
      type: 'browser',
      ts: dayMinus(2, 14, 20),
      title: 'Vite 6 - Lightning Fast Frontend Tooling',
      subtitle: 'vitejs.dev',
      url: 'https://vitejs.dev/guide/',
      domain: 'vitejs.dev',
      platform: 'Google Chrome'
    },
    {
      type: 'maps',
      ts: dayMinus(2, 19, 0),
      title: 'Ferry Building Artisan Marketplace',
      subtitle: '1 Ferry Building, San Francisco, CA',
      address: '1 Ferry Building, San Francisco, CA',
      lat: 37.7955,
      lng: -122.3937,
      ms_played: 4500000,
      platform: 'Google Maps Timeline'
    }
  ];

  return rawDemo.map((item, idx) => ({
    id: `demo_${idx}_${item.ts}`,
    type: item.type!,
    ts: item.ts!,
    endTs: item.endTs,
    dateObj: new Date(item.ts!),
    title: item.title || '',
    subtitle: item.subtitle || '',
    platform: item.platform,
    ms_played: item.ms_played,
    album: item.album,
    spotify_track_uri: item.spotify_track_uri,
    trackId: parseSpotifyId(item.spotify_track_uri),
    youtube_video_id: item.youtube_video_id,
    titleUrl: item.titleUrl,
    lat: item.lat,
    lng: item.lng,
    address: item.address,
    isRoute: item.isRoute,
    activityType: item.activityType,
    travelMode: item.travelMode,
    distance: item.distance,
    distanceKm: item.distanceKm,
    origin: item.origin,
    destination: item.destination,
    pathPoints: item.pathPoints,
    url: item.url,
    domain: item.domain,
    favicon_url: item.domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.domain)}&sz=64` : undefined
  }));
}
