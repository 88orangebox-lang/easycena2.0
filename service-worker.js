const CACHE_NAME = 'easycena-pro-v4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.js',
    './logo-firmy.js',
    './Roboto-Regular-normal.js',
    './site.webmanifest',
    './favicon.svg',
    './favicon-96x96.png',
    './web-app-manifest-192x192.png',
    './web-app-manifest-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Inštalácia aplikácie do pamäte zariadenia
self.addEventListener('install', event => {
    // skipWaiting() zaručí, že nový SW okamžite prevezme kontrolu —
    // bez tohto by nová verzia čakala kým user zatvorí všetky taby s appkou.
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Aktivácia nového service workera a zmazanie starej pamäte (Veľmi dôležité pri aktualizácii!)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
        // clients.claim() zaručí, že nový SW okamžite obsluhuje aj otvorené taby.
    );
});

// Používanie aplikácie bez internetu
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});