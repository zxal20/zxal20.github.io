/* ===============================
   Service Worker – Final Fixed
   =============================== */

const CACHE_NAME = 'magicplayer-cache-v99bbbpmmxxxxxxx9';

/* صفحه fallback برای آفلاین */
const OFFLINE_PAGE = '/offline.html';

/* فایل‌هایی که باید کش شوند */
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  OFFLINE_PAGE,

  '/icon-192.png',
  '/icon-512.png',

  '/css/Vazirmatn-font-face.css',

  '/js/three.module.js',
  '/js/webxr-polyfill.js',

  '/js/mediapipe/selfie_segmentation.js',
  '/js/mediapipe/selfie_segmentation.binarypb',
  '/js/mediapipe/selfie_segmentation_solution_simd_wasm_bin.js',
  '/js/mediapipe/selfie_segmentation_solution_simd_wasm_bin.wasm'
];

/* نصب */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

/* فعال‌سازی */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/* Fetch */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // همیشه صفحه اصلی را آنلاین بگیر (برای TWA و AR مهم است)
  if (
    event.request.mode === 'navigate' ||
    event.request.url.endsWith('/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_PAGE)
      )
    );
    return;
  }

  // سایر فایل‌ها: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
