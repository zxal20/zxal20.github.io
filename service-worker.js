/* ===============================
   Service Worker – Root Fixed
   =============================== */

const CACHE_NAME = 'ar-gallery-root-v999999999999999999';

/* فایل‌هایی که باید کش شوند */
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',

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

/* نصب Service Worker */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

/* فعال‌سازی و حذف کش‌های قدیمی */
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

/* استراتژی Fetch */
self.addEventListener('fetch', (event) => {
  // برای درخواست‌های غیر GET کاری نکن
  if (event.request.method !== 'GET') return;

  // همیشه فایل‌های اصلی رو از شبکه بگیر (مهم برای PWA Builder)
  if (
    event.request.url.includes('manifest.json') ||
    event.request.url.endsWith('/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // بقیه فایل‌ها: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
