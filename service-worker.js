/* ===============================
   Service Worker – Fast Offline Reload
   =============================== */

const CACHE_NAME = 'magicplayer-cache-v102';

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

/* Fetch - تغییر استراتژی به Cache-First برای جلوگیری از خطای آفلاین */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // اگر فایل در کش موجود بود، آن را برگردان (بدون نیاز به اینترنت و بدون خطای آفلاین)
                return cachedResponse;
            }

            // اگر در کش نبود، از شبکه بگیر و اگر اینترنت قطع بود index.html را بده
            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate' || event.request.destination === 'document') {
                    return caches.match('./index.html') || caches.match('./');
                }
            });
        })
    );
});
