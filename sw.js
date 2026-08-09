// Minimal service worker — just enough for installability. This app is
// network-dependent for almost everything (auth, Claude calls), so this
// deliberately doesn't try to be an offline-first cache; it precaches the
// app shell (the HTML entry points + icons) and falls back to cache only
// when the network is actually unreachable.
const CACHE_NAME = 'lastmind-shell-v1';
const SHELL_URLS = [
    '/',
    '/learn',
    '/subscribe',
    '/account',
    '/cortex',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
