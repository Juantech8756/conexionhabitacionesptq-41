
// Service Worker for Room Connect Hub application
const CACHE_NAME = 'room-connect-hub-v1';

// Files to cache
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  
  self.skipWaiting();
});

// Activate the service worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  self.clients.claim();
});

// Fetch event - used for offline support
self.addEventListener('fetch', (event) => {
  console.log('[ServiceWorker] Fetch', event.request.url);
  
  // Skip cross-origin requests
  if (event.request.mode !== 'navigate') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.open(CACHE_NAME)
          .then((cache) => {
            return cache.match('offline.html');
          });
      })
  );
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);
  
  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Notificación',
      body: event.data ? event.data.text() : 'Notificación sin contenido',
      icon: '/favicon.ico'
    };
  }
  
  const options = {
    body: notificationData.body || '',
    icon: notificationData.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: notificationData.data || {},
    vibrate: [100, 50, 100],
    actions: notificationData.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event);
  
  event.notification.close();
  
  // Get the notification data
  const notificationData = event.notification.data;
  
  // Handle click action based on notification data
  let urlToOpen = '/';
  
  if (notificationData) {
    // If we have guest or reception specific data
    if (notificationData.type === 'guest-message' && notificationData.guestId) {
      urlToOpen = `/guest?roomId=${notificationData.roomId || ''}`;
    } else if (notificationData.type === 'reception-message' && notificationData.guestId) {
      urlToOpen = `/reception/dashboard?guestId=${notificationData.guestId}`;
    }
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
