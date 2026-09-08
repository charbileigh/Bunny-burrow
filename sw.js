'use strict';

// Change VERSION whenever you release new app files. Cache names include the
// deployment scope, so another app on the same host keeps its own caches.
const VERSION = 'mobile-7-soft-bunnies';
const PREFIX = 'bunny-burrow:' + self.registration.scope + ':';
const CACHE = PREFIX + VERSION;
const ASSETS = [
  './', './index.html', './style.css', './app.js', './mobile.js',
  './bunny.png', './manifest.webmanifest', './icons/icon-192.png',
  './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
  './timer.js', './audio/fire.wav', './audio/beach.wav', './audio/ocean.wav', './audio/rain.wav', './audio/forest.wav', './audio/stream.wav', './audio/forest_trees.wav', './audio/lofi_petal.wav', './audio/lofi_moon.wav', './audio/lofi_cocoa.wav',
  './audio/bell_glass.wav', './audio/bell_chime.wav', './audio/bell_bowl.wav'
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
    if (response) {
      // Mobile audio players seek with byte-range requests. Serve those from
      // the cached WAV, including when the phone has no connection.
      const range = request.headers.get('Range');
      if (range && plainURL.pathname.endsWith('.wav')) return partialAudio(response, range);
      return response;
    }
    return fetch(request);
  })());
});

async function partialAudio(response, range) {
  const bytes = await response.arrayBuffer();
  const size = bytes.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  const invalid = () => new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  if (!match || (!match[1] && !match[2])) return invalid();
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return invalid();
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return invalid();
  end = Math.min(end, size - 1);
  return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1)
  }});
}
