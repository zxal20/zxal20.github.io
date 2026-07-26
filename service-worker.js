/* ===============================
   Service Worker – Ultimate Offline Fix
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

/* نصب و ذخیره کش */
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

/* Fetch - مدیریت هوشمند برای حالت آفلاین و آنلاین */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // اگر درخواست ورود به صفحه اصلی یا ریستارت بود
    if (event.request.mode === 'navigate' || event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // اگر اینترنت قطع بود، بدون معطلی و بدون خطا، index.html را از کش تحویل بده
                    return caches.match('./index.html') || caches.match('./');
                })
        );
        return;
    }

    // برای سایر فایل‌ها: اول کش، اگر نبود شبکه، اگر آن هم نشد هیچ (جلوگیری از ارور)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                return networkResponse;
            }).catch(() => {
                // اگر فایل صوتی، تصویری یا اسکریپتی در کش نبود و اینترنت هم نبود
                return new Response('', { status: 404, statusText: 'Offline' });
            });
        })
    );
});
