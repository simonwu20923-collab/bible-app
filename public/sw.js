/* Service worker for Bible Reading.
 *
 * Its only job today is push notifications. Browsers deliver push to a service
 * worker rather than to a page, so this file has to exist even though the app
 * itself still runs entirely online.
 *
 * Deliberately no caching yet. A stale cache on a reading app is worse than no
 * cache — someone would open yesterday's portion and not know why — so offline
 * support is a separate decision, taken later and on purpose.
 */

const SITE = self.location.origin;

// A push arrives as JSON from the send function. Fall back to plain text so a
// malformed payload still surfaces something rather than nothing.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Bible Reading', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Bible Reading';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'bible-reading',
    // A reminder that replaces yesterday's is right; a mention that silently
    // replaces another mention is not.
    renotify: !!payload.tag,
    data: { url: payload.url || '/reading' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/reading', SITE).href;

  // Focus an existing tab if one is already open rather than piling up windows.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(SITE) && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Take over without waiting for every tab to close, so an updated worker is not
// stuck behind a tab someone left open for days.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
