'use strict';

// Change VERSION whenever you release new app files. Cache names include the
// deployment scope, so another app on the same host keeps its own caches.
const VERSION = 'mobile-1';
const PREFIX = 'bunny-burrow:' + self.registration.scope + ':';
const CACHE = PREFIX + VERSION;
const ASSETS = [
  './', './index.html', './style.css', './app.js', './mobile.js',
  './bunny.png', './manifest.webmanifest', './icons/icon-192.png',
  './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'
];
const assetURLs = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // A failed asset download fails installation instead of claiming offline readiness.
    await cache.addAll(ASSETS.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' })));
    // Do not skipWaiting: an update must not interrupt a running focus session.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  // Only the app's own files are cached, never arbitrary requests or other sites.
  const plainURL = new URL(url);
  plainURL.search = '';
  if (!assetURLs.has(plainURL.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const response = await cache.match(plainURL.href);
    if (response) return response;
    return fetch(request);
  })());
});
