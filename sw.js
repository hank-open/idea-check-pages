/* 投资学习书架 · Service Worker
 *
 * v1 出过一次"第二天打不开"的问题：对 HTML 页面做 network-first 时，
 * fetch(event.request) 会带着浏览器的条件请求头，GitHub Pages 对没变化的
 * 资源回 304（无 body），这个空响应被原样交给 respondWith() 当页面内容，
 * 页面就打不开了。
 *
 * v2 的修复思路是"缩小接管范围"而不是"把 304 修好再接管"：
 *  - 页面导航（HTML）完全不拦截，永远走浏览器原生网络请求——这样 Service
 *    Worker 再怎么写错，都不可能让"页面打不开"。
 *  - 只接管几乎不会出问题的静态资源（css/js/字体/图标/manifest），
 *    缓存优先，加速翻页、支持离线打开"壳"（首页骨架 + 样式）。
 */

const VERSION = 'v2';
const CACHE = `invest-shelf-${VERSION}`;
const BASE = '/idea-check-pages/';

const PRECACHE = [
  `${BASE}manifest.json`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => {}) // 预缓存失败也不要让整个安装失败
      .then(() => self.skipWaiting())
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
  return /\.(css|js|woff2?|ttf|svg|png|json)$/i.test(url.pathname);
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  // no-store：绕开浏览器自己的条件请求，避免拿到裸的 304
  const res = await fetch(req, { cache: 'no-store' });
  if (res && res.status === 200) {
    const cache = await caches.open(CACHE);
    cache.put(req, res.clone()).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') return; // 页面本身永远不拦截，交给浏览器原生处理

  const url = new URL(req.url);
  if (!url.pathname.startsWith(BASE)) return;
  if (!isStaticAsset(url)) return;

  event.respondWith(cacheFirst(req).catch(() => fetch(req)));
});
