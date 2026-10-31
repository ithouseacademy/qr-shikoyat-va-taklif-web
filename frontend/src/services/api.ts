import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const api = axios.create({ baseURL: `${API_URL}/api` })

export const tokens = {
  get access() { return localStorage.getItem('access') },
  get refresh() { return localStorage.getItem('refresh') },
  set(a: string, r?: string) { localStorage.setItem('access', a); if (r) localStorage.setItem('refresh', r) },
  clear() { localStorage.removeItem('access'); localStorage.removeItem('refresh') },
}

api.interceptors.request.use((cfg) => {
  const t = tokens.access
  if (t && !cfg.url?.startsWith('/public')) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

let refreshing: Promise<string> | null = null
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry && tokens.refresh && !orig.url?.includes('/auth/')) {
      orig._retry = true
      try {
        refreshing = refreshing || axios.post(`${API_URL}/api/auth/refresh/`, { refresh: tokens.refresh }).then((r) => {
          tokens.set(r.data.access, r.data.refresh); return r.data.access as string
        }).finally(() => { refreshing = null })
        const a = await refreshing
        orig.headers.Authorization = `Bearer ${a}`
        return api(orig)
      } catch {
        tokens.clear(); window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export function errMsg(e: any): string {
  const d = e?.response?.data
  if (!d) return 'Server bilan aloqa yo‘q'
  if (typeof d === 'string') return d
  if (d.detail) return d.detail
  const first = Object.entries(d)[0]
  return first ? `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}` : 'Xatolik yuz berdi'
}

export async function download(url: string, params: any, filename: string) {
  const r = await api.get(url, { params, responseType: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(r.data); a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
