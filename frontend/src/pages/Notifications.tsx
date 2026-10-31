import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Empty, PageHeader, Pagination, TableSkeleton } from '../components/ui'
import { fmtDate } from '../utils'

const LABEL: Record<string, string> = { new_suggestion: 'Taklif', new_complaint: 'Shikoyat', new_rating: 'Baho', assigned: 'Biriktirildi', reply: 'Javob', status_changed: 'Holat', system: 'Tizim' }

export default function Notifications() {
  const [page, setPage] = useState(1); const [unread, setUnread] = useState(false)
  const qc = useQueryClient(); const nav = useNavigate()
  const q = useQuery({ queryKey: ['notifications', page, unread], queryFn: async () => (await api.get('/notifications/', { params: { page, is_read: unread ? false : undefined } })).data })
  const inv = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread'] }) }
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/mark_all_read/'), onSuccess: inv })
  return (
    <div>
      <PageHeader title="Bildirishnomalar">
        <button className={unread ? 'btn-primary' : 'btn-ghost'} onClick={() => { setUnread(!unread); setPage(1) }}>O‘qilmaganlar</button>
        <button className="btn-ghost" onClick={() => markAll.mutate()}>Barchasini o‘qilgan deb belgilash</button>
      </PageHeader>
      <div className="card !p-0">
        {q.isLoading ? <TableSkeleton /> : !q.data?.results.length ? <Empty title="Bildirishnoma yo‘q" /> : (<>
          {q.data.results.map((n: any) => (
            <button key={n.id} onClick={async () => { await api.post(`/notifications/${n.id}/read/`); inv(); n.feedback && nav(`/app/feedbacks/${n.feedback}`) }}
              className={`flex w-full items-start gap-3 border-b border-border p-4 text-left hover:bg-slate-50 ${n.is_read ? '' : 'bg-blue-50/60'}`}>
              <span className="mt-0.5 rounded bg-slate-100 px-2 py-0.5 text-xs">{LABEL[n.type] || n.type}</span>
              <span className="flex-1"><b className="block text-sm">{n.title}</b><span className="text-sm text-muted">{n.body}</span></span>
              <span className="whitespace-nowrap text-xs text-muted">{fmtDate(n.created_at)}</span>
            </button>))}
          <Pagination page={page} count={q.data.count} onPage={setPage} /></>)}
      </div>
    </div>
  )
}
