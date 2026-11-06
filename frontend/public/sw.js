/* Service Worker: PWA kesh + Web Push */
const VERSION = 'v1.2.0'
const STATIC_CACHE = `static-${VERSION}`
const PAGES_CACHE = `pages-${VERSION}`
const SHELL = ['/', '/offline.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGES_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  // API va WebSocket hech qachon keshlanmaydi (maxfiy / real-time ma'lumot)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || url.pathname.startsWith('/media')) return

  if (req.mode === 'navigate') {
    // Network-first: oflayn bo'lsa keshlangan interfeys (SPA) yoki offline sahifa
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(PAGES_CACHE).then((c) => c.put('/', copy)); return res })
        .catch(() => caches.match('/').then((r) => r || caches.match('/offline.html'))),
    )
    return
  }
  // Statik fayllar: stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)) }
        return res
      }).catch(() => cached)
      return cached || net
    }),
  )
})

self.addEventListener('push', (e) => {
  let data = { title: 'Yangi bildirishnoma', body: '', url: '/app/notifications' }
  try { data = { ...data, ...e.data.json() } } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: data.tag, data: { url: data.url }, renotify: !!data.tag,
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = (e.notification.data && e.notification.data.url) || '/app'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(target); return c.focus() }
      }
      return self.clients.openWindow(target)
    }),
  )
})
