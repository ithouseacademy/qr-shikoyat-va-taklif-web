import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, errMsg } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { PageHeader } from '../components/ui'
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported } from '../services/push'
import { Categories } from './Lists'
import { mediaUrl } from '../utils'

const Toggle = ({ label, checked, onChange }: any) => <label className="flex items-center justify-between py-2 text-sm"><span>{label}</span><input type="checkbox" className="h-4 w-4" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /></label>
const PREFS: [string, string][] = [['new_suggestion', 'Yangi taklif'], ['new_complaint', 'Yangi shikoyat'], ['new_rating', 'Yangi baho'], ['assigned', 'Murojaat biriktirilishi'], ['reply', 'Murojaatga yangi javob/izoh'], ['status_changed', 'Holat o‘zgarishi'], ['system', 'Muhim tizim xabarlari']]

function PushSettings() {
  const qc = useQueryClient()
  const [on, setOn] = useState(false); const [busy, setBusy] = useState(false)
  useEffect(() => { currentSubscription().then((s) => setOn(!!s)).catch(() => {}) }, [])
  const prefs = useQuery({ queryKey: ['prefs'], queryFn: async () => (await api.get('/notification-preferences/')).data })
  const devices = useQuery({ queryKey: ['devices'], queryFn: async () => (await api.get('/push/devices/')).data })
  const save = useMutation({ mutationFn: (v: any) => api.put('/notification-preferences/', v), onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs'] }) })
  const toggle = async () => {
    setBusy(true)
    try { if (on) { await disablePush(); setOn(false); toast.success('Push o‘chirildi') } else { await enablePush(); setOn(true); toast.success('Push yoqildi') } qc.invalidateQueries({ queryKey: ['devices'] }) }
    catch (e: any) { toast.error(e?.response ? errMsg(e) : e.message) } finally { setBusy(false) }
  }
  return (
    <div className="card">
      <h3 className="mb-2 font-medium">Push bildirishnomalar</h3>
      {!pushSupported() && <p className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-800">Bu brauzer push bildirishnomani qo‘llab-quvvatlamaydi.</p>}
      {isIOS() && !isStandalone() && <p className="mb-2 rounded bg-blue-50 p-2 text-sm text-blue-800">iPhone/iPad (iOS 16.4+): Safari’da <b>Share → Add to Home Screen</b> orqali ilovani o‘rnating, so‘ng uni ochib shu yerdan push’ni yoqing.</p>}
      <button className={on ? 'btn-ghost' : 'btn-primary'} disabled={busy || !pushSupported()} onClick={toggle}>{on ? 'Bu qurilmada push’ni o‘chirish' : 'Bu qurilmada push’ni yoqish'}</button>
      {typeof Notification !== 'undefined' && Notification.permission === 'denied' && <p className="mt-2 text-xs text-red-600">Brauzer sozlamalarida bildirishnomalar bloklangan. Tizim baribir ishlaydi, lekin push kelmaydi.</p>}
      {prefs.data && <div className="mt-4 divide-y divide-border">
        <Toggle label="Push bildirishnomalarni qabul qilish" checked={prefs.data.push_enabled} onChange={(v: boolean) => save.mutate({ push_enabled: v })} />
        {PREFS.map(([k, l]) => <Toggle key={k} label={l} checked={prefs.data[k]} onChange={(v: boolean) => save.mutate({ [k]: v })} />)}</div>}
      <p className="mt-4 text-xs text-muted">Ulangan qurilmalar: {devices.data?.length ?? 0}</p>
      {devices.data?.map((d: any) => <p key={d.id} className="flex items-center gap-1 truncate text-xs text-muted"><Smartphone size={12} />{d.user_agent.slice(0, 70)}</p>)}
    </div>
  )
}

function OrgSettings() {
  const { user, refresh, can } = useAuth(); const qc = useQueryClient()
  const q = useQuery({ queryKey: ['org'], queryFn: async () => (await api.get('/organization/')).data })
  const [f, setF] = useState<any>(null); const [logo, setLogo] = useState<File | null>(null)
  useEffect(() => { if (q.data) setF({ name: q.data.name, ...q.data.settings }) }, [q.data])
  if (!f) return null
  const w = can('owner', 'admin')
  const submit = async (e: any) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', f.name); ['primary_color', 'welcome_text', 'contact_phone', 'contact_email', 'address'].forEach((k) => fd.append(`settings.${k}`, f[k] ?? ''))
    if (logo) fd.append('logo', logo)
    try { await api.patch('/organization/', fd); toast.success('Saqlandi'); await refresh(); qc.invalidateQueries({ queryKey: ['org'] }) } catch (er) { toast.error(errMsg(er)) }
  }
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  return (
    <form className="card space-y-3" onSubmit={submit}>
      <h3 className="font-medium">Tashkilot va mijozlar sahifasi</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Tashkilot nomi</label><input className="input" disabled={!w} value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label className="label">Brend rangi</label><input type="color" className="h-10 w-full rounded border border-border" disabled={!w} value={f.primary_color} onChange={(e) => set('primary_color', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Xush kelibsiz matni</label><input className="input" disabled={!w} value={f.welcome_text} onChange={(e) => set('welcome_text', e.target.value)} /></div>
        <div><label className="label">Aloqa telefoni</label><input className="input" disabled={!w} value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} /></div>
        <div><label className="label">Aloqa emaili</label><input className="input" disabled={!w} value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Manzil</label><input className="input" disabled={!w} value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Logotip (JPG/PNG/WEBP, 5MB gacha)</label>{user?.organization?.logo && <img src={mediaUrl(user.organization.logo)} className="mb-2 h-14 rounded" />}<input type="file" accept="image/*" disabled={!w} onChange={(e) => setLogo(e.target.files?.[0] || null)} /></div>
      </div>
      {w && <button className="btn-primary">Saqlash</button>}
    </form>
  )
}

const parseChatIds = (s: string) => Array.from(new Set(s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)))

function Integrations() {
  const { can } = useAuth(); const w = can('owner', 'admin')
  const [tg, setTg] = useState<any>({ enabled: false, bot_token: '' })
  const [tgText, setTgText] = useState('')
  const [em, setEm] = useState<any>({ recipients: '', enabled: false })
  useEffect(() => {
    api.get('/integrations/telegram/').then((r) => { setTg((x: any) => ({ ...x, ...r.data, bot_token: '' })); setTgText((r.data.chat_ids || []).join('\n')) })
    api.get('/integrations/email/').then((r) => setEm(r.data))
  }, [])
  const ids = parseChatIds(tgText)
  const removeId = (id: string) => setTgText(ids.filter((x) => x !== id).join('\n'))
  const run = (p: Promise<any>, ok: string) => p.then((r) => toast.success(r.data?.detail || ok)).catch((e) => toast.error(errMsg(e)))
  const saveTg = () => run(api.put('/integrations/telegram/', { ...tg, chat_ids: ids }).then((r) => {
    setTg((x: any) => ({ ...x, ...r.data, bot_token: '' })); setTgText((r.data.chat_ids || []).join('\n')); return r
  }), 'Saqlandi')
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-2"><h3 className="font-medium">Telegram bot</h3>
        <input className="input" type="password" placeholder={tg.has_token ? 'Token saqlangan (o‘zgartirish uchun yangisini kiriting)' : 'Bot token'} disabled={!w} onChange={(e) => setTg({ ...tg, bot_token: e.target.value })} />
        <label className="label">Chat ID’lar (cheksiz)</label>
        <textarea className="input font-mono text-xs" rows={3} placeholder={'Har bir chat ID yangi qator yoki vergul bilan\nmasalan: 123456789, -987654321'} disabled={!w} value={tgText} onChange={(e) => setTgText(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs">{id}<button type="button" onClick={() => removeId(id)} disabled={!w} aria-label="O‘chirish" className="text-muted hover:text-red-600">×</button></span>)}
          {!ids.length && <span className="text-xs text-muted">Chat ID qo‘shilmagan</span>}
        </div>
        <Toggle label="Yoqilgan" checked={tg.enabled} onChange={(v: boolean) => setTg({ ...tg, enabled: v })} />
        {w && <div className="flex gap-2"><button className="btn-primary" onClick={saveTg}>Saqlash</button><button className="btn-ghost" onClick={() => run(api.post('/integrations/telegram/'), 'Yuborildi')}>Test xabar</button></div>}</div>
      <div className="card space-y-2"><h3 className="font-medium">Email bildirishnomalar</h3>
        <input className="input" placeholder="a@x.uz, b@x.uz" disabled={!w} value={em.recipients} onChange={(e) => setEm({ ...em, recipients: e.target.value })} />
        <Toggle label="Yoqilgan" checked={em.enabled} onChange={(v: boolean) => setEm({ ...em, enabled: v })} />
        {w && <button className="btn-primary" onClick={() => run(api.put('/integrations/email/', em), 'Saqlandi')}>Saqlash</button>}</div>
    </div>
  )
}

function Profile() {
  const { user, refresh } = useAuth(); const [p, setP] = useState({ full_name: user?.full_name || '', phone: user?.phone || '', email: user?.email || '' }); const [pw, setPw] = useState({ old_password: '', new_password: '' })
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form className="card space-y-2" onSubmit={(e) => { e.preventDefault(); api.patch('/auth/me/', p).then(() => { toast.success('Saqlandi'); refresh() }).catch((er) => toast.error(errMsg(er))) }}>
        <h3 className="font-medium">Profil</h3>
        <input className="input" value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /><input className="input" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /><input className="input" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} />
        <button className="btn-primary">Saqlash</button></form>
      <form className="card space-y-2" onSubmit={(e) => { e.preventDefault(); api.post('/auth/change-password/', pw).then(() => { toast.success('Parol yangilandi'); setPw({ old_password: '', new_password: '' }) }).catch((er) => toast.error(errMsg(er))) }}>
        <h3 className="font-medium">Parolni o‘zgartirish</h3>
        <input className="input" type="password" placeholder="Eski parol" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} /><input className="input" type="password" placeholder="Yangi parol" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
        <button className="btn-primary">Yangilash</button></form>
    </div>
  )
}

export default function Settings() {
  const { can } = useAuth(); const [tab, setTab] = useState('org')
  const tabs = [['org', 'Tashkilot'], ['push', 'Push'], ['integ', 'Telegram / Email'], ['cats', 'Kategoriyalar'], ['profile', 'Profil']]
  return (
    <div><PageHeader title="Sozlamalar" />
      <div className="mb-4 flex gap-1 overflow-x-auto">{tabs.filter(([k]) => can('owner', 'admin') || ['push', 'profile', 'org'].includes(k)).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn-primary' : 'btn-ghost'}>{l}</button>)}</div>
      {tab === 'org' && <OrgSettings />}{tab === 'push' && <PushSettings />}{tab === 'integ' && <Integrations />}{tab === 'cats' && <Categories />}{tab === 'profile' && <Profile />}
    </div>
  )
}
