import { supabase } from './supabase';

// Web push, for desktop and Android.
//
// iPhone and iPad are excluded by Apple, not by us: Safari only exposes the push
// API to sites the reader has added to their Home Screen. From an ordinary tab
// the API is absent, so isPushSupported() is false and nothing is offered.

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

export function isPushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
}

// True on an iPhone or iPad that has not been installed to the Home Screen —
// the one case where we should explain rather than offer a button.
export function isIosNeedingInstall() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  return isIos && !installed && !isPushSupported();
}

export function permission() {
  return isPushSupported() ? Notification.permission : 'unsupported';
}

// Which language a notification should arrive in, taken from the device rather
// than the site: someone may read the English page but want the reminder in
// Chinese. Anything unrecognised falls back to English.
export function systemLang() {
  if (typeof navigator === 'undefined') return 'en';
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const raw of tags) {
    const tag = String(raw).toLowerCase();
    if (tag.startsWith('zh')) {
      // Hant/TW/HK/MO are traditional; everything else Chinese is simplified.
      return /hant|tw|hk|mo/.test(tag) ? 'zh' : 'sc';
    }
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('service worker registration failed', err);
    return null;
  }
}

// VAPID keys travel as base64url but the browser wants raw bytes.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribe(email) {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  // A missing key means the build never saw REACT_APP_VAPID_PUBLIC_KEY — a
  // configuration mistake, not something the reader did. Say so rather than
  // failing silently, which reads to them as a dead checkbox.
  if (!VAPID_PUBLIC_KEY) {
    console.error('REACT_APP_VAPID_PUBLIC_KEY is missing from this build');
    return { ok: false, reason: 'misconfigured' };
  }

  const result = await Notification.requestPermission();
  if (result !== 'granted') return { ok: false, reason: result };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    email,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    lang: systemLang(),
    user_agent: navigator.userAgent.slice(0, 300),
  }, { onConflict: 'endpoint' });

  if (error) { console.error('could not save push subscription', error); return { ok: false, reason: 'save-failed' }; }
  return { ok: true };
}

export async function unsubscribe() {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  // Remove the row first: a subscription the browser has dropped but the table
  // still holds means we keep pushing into a dead endpoint.
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function isSubscribed() {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  return !!(await reg.pushManager.getSubscription());
}
