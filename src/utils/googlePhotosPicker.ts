import { TimelineItem } from '../types';

const PICKER_SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const PICKER_API = 'https://photospicker.googleapis.com/v1';
const GIS_URL = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_PHOTOS_CLIENT_ID as string | undefined) || '557752141960-3dml0i9f7s4lgb51cdc6ub6gh1cqbv2e.apps.googleusercontent.com';

declare global { interface Window { google?: any; } }

export interface GooglePhotosPickerProgress { progress: number; status: string; }
let gisPromise: Promise<void> | null = null;
let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiresAt = 0;

function loadGIS(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_URL}"]`) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    script.async = true;
    script.src = GIS_URL;
    if (!existing) document.head.appendChild(script);
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true });
  });
  return gisPromise;
}

async function getAccessToken(): Promise<string> {
  await loadGIS();
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) return accessToken;
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: PICKER_SCOPE, include_granted_scopes: true,
      callback: (response: any) => {
        if (response?.error) { reject(new Error(response.error_description || response.error)); return; }
        accessToken = response.access_token;
        tokenExpiresAt = Date.now() + ((response.expires_in || 3600) * 1000);
        resolve(response.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const response = await fetch(`${PICKER_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch {}
    throw new Error(`${response.status}: ${detail || response.statusText}`);
  }
  return response.status === 204 ? {} : response.json();
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const parseDuration = (value?: string): number | null => {
  if (!value) return null;
  const match = value.match(/([\d.]+)s/);
  return match ? Number(match[1]) * 1000 : null;
};

async function waitForSelection(session: any, onProgress?: (p: GooglePhotosPickerProgress) => void) {
  const started = Date.now();
  const timeoutMs = Math.max(30_000, parseDuration(session.pollingConfig?.timeoutIn) || 10 * 60_000);
  let intervalMs = Math.max(1000, parseDuration(session.pollingConfig?.pollInterval) || 3000);
  while (Date.now() - started < timeoutMs) {
    onProgress?.({ progress: 10, status: 'Waiting for your Google Photos selection…' });
    const current = await apiFetch(`/sessions/${encodeURIComponent(session.id)}`);
    if (current.mediaItemsSet) return current;
    await sleep(intervalMs);
    intervalMs = Math.max(1000, parseDuration(current.pollingConfig?.pollInterval) || intervalMs);
  }
  throw new Error('Google Photos selection timed out. Please try again.');
}

async function listPickedMedia(sessionId: string): Promise<any[]> {
  const all: any[] = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ sessionId, pageSize: '100' });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await apiFetch(`/mediaItems?${query.toString()}`);
    all.push(...(response.mediaItems || []));
    pageToken = response.nextPageToken || '';
  } while (pageToken);
  return all;
}

async function fetchThumbnail(mediaFile: any): Promise<string> {
  const token = await getAccessToken();
  const response = await fetch(`${mediaFile.baseUrl}=w768-h768`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Unable to fetch ${mediaFile.filename || 'photo'} (${response.status})`);
  return URL.createObjectURL(await response.blob());
}

async function mapMediaItems(mediaItems: any[], onProgress?: (p: GooglePhotosPickerProgress) => void): Promise<TimelineItem[]> {
  const result: TimelineItem[] = new Array(mediaItems.length);
  let completed = 0; let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++; if (index >= mediaItems.length) return;
      const item = mediaItems[index];
      try {
        const mediaFile = item.mediaFile || {};
        const thumbnailUrl = await fetchThumbnail(mediaFile);
        const date = new Date(item.createTime || Date.now());
        result[index] = {
          id: `gphotos_${item.id}`, type: 'photo', ts: date.toISOString(), dateObj: date,
          title: mediaFile.filename || 'Google Photos', subtitle: 'Google Photos', platform: 'Google Photos',
          photoUrl: thumbnailUrl, thumbnailUrl, localBlobUrl: thumbnailUrl,
          width: mediaFile.mediaFileMetadata?.width, height: mediaFile.mediaFileMetadata?.height,
          camera: mediaFile.mediaFileMetadata?.photoMetadata?.cameraModel,
          focalLength: mediaFile.mediaFileMetadata?.photoMetadata?.focalLength?.toString(),
          iso: mediaFile.mediaFileMetadata?.photoMetadata?.isoEquivalent,
          fNumber: mediaFile.mediaFileMetadata?.photoMetadata?.apertureFNumber,
          exposureTime: mediaFile.mediaFileMetadata?.photoMetadata?.exposureTime,
          isMountedDirectly: false, folderName: 'Google Photos', description: '',
        };
      } catch (error) { console.warn('Skipping Google Photos item', item?.id, error); }
      completed++;
      onProgress?.({ progress: 15 + Math.round((completed / Math.max(1, mediaItems.length)) * 80), status: `Loading photo ${completed} of ${mediaItems.length}…` });
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, Math.max(1, mediaItems.length)) }, worker));
  return result.filter(Boolean);
}

export async function pickGooglePhotos(onProgress?: (p: GooglePhotosPickerProgress) => void): Promise<TimelineItem[]> {
  onProgress?.({ progress: 2, status: 'Connecting to Google…' });
  const session = await apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ pickingConfig: { maxItemCount: '2000' } }) });
  const pickerUri = `${session.pickerUri.replace(/\/$/, '')}/autoclose`;
  const pickerWindow = window.open(pickerUri, 'google-photos-picker', 'popup,width=1100,height=800');
  if (!pickerWindow) window.location.href = pickerUri;
  try {
    await waitForSelection(session, onProgress);
    onProgress?.({ progress: 12, status: 'Reading your selected photos…' });
    return await mapMediaItems(await listPickedMedia(session.id), onProgress);
  } finally {
    try { await apiFetch(`/sessions/${encodeURIComponent(session.id)}`, { method: 'DELETE' }); } catch {}
  }
}
