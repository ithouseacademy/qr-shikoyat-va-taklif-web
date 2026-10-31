import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, API_URL, tokens } from '../services/api'

/** Django Channels WebSocket: real-time bildirishnomalar. */
export function useNotificationSocket(enabled: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    let ws: WebSocket | null = null, stop = false, timer: any
    const connect = () => {
      const base = API_URL ? API_URL.replace(/^http/, 'ws') : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
      ws = new WebSocket(`${base}/ws/notifications/?token=${tokens.access}`)
      ws.onmessage = (e) => {
        const n = JSON.parse(e.data)
        toast(`${n.title}\n${n.body}`, { icon: '🔔' })
        qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread'] })
        qc.invalidateQueries({ queryKey: ['feedbacks'] }); qc.invalidateQueries({ queryKey: ['summary'] })
      }
      ws.onclose = () => { if (!stop) timer = setTimeout(connect, 4000) }
    }
    connect()
    return () => { stop = true; clearTimeout(timer); ws?.close() }
  }, [enabled])
}

export const useUnread = () => useQuery({ queryKey: ['unread'], queryFn: async () => (await api.get('/notifications/unread_count/')).data.count as number, refetchInterval: 60000 })
