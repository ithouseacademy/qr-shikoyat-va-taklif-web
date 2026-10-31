import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, ImagePlus, Plus, Power, Share2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, errMsg } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Empty, Modal, PageHeader, Skeleton } from '../components/ui'
import { mediaUrl } from '../utils'

function LogoCard() {
  const qc = useQueryClient(); const { refresh } = useAuth()
  const org = useQuery({ queryKey: ['org'], queryFn: async () => (await api.get('/organization/')).data })
  const [logo, setLogo] = useState<File | null>(null)
  const [color, setColor] = useState('#2563EB')
  useEffect(() => { if (org.data?.settings?.primary_color) setColor(org.data.settings.primary_color) }, [org.data])
  const upload = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('logo', file); return api.patch('/organization/', fd) },
    onSuccess: () => { toast.success('Logotip saqlandi'); setLogo(null); qc.invalidateQueries({ queryKey: ['org'] }); refresh() },
    onError: (e) => toast.error(errMsg(e)),
  })
  const saveColor = useMutation({
    mutationFn: (c: string) => api.patch('/organization/', { settings: { primary_color: c } }),
    onSuccess: () => { toast.success('Sayt rangi saqlandi'); qc.invalidateQueries({ queryKey: ['org'] }); refresh() },
    onError: (e) => toast.error(errMsg(e)),
  })
  return (
    <div className="card mb-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-border bg-slate-50">
          {org.data?.logo ? <img src={mediaUrl(org.data.logo)} className="h-full w-full object-contain p-1" alt="Logo" /> : <ImagePlus size={24} className="text-muted" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">Mijoz sahifasi logotipi</h3>
          <p className="text-xs text-muted">Bu logotip QR skanerlanganda ochiladigan sahifada va QR-kod markazida ko‘rinadi.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="text-xs" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
            <button className="btn-primary !py-1.5" disabled={!logo || upload.isPending} onClick={() => logo && upload.mutate(logo)}>Yuklash</button>
          </div>
        </div>
        <Link to="/app/social" className="btn-ghost"><Share2 size={16} />Ijtimoiy tarmoqlar</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">Saytning asosiy rangi</h3>
          <p className="text-xs text-muted">Bu rang mijoz sahifasi va uning tugmalarida ishlatiladi.</p>
        </div>
        <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-white p-1" value={color} onChange={(e) => setColor(e.target.value)} />
        <span className="font-mono text-xs text-muted">{color}</span>
        <button className="btn-primary !py-1.5" disabled={saveColor.isPending || color === org.data?.settings?.primary_color} onClick={() => saveColor.mutate(color)}>Rangni saqlash</button>
      </div>
    </div>
  )
}

function QRImage({ id, color, v }: { id: number; color: string; v: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => { let u = ''; api.get(`/qr-codes/${id}/image/`, { responseType: 'blob' }).then((r) => { u = URL.createObjectURL(r.data); setSrc(u) }); return () => { u && URL.revokeObjectURL(u) } }, [id, color, v])
  return src ? <img src={src} className="mx-auto h-40 w-40" alt="QR" /> : <Skeleton className="mx-auto h-40 w-40" />
}

