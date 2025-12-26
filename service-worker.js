const CACHE_NAME = 'ar-gallery-v999-offline';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/three.module.js',
  './js/webxr-polyfill.js',
  './css/Vazirmatn-font-face.css',
  
  // فایل‌های MediaPipe
  './js/mediapipe/selfie_segmentation.js',
  './js/mediapipe/selfie_segmentation.binarypb',
  './js/mediapipe/selfie_segmentation_solution_simd_wasm_bin.js',
  './js/mediapipe/selfie_segmentation_solution_simd_wasm_bin.wasm'
  // نکته: اگر فونت‌ها را هم دانلود کردید، مسیر آن‌ها را هم اینجا اضافه کنید
  // مثلا: './css/fonts/Vazirmatn.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
