/* English Reboot — Service Worker v3
   Лежит в КОРНЕ проекта: scope SW = его папка, иначе он не перехватит index.html.
   При изменении любого файла приложения увеличьте CACHE_VERSION. */
const CACHE_VERSION = 'er-v41';
const CACHE_NAME = 'english-reboot-' + CACHE_VERSION;
const ASSETS = [
  './', './index.html', './manifest.json', './fonts/Inter-var.woff', './icon-192.png', './icon-512.png', './css/style.css', './css/world.css', './fonts/Overpass-var.woff', './fonts/OverpassMono-var.woff',
  './js/db.js', './js/content_grammar.js', './js/content_vocab.js', './js/content_extra.js', './js/content_pro.js', './js/content_us.js', './js/content_words.js', './js/content_migrate.js', './js/lex_us.js', './js/pos_us.js', './js/word_marks.js',
  './js/tone_us.js', './js/traps_us.js', './js/ladder.js', './js/today.js', './js/scenes.js', './js/scenes_us.js', './js/improv.js', './js/improv_us.js', './js/speech.js', './js/coach.js', './js/pacers.js', './js/srs.js', './js/annotate.js', './js/tts.js', './js/dictation.js', './js/shadowing.js', './js/ladder_ui.js', './js/traps_ui.js', './js/pos_guide.js', './js/today_ui.js', './js/scenes_ui.js', './js/improv_ui.js', './js/speech_ui.js', './js/ielts.js',
  './js/onboarding.js', './js/search.js', './js/achievements.js', './js/effects.js', './js/gamify.js',
  './js/qrcode.js', './js/exportImport.js', './js/backup.js', './js/notifications.js', './js/app_ui.js', './js/app_progress.js', './js/app_settings.js', './js/app_session.js', './js/app_library.js', './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // allSettled: один недоступный файл не должен ломать установку SW
    await Promise.allSettled(ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('english-reboot-') && k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

let offlineNotified = false;
function notifyOffline() {
  if (offlineNotified) return;
  offlineNotified = true;
  self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: 'offline' })));
}

// Stale-while-revalidate для своих файлов; Google Fonts — cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: !isFont });
    if (cached) {
      if (!isFont) {
        event.waitUntil((async () => {
          try {
            const fresh = await fetch(req);
            if (fresh && fresh.ok) await cache.put(req, fresh.clone());
          } catch (e) { /* офлайн — оставляем кэш */ }
        })());
      }
      return cached;
    }
    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (e) {
      if (req.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) { notifyOffline(); return fallback; }
      }
      return new Response('Оффлайн', { status: 503, statusText: 'Offline' });
    }
  })());
});
