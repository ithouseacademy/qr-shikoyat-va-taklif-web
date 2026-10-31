import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Eye, Film } from 'lucide-react'
import { api } from '../services/api'
import { Feedback, Paged, STATUSES, TYPE_LABELS } from '../types'
import { Empty, PageHeader, Pagination, StatusBadge, TableSkeleton } from '../components/ui'
import { fmtDate, isVideoUrl, mediaUrl } from '../utils'

const useList = (ep: string) => useQuery({ queryKey: [ep], queryFn: async () => (await api.get(`/${ep}/`, { params: { page_size: 200 } })).data.results ?? [] })

export default function Feedbacks({ type, title = 'Murojaatlar' }: { type?: string; title?: string }) {
  const [f, setF] = useState<any>({ search: '', status: '', branch: '', department: '', date_from: '', date_to: '', ordering: '-created_at', type: type || '' })
  const [page, setPage] = useState(1)
  const params = { ...Object.fromEntries(Object.entries({ ...f, type: type || f.type }).filter(([, v]) => v)), page }
  const q = useQuery({ queryKey: ['feedbacks', params], queryFn: async () => (await api.get<Paged<Feedback>>('/feedbacks/', { params })).data, placeholderData: (p) => p })
  const branches = useList('branches'), depts = useList('departments')
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setPage(1) }
  return (
    <div>
      <PageHeader title={title} />
      <div className="card mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" placeholder="Qidirish (raqam, ism, matn)" value={f.search} onChange={(e) => set('search', e.target.value)} />
        <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="">Barcha holatlar</option>{Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {!type && <select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}><option value="">Barcha turlar</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
        <select className="input" value={f.branch} onChange={(e) => set('branch', e.target.value)}><option value="">Barcha filiallar</option>{branches.data?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select className="input" value={f.department} onChange={(e) => set('department', e.target.value)}><option value="">Barcha bo‘limlar</option>{depts.data?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <input className="input" type="date" value={f.date_from} onChange={(e) => set('date_from', e.target.value)} />
        <input className="input" type="date" value={f.date_to} onChange={(e) => set('date_to', e.target.value)} />
        <select className="input" value={f.ordering} onChange={(e) => set('ordering', e.target.value)}><option value="-created_at">Yangilari birinchi</option><option value="created_at">Eskilari birinchi</option><option value="status">Holat bo‘yicha</option></select>
      </div>
      <div className="card overflow-x-auto !p-0">
        {q.isLoading ? <TableSkeleton /> : !q.data?.results.length ? <Empty title="Murojaat topilmadi" /> : (<>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted"><tr>{['ID', 'Fayl', 'Mijoz', 'Turi', 'Kategoriya', 'Filial', 'Bo‘lim', 'Sana', 'Holat', 'Mas‘ul', ''].map((h) => <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
            <tbody>{q.data.results.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{r.number}</td>
                <td className="px-3 py-3">{r.attachments?.length ? <a href={mediaUrl(r.attachments[0])} target="_blank" rel="noreferrer" className="relative inline-block" title={isVideoUrl(r.attachments[0]) ? 'Video' : 'Rasm'}>{isVideoUrl(r.attachments[0]) ? <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-slate-100 text-slate-600"><Film size={16} /></span> : <img src={mediaUrl(r.attachments[0])} className="h-9 w-9 rounded-lg border border-border object-cover" alt="Rasm" />}{r.attachments.length > 1 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-white">{r.attachments.length}</span>}</a> : <span className="text-xs text-muted">—</span>}</td>
                <td className="px-3 py-3">{r.name || 'Anonim'}</td>
                <td className="px-3 py-3">{r.type_display}{r.rating ? ` ★${r.rating}` : ''}</td><td className="px-3 py-3">{r.category_name || '—'}</td>
                <td className="px-3 py-3">{r.branch_name || '—'}</td><td className="px-3 py-3">{r.department_name || '—'}</td>
                <td className="whitespace-nowrap px-3 py-3">{fmtDate(r.created_at)}</td><td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">{r.assigned_to_name || '—'}</td>
                <td className="px-3 py-3"><Link to={`/app/feedbacks/${r.id}`} className="text-primary" aria-label="Ochish"><Eye size={18} /></Link></td>
              </tr>))}</tbody>
          </table>
          <Pagination page={page} count={q.data.count} onPage={setPage} />
        </>)}
      </div>
    </div>
  )
}
