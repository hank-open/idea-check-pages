/* 投资学习书架 · Service Worker
 * 策略：
 *  - 书架首页 / manifest / 图标：预缓存，网络优先，失败退缓存
 *  - 章节 HTML（book-html/、stock-book-html/ 下的页面）：网络优先，
 *    成功则更新缓存，离线时退回上次访问时缓存的版本——读过的章节离线可看，没读过的看不到。
 *  - 静态资源（css/js/字体/katex）：缓存优先，命中就不打网络，大幅加速翻页。
 */

const VERSION = 'v1';
const CACHE = `invest-shelf-${VERSION}`;
const BASE = '/idea-check-pages/';

const PRECACHE = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return /\.(css|js|woff2?|ttf|svg|png)$/i.test(url.pathname);
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone());
  }
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith(BASE)) return; // 只管自己站内的资源

  event.respondWith(
    (isStaticAsset(url) ? cacheFirst(req) : networkFirst(req)).catch(
      () => caches.match(`${BASE}index.html`)
    )
  );
});
