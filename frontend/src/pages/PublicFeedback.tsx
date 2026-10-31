import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ImagePlus, Lightbulb, Lock, MessageSquareWarning, Phone, Play, Share2, Star, MapPin } from 'lucide-react'
import { api, errMsg } from '../services/api'
import { enqueue, flushQueue } from '../services/offlineQueue'
import { SocialIcon } from '../utils/social'
import { mediaUrl, uuid } from '../utils'

type Mode = 'home' | 'suggestion' | 'complaint' | 'rating' | 'social' | 'done'

async function send(token: string, key: string, payload: Record<string, any>, files: File[] = []) {
  const fd = new FormData()
  Object.entries(payload).forEach(([k, v]) => v !== '' && v != null && fd.append(k, String(v)))
  files.forEach((f) => fd.append('attachments', f))
  return (await api.post(`/public/qr/${token}/feedback/`, fd, { headers: { 'Idempotency-Key': key } })).data
}

function FileThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [src, setSrc] = useState('')
  const video = file.type.startsWith('video/')
  useEffect(() => { const u = URL.createObjectURL(file); setSrc(u); return () => URL.revokeObjectURL(u) }, [file])
  return <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-slate-100">
    {video ? <><video src={src} muted playsInline className="h-full w-full object-cover" /><span className="pointer-events-none absolute inset-0 grid place-items-center text-white"><Play size={18} fill="currentColor" /></span></> : <img src={src} className="h-full w-full object-cover" alt="" />}
    <button type="button" onClick={onRemove} aria-label="O‘chirish" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs leading-none text-white">×</button>
  </div>
}

