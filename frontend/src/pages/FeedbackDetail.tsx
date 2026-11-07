import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, errMsg } from '../services/api'
import { Feedback, STATUSES } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { PageHeader, Skeleton, StatusBadge } from '../components/ui'
import { fmtDate, isVideoUrl, mediaUrl } from '../utils'

export default function FeedbackDetail() {
  const { id } = useParams(); const qc = useQueryClient(); const { can } = useAuth()
  const [text, setText] = useState(''); const [internal, setInternal] = useState(true)
  const q = useQuery({ queryKey: ['feedbacks', 'detail', id], queryFn: async () => (await api.get<Feedback>(`/feedbacks/${id}/`)).data })
  const org = useQuery({ queryKey: ['org'], queryFn: async () => (await api.get('/organization/')).data })
  const [statusValue, setStatusValue] = useState(''); const [resNote, setResNote] = useState('')
  useEffect(() => { if (q.data) { setStatusValue(q.data.status); setResNote(q.data.resolution_note || '') } }, [q.data?.id, q.data?.status, q.data?.resolution_note])
  const staff = useQuery({ queryKey: ['staff', 'all'], enabled: can('owner', 'admin', 'manager'), queryFn: async () => (await api.get('/staff/', { params: { page_size: 100 } })).data.results })
  const done = () => { qc.invalidateQueries({ queryKey: ['feedbacks'] }); qc.invalidateQueries({ queryKey: ['summary'] }) }
  const act = (url: string, body: any, ok?: string) => api.post(`/feedbacks/${id}/${url}/`, body).then(() => { done(); ok && toast.success(ok) }).catch((e) => toast.error(errMsg(e)))
  const comment = useMutation({ mutationFn: () => api.post(`/feedbacks/${id}/comments/`, { text, is_internal: internal }), onSuccess: () => { setText(''); done(); toast.success('Yuborildi') }, onError: (e) => toast.error(errMsg(e)) })
  const f = q.data
  const cfg = org.data?.settings
  if (q.isLoading || !f) return <Skeleton className="h-64" />
  return (
    <div>
      <Link to="/app/feedbacks" className="mb-2 inline-flex items-center gap-1 text-sm text-muted"><ArrowLeft size={16} />Orqaga</Link>
      <PageHeader title={`Murojaat ${f.number}`}><StatusBadge status={f.status} /></PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card">
            <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted"><span>{f.type_display}{f.rating ? ` · ★ ${f.rating}/5` : ''}</span><span>{f.category_name}</span><span>{f.branch_name}</span><span>{f.department_name}</span><span>{fmtDate(f.created_at)}</span></div>
            <p className="whitespace-pre-wrap">{f.text || '—'}</p>
            {!!f.attachments?.length && <div className="mt-3 flex flex-wrap gap-2">{f.attachments.map((a) => isVideoUrl(a) ? <video key={a} src={mediaUrl(a)} controls playsInline className="h-40 w-64 rounded-lg border border-border bg-black" /> : <a key={a} href={mediaUrl(a)} target="_blank" rel="noreferrer"><img src={mediaUrl(a)} className="h-24 w-24 rounded-lg border border-border object-cover" /></a>)}</div>}
            <p className="mt-3 text-sm text-muted">Mijoz: {f.name || 'Anonim'} {f.phone && `· ${f.phone}`}</p>
            {(f.from_person || f.to_person || f.reason) && <div className="mt-2 grid gap-1 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3">
              {f.from_person && <p><span className="text-muted">Kim tomondan:</span> {f.from_person}</p>}
              {f.to_person && <p><span className="text-muted">Kimga:</span> {f.to_person}</p>}
              {f.reason && <p><span className="text-muted">Sabab:</span> {f.reason}</p>}
            </div>}
          </div>
          {f.resolution_note && <div className="card"><h3 className="mb-1 font-medium">Hal qilindi izohi</h3><p className="whitespace-pre-wrap text-sm">{f.resolution_note}</p></div>}
          <div className="card">
            <h3 className="mb-3 font-medium">Izohlar va javoblar</h3>
            <div className="space-y-2">{f.comments?.map((c) => (
              <div key={c.id} className={`rounded-lg p-3 text-sm ${c.is_internal ? 'bg-amber-50' : 'bg-blue-50'}`}>
                <div className="mb-1 flex justify-between text-xs text-muted"><b>{c.author_name}</b><span>{c.is_internal ? 'Ichki izoh' : 'Mijozga javob'} · {fmtDate(c.created_at)}</span></div>{c.text}</div>))}
              {!f.comments?.length && <p className="text-sm text-muted">Hali izoh yo‘q</p>}</div>
            <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); text.trim() && comment.mutate() }}>
              <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Izoh yoki javob yozing..." />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select className="input !w-auto" value={internal ? '1' : '0'} onChange={(e) => setInternal(e.target.value === '1')}><option value="1">Ichki izoh</option><option value="0">Mijozga javob</option></select>
                <button className="btn-primary" disabled={comment.isPending}>Yuborish</button></div>
              {!internal && <p className="text-xs text-muted">Mijoz javobni murojaat raqami orqali (/track/{f.number}) ko‘ra oladi.</p>}
            </form>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card space-y-3">
            <div><label className="label">Holat</label><select className="input" value={statusValue || f.status} onChange={(e) => {
              const v = e.target.value; setStatusValue(v)
              if (v === 'resolved' && cfg?.collect_resolution) return
              act('set_status', { status: v }, 'Holat yangilandi')
            }}>{Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            {cfg?.collect_resolution && statusValue === 'resolved' && <div className="space-y-2 border-t border-border pt-3">
              <label className="label">Qanday hal qilindi</label>
              <textarea className="input" rows={3} value={resNote} onChange={(e) => setResNote(e.target.value)} placeholder="Hal qilish izohi..." />
              <button className="btn-primary w-full" disabled={cfg.require_resolution && !resNote.trim()} onClick={() => act('set_status', { status: 'resolved', resolution_note: resNote }, 'Saqlandi')}>Saqlash</button>
            </div>}
            {can('owner', 'admin', 'manager') && <div><label className="label">Mas‘ul xodim</label>
              <select className="input" value={f.assigned_to ?? ''} onChange={(e) => act('assign', { user_id: e.target.value || null }, 'Biriktirildi')}><option value="">— biriktirilmagan —</option>{staff.data?.map((s: any) => <option key={s.user_id} value={s.user_id}>{s.full_name} ({s.role})</option>)}</select></div>}
          </div>
          <div className="card"><h3 className="mb-2 font-medium">Tarix</h3>
            <ol className="space-y-2 border-l border-border pl-4 text-sm">{f.history?.map((h) => (
              <li key={h.id}><p><b>{STATUSES[h.to_status]}</b>{h.changed_by_name && ` — ${h.changed_by_name}`}</p>{h.note && <p className="text-muted">{h.note}</p>}<p className="text-xs text-muted">{fmtDate(h.created_at)}</p></li>))}</ol></div>
        </div>
      </div>
    </div>
  )
}
