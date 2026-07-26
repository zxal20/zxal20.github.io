/* ===============================
   Service Worker – Fixed for Offline & Reload
   =============================== */

const CACHE_NAME = 'magicplayer-cache-v100';

/* فایل‌هایی که باید کش شوند (استفاده از مسیرهای نسبی مطمئن) */
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './css/Vazirmatn-font-face.css',
    './js/three.module.js',
    './js/mediapipe/selfie_segmentation.js',
    './js/mediapipe/selfie_segmentation.binarypb',
    './js/mediapipe/selfie_segmentation_solution_simd_wasm_bin.js',
    './js/mediapipe/selfie_segmentation_solution_simd_wasm_bin.wasm'
];

/* نصب */
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

/* فعال‌سازی و پاکسازی کش‌های قدیمی */
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

/* Fetch - مدیریت درخواست‌ها به صورت کاملاً آفلاین-پشتیبان */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // اگر درخواست مربوط به باز کردن صفحه یا ناوبری بود
    if (event.request.mode === 'navigate' || event.request.url.includes('index.html') || event.request.url.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // اگر اینترنت بود، نسخه جدید را کش کرده و برگردان
                    return networkResponse;
                })
                .catch(() => {
                    // اگر اینترنت قطع بود، مستقیماً index.html را از کش بده (برای ریستارت و ورود آفلاین)
                    return caches.match('./index.html') || caches.match('./');
                })
        );
        return;
    }

    // سایر فایل‌ها: اول کش، اگر نبود شبکه
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).catch(() => {
                // پوشش امنیتی برای دارایی‌های دیگر در حالت آفلاین
                return null;
            });
        })
    );
});