export default function PublicFeedback() {
  const { token = '' } = useParams()
  const q = useQuery({ queryKey: ['public', token], retry: false, queryFn: async () => (await api.get(`/public/qr/${token}/`)).data })
  const [mode, setMode] = useState<Mode>('home')
  const [form, setForm] = useState({ category: '', text: '', rating: 0, website: '' })
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<{ number?: string; queued?: boolean }>({})
  const [lastNumber, setLastNumber] = useState('')
  const [hideReminder, setHideReminder] = useState(false)
  const keyRef = useRef(uuid())
  const lastKey = `last_fb_${token}`
  useEffect(() => { setLastNumber(localStorage.getItem(lastKey) || ''); setHideReminder(false) }, [lastKey])
  const last = useQuery({ queryKey: ['last-feedback', token, lastNumber], enabled: !!lastNumber, retry: false, queryFn: async () => (await api.get(`/public/track/${lastNumber}/`)).data })

  useEffect(() => {
    const go = () => flushQueue((i) => send(i.token, i.key, i.payload).then(() => {}))
    window.addEventListener('online', go); go(); return () => window.removeEventListener('online', go)
  }, [])

  if (q.isLoading) return <div className="grid min-h-screen place-items-center text-muted">Yuklanmoqda...</div>
  if (q.isError) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-xl font-semibold">QR-kod topilmadi</h1><p className="mt-1 text-sm text-muted">Bu QR-kod faol emas yoki mavjud emas.</p></div></div>
  const d = q.data, o = d.organization, brand = o.primary_color || '#2563EB'
  const cats = d.categories.filter((c: any) => c.kind === 'both' || c.kind === mode)
  const social = o.social_links || []
  const actions: any[] = [['suggestion', 'Taklif yuborish', Lightbulb], ['complaint', 'Shikoyat yuborish', MessageSquareWarning], ['rating', 'Xizmatni baholash', Star]]
  if (social.length) actions.push(['social', 'Ijtimoiy tarmoqlar', Share2])
  const set = (k: string, v: any) => setForm({ ...form, [k]: v })

  const pickFiles = (e: any) => {
    const merged = [...files]
    let message = ''
    for (const f of Array.from(e.target.files || []) as File[]) {
      const video = f.type.startsWith('video/')
      if (f.size > 20 * 1024 * 1024) { message = 'Fayl hajmi 20MB dan oshmasin'; continue }
      if (video && merged.some((x) => x.type.startsWith('video/'))) { message = 'Faqat 1 ta video biriktirish mumkin'; continue }
      if (!video && merged.filter((x) => !x.type.startsWith('video/')).length >= 3) { message = 'Ko‘pi bilan 3 ta rasm biriktirish mumkin'; continue }
      merged.push(f)
    }
    setErr(message); setFiles(merged); e.target.value = ''
  }

  const submit = async (e: any) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const payload: any = { type: mode, category: form.category, text: form.text, website: form.website }
    if (mode === 'rating') payload.rating = form.rating
    try {
      const r = await send(token, keyRef.current, payload, files)
      if (r.number) { localStorage.setItem(lastKey, r.number); setLastNumber(r.number) }
      setResult({ number: r.number }); setMode('done')
    } catch (ex: any) {
      if (!ex?.response && !files.length) { enqueue({ token, key: keyRef.current, payload }); setResult({ queued: true }); setMode('done') }
      else setErr(ex?.response ? errMsg(ex) : 'Internet aloqasi yo‘q. Rasm bilan yuborish uchun internet kerak.')
    } finally { setBusy(false) }
  }
  const reset = () => { setForm({ category: '', text: '', rating: 0, website: '' }); setFiles([]); keyRef.current = uuid(); setMode('home'); setErr('') }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div className="px-5 pb-8 pt-8 text-center text-white" style={{ background: brand }}>
        {o.logo ? <img src={mediaUrl(o.logo)} className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-white object-contain p-1" /> : <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-2xl font-bold">{o.name[0]}</div>}
        <h1 className="text-xl font-semibold">{o.name}</h1>
        {(d.branch || d.department) && <p className="mt-1 flex items-center justify-center gap-1 text-sm opacity-90"><MapPin size={14} />{[d.branch, d.department].filter(Boolean).join(' · ')}</p>}
      </div>
      <div className="-mt-4 flex-1 rounded-t-3xl bg-white p-5">
        {mode === 'home' && <>
          <p className="mb-5 text-center text-sm text-muted">{o.welcome_text}</p>
          {!!lastNumber && !hideReminder && last.data && <div className="mb-4 rounded-2xl border border-border bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Siz bizga yozgan murojaat: {last.data.status_display}</p>
                {last.data.replies?.length
                  ? <p className="mt-1 text-xs text-muted">{last.data.replies[last.data.replies.length - 1].text}</p>
                  : <p className="mt-1 text-xs text-muted">Siz bizga yozgan murojaatingiz qabul qilindi. Holati o‘zgarsa shu yerda ko‘rinadi.</p>}
              </div>
              <button type="button" onClick={() => setHideReminder(true)} aria-label="Yopish" className="shrink-0 rounded-lg px-1.5 text-lg leading-none text-muted hover:bg-slate-200">×</button>
            </div>
          </div>}
          <div className="space-y-3">
            {actions.map(([m, l, I]: any) => (
              <button key={m} onClick={() => setMode(m)} className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left active:scale-[.99]"><span className="rounded-xl p-2 text-white" style={{ background: brand }}><I size={22} /></span><span className="font-medium">{l}</span></button>))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted"><Lock size={13} />Sizning kimligingiz bizga ko‘rinmaydi.</p>
          {(o.contact_phone || o.contact_email || o.address) && <div className="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-muted"><p className="mb-1 flex items-center gap-1 font-medium text-ink"><Phone size={14} />Aloqa</p>{o.contact_phone && <p><a href={`tel:${o.contact_phone}`}>{o.contact_phone}</a></p>}{o.contact_email && <p>{o.contact_email}</p>}{o.address && <p>{o.address}</p>}</div>}
        </>}

        {mode === 'social' && <div className="space-y-3">
          <button type="button" onClick={() => setMode('home')} className="text-sm text-muted">← Orqaga</button>
          <h2 className="text-lg font-semibold">Ijtimoiy tarmoqlar</h2>
          {!social.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">Havolalar hali qo‘shilmagan.</p>}
          <div className="space-y-3">
            {social.map((l: any, i: number) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left active:scale-[.99]">
                <span className="rounded-xl p-2 text-white" style={{ background: brand }}><SocialIcon platform={l.platform} size={22} /></span>
                <span className="font-medium">{l.name}</span>
              </a>))}
          </div>
        </div>}

        {(mode === 'suggestion' || mode === 'complaint' || mode === 'rating') && (
          <form className="space-y-3" onSubmit={submit}>
            <button type="button" onClick={() => setMode('home')} className="text-sm text-muted">← Orqaga</button>
            <h2 className="text-lg font-semibold">{mode === 'suggestion' ? 'Taklif yuborish' : mode === 'complaint' ? 'Shikoyat yuborish' : 'Xizmatni baholash'}</h2>
            {mode === 'rating' && <div className="flex justify-center gap-2 py-2">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => set('rating', n)} aria-label={`${n} yulduz`}><Star size={38} fill={n <= form.rating ? '#F59E0B' : 'none'} color={n <= form.rating ? '#F59E0B' : '#CBD5E1'} /></button>)}</div>}
            {mode !== 'rating' && <select className="input !py-3" value={form.category} onChange={(e) => set('category', e.target.value)}><option value="">Kategoriya</option>{cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            <textarea className="input !py-3" rows={mode === 'rating' ? 3 : 5} required={mode !== 'rating'} minLength={mode === 'rating' ? 0 : 5} maxLength={3000} placeholder={mode === 'rating' ? 'Izoh (ixtiyoriy)' : mode === 'suggestion' ? 'Taklifingiz matni' : 'Shikoyat matni'} value={form.text} onChange={(e) => set('text', e.target.value)} />
            <input className="hidden" tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={(e) => set('website', e.target.value)} />
            {mode !== 'rating' && <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted"><ImagePlus size={18} />{files.length ? `${files.filter((f) => !f.type.startsWith('video/')).length} rasm, ${files.filter((f) => f.type.startsWith('video/')).length} video tanlandi` : 'Rasm 3 tagacha, video 1 ta'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={pickFiles} /></label>}
            {!!files.length && <div className="flex flex-wrap gap-2">{files.map((f, i) => <FileThumb key={`${f.name}-${i}`} file={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />)}</div>}
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="w-full rounded-xl py-3.5 font-medium text-white disabled:opacity-50" style={{ background: brand }} disabled={busy || (mode === 'rating' && !form.rating)}>{busy ? 'Yuborilmoqda...' : 'Yuborish'}</button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted"><Lock size={13} />Sizning kimligingiz bizga ko‘rinmaydi. Ro‘yxatdan o‘tish shart emas.</p>
          </form>)}

        {mode === 'done' && <div className="py-8 text-center">
          <CheckCircle2 size={72} className="mx-auto text-emerald-500" />
          <h2 className="mt-3 text-xl font-semibold">{result.queued ? 'Saqlandi' : 'Rahmat!'}</h2>
          <p className="mt-1 text-sm text-muted">{result.queued ? 'Internet yo‘q. Aloqa tiklanganda murojaatingiz avtomatik yuboriladi.' : 'Siz bizga yozgan murojaatingiz qabul qilindi.'}</p>
          <button className="mt-6 w-full rounded-xl py-3.5 font-medium text-white" style={{ background: brand }} onClick={reset}>Bosh sahifaga qaytish</button>
        </div>}
      </div>
      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        <img src="/logo.png" alt="WEBSTORM IT" className="mx-auto mb-1.5 h-8 w-auto object-contain" />
        <p>Dastur <span className="font-semibold text-ink">WEBSTORM IT</span> kompaniyasiga tegishli</p>
        <Link to="/about" className="text-primary">Dastur haqida</Link>
      </footer>
    </div>
  )
}

export function Track() {
  const { number = '' } = useParams()
  const q = useQuery({ queryKey: ['track', number], retry: false, queryFn: async () => (await api.get(`/public/track/${number}/`)).data })
  if (q.isLoading) return <div className="p-8 text-center text-muted">Yuklanmoqda...</div>
  if (q.isError) return <div className="p-8 text-center">Murojaat topilmadi</div>
  const t = q.data
  return (
    <div className="mx-auto max-w-md p-5"><h1 className="text-lg font-semibold">{t.organization}</h1><p className="font-mono text-sm text-muted">{t.number} · {t.type}</p>
      <p className="mt-3">Holat: <b>{t.status_display}</b></p>
      <div className="mt-4 space-y-2">{t.replies.map((r: any, i: number) => <div key={i} className="rounded-lg bg-blue-50 p-3 text-sm">{r.text}</div>)}{!t.replies.length && <p className="text-sm text-muted">Hozircha javob yo‘q.</p>}</div></div>
  )
}