export default function QRCodes() {
  const qc = useQueryClient(); const { can } = useAuth(); const w = can('owner', 'admin', 'manager')
  const canLogo = can('owner', 'admin')
  const [edit, setEdit] = useState<any>(null)
  const list = useQuery({ queryKey: ['qr'], queryFn: async () => (await api.get('/qr-codes/', { params: { page_size: 100 } })).data.results })
  const branches = useQuery({ queryKey: ['branches', 'opt'], queryFn: async () => (await api.get('/branches/', { params: { page_size: 100 } })).data.results })
  const depts = useQuery({ queryKey: ['departments', 'opt'], queryFn: async () => (await api.get('/departments/', { params: { page_size: 100 } })).data.results })
  const inv = () => qc.invalidateQueries({ queryKey: ['qr'] })
  const save = useMutation({ mutationFn: (v: any) => (v.id ? api.patch(`/qr-codes/${v.id}/`, v) : api.post('/qr-codes/', v)), onSuccess: () => { toast.success('Saqlandi'); setEdit(null); inv() }, onError: (e) => toast.error(errMsg(e)) })
  const toggle = useMutation({ mutationFn: (id: number) => api.post(`/qr-codes/${id}/toggle/`), onSuccess: inv })
  const del = useMutation({ mutationFn: (id: number) => api.delete(`/qr-codes/${id}/`), onSuccess: () => { toast.success('O‘chirildi'); inv() } })
  const dl = async (id: number, fmt: string) => { const r = await api.get(`/qr-codes/${id}/image/`, { params: { format: fmt, download: 1 }, responseType: 'blob' }); const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = `qr-${id}.${fmt}`; a.click() }
  const e = edit
  const ds = (depts.data || []).filter((d: any) => !e?.branch || d.branch === e.branch || !d.branch)
  return (
    <div>
      <PageHeader title="QR kodlar">{w && <button className="btn-primary" onClick={() => setEdit({ name: '', branch: null, department: null, location: '', color: '#0F172A', bg_color: '#FFFFFF', use_logo: true, is_active: true })}><Plus size={16} />Yangi QR</button>}</PageHeader>
      {canLogo && <LogoCard />}
      {list.isLoading ? <Skeleton className="h-64" /> : !list.data?.length ? <div className="card"><Empty title="QR kod yo‘q" hint="Birinchi QR-kodni yarating" /></div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.data.map((q: any) => (
          <div key={q.id} className={`card ${q.is_active ? '' : 'opacity-60'}`}>
            <QRImage id={q.id} color={q.color + q.bg_color + q.use_logo} v={q.token} />
            <h3 className="mt-3 font-semibold">{q.name}</h3>
            <p className="text-xs text-muted">{[q.branch_name, q.department_name, q.location].filter(Boolean).join(' · ') || '—'}</p>
            <p className="mt-2 text-xs text-muted">Skanerlangan: <b>{q.scans_count}</b> · Murojaatlar: <b>{q.feedback_count}</b></p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-ghost !px-2" onClick={() => dl(q.id, 'png')}><Download size={14} />PNG</button>
              <button className="btn-ghost !px-2" onClick={() => dl(q.id, 'pdf')}><Download size={14} />PDF</button>
              <button className="btn-ghost !px-2" onClick={() => { navigator.clipboard.writeText(q.public_url); toast.success('Havola nusxalandi') }}><Copy size={14} />Havola</button>
              {w && <><button className="btn-ghost !px-2" onClick={() => toggle.mutate(q.id)}><Power size={14} />{q.is_active ? 'O‘chirish' : 'Yoqish'}</button>
                <button className="btn-ghost !px-2" onClick={() => setEdit(q)}>Tahrir</button>
                <button className="btn-ghost !px-2 text-red-600" onClick={() => confirm('QR o‘chirilsinmi?') && del.mutate(q.id)}><Trash2 size={14} /></button></>}
            </div>
          </div>))}</div>)}
      <Modal open={!!e} onClose={() => setEdit(null)} title={e?.id ? 'QR-kodni tahrirlash' : 'Yangi QR-kod'}>
        {e && <form className="space-y-3" onSubmit={(ev) => { ev.preventDefault(); save.mutate(e) }}>
          <div><label className="label">QR-kod nomi</label><input className="input" required value={e.name} onChange={(x) => setEdit({ ...e, name: x.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Filial</label><select className="input" value={e.branch ?? ''} onChange={(x) => setEdit({ ...e, branch: x.target.value ? +x.target.value : null, department: null })}><option value="">—</option>{branches.data?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label className="label">Bo‘lim</label><select className="input" value={e.department ?? ''} onChange={(x) => setEdit({ ...e, department: x.target.value ? +x.target.value : null })}><option value="">—</option>{ds.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div><label className="label">Joylashuv nomi</label><input className="input" value={e.location} onChange={(x) => setEdit({ ...e, location: x.target.value })} placeholder="Masalan: Kassa yonida" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">QR rangi</label><input type="color" className="h-10 w-full rounded border border-border" value={e.color} onChange={(x) => setEdit({ ...e, color: x.target.value })} /></div>
            <div><label className="label">Fon rangi</label><input type="color" className="h-10 w-full rounded border border-border" value={e.bg_color} onChange={(x) => setEdit({ ...e, bg_color: x.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.use_logo} onChange={(x) => setEdit({ ...e, use_logo: x.target.checked })} />Tashkilot logotipini QR markaziga qo‘yish</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.is_active} onChange={(x) => setEdit({ ...e, is_active: x.target.checked })} />Faol</label>
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Bekor</button><button className="btn-primary" disabled={save.isPending}>Saqlash</button></div>
        </form>}
      </Modal>
    </div>
  )
}
