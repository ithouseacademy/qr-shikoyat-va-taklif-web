export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '—')
export const uuid = () => (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ')

export function mediaUrl(u?: string | null) {
  if (!u) return ''
  if (/^(https?:|data:|blob:)/i.test(u)) return u
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`
}

export const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(u)
