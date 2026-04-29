const CACHE_NAME = 'easycena-pro-v6';
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

// Súbory ktoré ako PWA často meníme — pre tieto použijeme NETWORK-FIRST
// (pri online vždy stiahneme čerstvú verziu, offline padáme na cache).
// Ostatné statické súbory (fonty, ikonky, CDN libs) zostávajú CACHE-FIRST.
function jeDynamickyAsset(request) {
    const url = new URL(request.url);
    // Ignorujeme externé domény (CDN, Google API) — tie ostanú cache-first / direct
    if (url.origin !== self.location.origin) return false;
    const path = url.pathname;
    return path.endsWith('/') ||
           path.endsWith('/index.html') ||
           path.endsWith('/app.js') ||
           path.endsWith('/site.webmanifest');
}

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

// Network-first pre HTML/JS, cache-first pre statické súbory
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return; // POST/PUT/DELETE necháme tak (Drive API)

    if (jeDynamickyAsset(event.request)) {
        // NETWORK-FIRST: skús network, ak zlyhá padni na cache.
        // Tým máme istotu že každý F5 dostane najnovší index.html a app.js.
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Aktualizuj cache pre prípad budúceho offline použitia
                    if (response && response.status === 200) {
                        const respClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // CACHE-FIRST: pre statické súbory (fonty, ikonky, CDN libs)
        event.respondWith(
            caches.match(event.request).then(response => response || fetch(event.request))
        );
    }
});
