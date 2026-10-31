import { api } from './api'

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

function b64ToUint8(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** Faqat foydalanuvchi tugmani bosganda chaqiriladi (ruxsat o'z-o'zidan so'ralmaydi). */
export async function enablePush() {
  if (!pushSupported()) throw new Error('Bu brauzer push bildirishnomani qo‘llab-quvvatlamaydi')
  if (isIOS() && !isStandalone()) throw new Error('iPhone’da avval ilovani Home Screen’ga qo‘shing (Share → Add to Home Screen)')
  const { data } = await api.get('/push/vapid-key/')
  if (!data.public_key) throw new Error('Serverda VAPID kalitlari sozlanmagan')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Bildirishnomaga ruxsat berilmadi')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(data.public_key) }))
  await api.post('/push/subscribe/', sub.toJSON())
  return sub
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (sub) { await api.post('/push/unsubscribe/', { endpoint: sub.endpoint }); await sub.unsubscribe() }
}
