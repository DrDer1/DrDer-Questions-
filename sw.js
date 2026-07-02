const CACHE_NAME = 'drder-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './style.css',
    './app.js',
    './questions.js',
    'https://i.ibb.co/Jw43YRGc/192.png',
    'https://i.ibb.co/dyqL46F/512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
