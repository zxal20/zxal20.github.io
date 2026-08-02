/* ===============================
   Service Worker – Bulletproof Offline Fix
   =============================== */

const CACHE_NAME = 'magicplayer-cache-v199';

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

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

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

/* استراتژی کاملاً ایمن برای جلوگیری از صفحه خطای آفلاین */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // اگر درخواست باز کردن صفحه یا ریلود بود
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('./index.html') || caches.match('./');
            })
        );
        return;
    }

    // برای بقیه فایل‌ها: اول کش، بعد شبکه
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return fetch(event.request).catch(() => {
                // اگر فایل دیگری نبود، هیچ خطای مخربی نده
                return new Response('', { status: 404 });
            });
        })
    );
});
