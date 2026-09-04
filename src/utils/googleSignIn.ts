const GIS_URL = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_PHOTOS_CLIENT_ID as string | undefined) || '557752141960-3dml0i9f7s4lgb51cdc6ub6gh1cqbv2e.apps.googleusercontent.com';
const STORAGE_KEY = 'life_google_account';

declare global {
  interface Window { google?: any; }
}

export interface GoogleAccount {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

let gisPromise: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) resolve();
      else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = GIS_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

function decodeJwtPayload(token: string): GoogleAccount {
  const part = token.split('.')[1];
  if (!part) throw new Error('Google returned an invalid credential.');
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(atob(normalized).split('').map(c => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''));
  return JSON.parse(json) as GoogleAccount;
}

export function getStoredGoogleAccount(): GoogleAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as GoogleAccount : null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<GoogleAccount> {
  await loadGIS();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      use_fedcm_for_button: true,
      callback: (response: any) => {
        try {
          if (!response?.credential) throw new Error('Google sign-in was cancelled.');
          const account = decodeJwtPayload(response.credential);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
          window.dispatchEvent(new CustomEvent('life-google-account-changed', { detail: account }));
          finish(() => resolve(account));
        } catch (error) {
          finish(() => reject(error));
        }
      },
    });

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    document.body.appendChild(container);
    window.google.accounts.id.renderButton(container, { type: 'standard', theme: 'outline', size: 'large' });
    const button = container.querySelector('[role="button"]') as HTMLElement | null;
    if (!button) {
      container.remove();
      finish(() => reject(new Error('Unable to start Google sign-in.')));
      return;
    }
    button.click();
    setTimeout(() => container.remove(), 1000);
    setTimeout(() => finish(() => reject(new Error('Google sign-in timed out. Please try again.'))), 120000);
  });
}

export function signOutGoogle(): void {
  localStorage.removeItem(STORAGE_KEY);
  try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
  window.dispatchEvent(new CustomEvent('life-google-account-changed', { detail: null }));
}
