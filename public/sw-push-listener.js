/**
 * Native Web Push Service Worker Listener
 * Zero-OneSignal / Zero-Third-Party Native Web Standards Implementation
 * Handles background push payloads, lock screen notification banners, vibrations, and deep links.
 */

self.addEventListener('push', function (event) {
  let payload = {};
  
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      payload = {
        title: 'HMIS Hospital Alert',
        body: event.data.text()
      };
    }
  } else {
    payload = {
      title: 'HMIS - The Tassia Hill Hospital',
      body: 'New clinical update received.'
    };
  }

  const title = payload.title || 'HMIS - The Tassia Hill Hospital';
  const notificationOptions = {
    body: payload.body || 'Clinical notification from HMIS Hospital Information System',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/apple-touch-icon.png',
    image: payload.image || undefined,
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
      type: payload.type || 'alert',
      tag: payload.tag || 'hmis-push-' + Date.now(),
      ...(payload.extra || {})
    },
    // Standard hospital emergency vibration rhythm (buzz-pause-buzz-pause-buzz)
    vibrate: payload.vibrate || [200, 100, 200, 100, 300],
    tag: payload.tag || 'hmis-push-notification',
    renotify: true,
    requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : true,
    actions: payload.actions || [
      { action: 'open_hmis', title: 'Open HMIS' },
      { action: 'dismiss_hmis', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss_hmis') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a window client is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          // Post message to client so React router / active tab can switch without full reload
          try {
            client.postMessage({
              type: 'HMIS_PUSH_NOTIFICATION_CLICKED',
              url: targetUrl,
              data: event.notification.data
            });
          } catch (e) {
            // ignore
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', function (event) {
  // Can be used for notification dismiss telemetry if needed
});
