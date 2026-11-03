import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LayoutTemplate, Move, Image as ImageIcon, Download, Save, Trash2, Plus, Minus, RotateCw } from 'lucide-react'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { PageHeader, Empty, Modal } from '../components/ui'
import { mediaUrl } from '../utils'

type Tpl = { id: string; name: string; preview: string; w: number; h: number }

const TEMPLATES: Tpl[] = [
  { id: 'card', name: 'Karta shaklida', preview: 'linear-gradient(135deg,#f8fafc 0%,#ffffff 60%,#eef2ff 100%)', w: 1080, h: 1350 },
  { id: 'flyer', name: 'Flyer A4/Vertikal', preview: 'linear-gradient(180deg,#0f1026 0%,#1f2937 40%,#f8fafc 40%,#ffffff 100%)', w: 1080, h: 1920 },
  { id: 'poster', name: 'Poster (4:5)', preview: 'linear-gradient(180deg,#ffffff 0%,#f1f5f9 100%)', w: 1080, h: 1350 },
  { id: 'story', name: 'Story (9:16)', preview: 'linear-gradient(135deg,#2563eb 0%,#1e293b 100%)', w: 1080, h: 1920 },
]

function Element({ el, onDrag, onDown, onWheel, scale = 1 }: any) {
  const style: any = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    transform: `translate(-50%,-50%) rotate(${el.rot}deg)`,
    cursor: 'move',
    userSelect: 'none',
    touchAction: 'none',
  }
  if (el.type === 'qr') {
    style.width = el.w
    style.height = el.h
  } else {
    style.width = el.w
    style.height = el.h
  }
  return (
    <div style={style} onMouseDown={(e) => onDown(e, el.id)} onTouchStart={(e) => onDown(e, el.id, true)} onWheel={(e) => onWheel(e, el.id)}>
      {el.type === 'qr' ? (
        <img src={el.src} alt="qr" className="h-full w-full" draggable={false} />
      ) : (
        <img src={el.src} alt="logo" className="h-full w-full object-contain" draggable={false} />
      )}
    </div>
  )
}

export default function QRTemplates() {
  const nav = useNavigate()
  const org = useQuery({ queryKey: ['org'], queryFn: async () => (await api.get('/organization/')).data })
  const qrs = useQuery({ queryKey: ['qr'], queryFn: async () => (await api.get('/qr-codes/', { params: { page_size: 100 } })).data.results })
  const [tpl, setTpl] = useState<Tpl | null>(null)
  const [open, setOpen] = useState(true)
  const [picker, setPicker] = useState(false)
  const [els, setEls] = useState<any[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [drag, setDrag] = useState<any>(null)
  const [zoom, setZoom] = useState(0.6)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ w: 1080, h: 1350 })

  const addQR = async (q: any) => {
    try {
      const r = await api.get(`/qr-codes/${q.id}/image/`, { responseType: 'blob', params: { format: 'png' } })
      const src = URL.createObjectURL(r.data)
      setEls((p) => [...p, { id: 'qr-' + Date.now(), type: 'qr', x: stage.w/2, y: stage.h/2, w: 320, h: 320, rot: 0, src }])
      setSel('qr-' + Date.now())
      setPicker(false)
      toast.success('QR qo‘shildi')
    } catch (e: any) { toast.error('QR yuklab bo‘lmadi') }
  }

  const addLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const src = URL.createObjectURL(f)
    setEls((p) => [...p, { id: 'lg-' + Date.now(), type: 'logo', x: stage.w/2, y: stage.h/4, w: 200, h: 200, rot: 0, src }])
    setSel('lg-' + Date.now())
    e.target.value = ''
  }

  const useOrgLogo = () => {
    if (!org.data?.logo) return toast.error('Logotip yo‘q')
    const src = mediaUrl(org.data.logo)
    setEls((p) => [...p, { id: 'lg-' + Date.now(), type: 'logo', x: stage.w/2, y: stage.h/5, w: 220, h: 220, rot: 0, src }])
    setSel('lg-' + Date.now())
  }

  const down = (ev: any, id: string, touch = false) => {
    ev.preventDefault()
    setSel(id)
    const p = touch ? ev.touches[0] : ev
    setDrag({ id, sx: p.clientX, sy: p.clientY, ox: els.find((x) => x.id === id).x, oy: els.find((x) => x.id === id).y })
  }

  const move = (ev: any) => {
    if (!drag) return
    const p = ev.touches ? ev.touches[0] : ev
    const dx = (p.clientX - drag.sx) / zoom
    const dy = (p.clientY - drag.sy) / zoom
    setEls((prev) => prev.map((x) => x.id === drag.id ? { ...x, x: drag.ox + dx, y: drag.oy + dy } : x))
  }

  const up = () => setDrag(null)

  const wheel = (ev: any, id: string) => {
    ev.preventDefault()
    const d = ev.deltaY > 0 ? -10 : 10
    setEls((prev) => prev.map((x) => x.id === id ? { ...x, w: Math.max(60, x.w + d), h: Math.max(60, x.h + d) } : x))
  }

  const selEl = useMemo(() => els.find((x) => x.id === sel), [els, sel])

  const exportPng = async () => {
    if (!stageRef.current) return
    setSel(null)
    await new Promise((r) => setTimeout(r, 50))
    const canvas = await html2canvas(stageRef.current, { scale: 2, useCORS: true, backgroundColor: null })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-shablon-${Date.now()}.png`
    a.click()
    toast.success('PNG yuklab olindi')
  }

  const pick = (t: Tpl) => { setTpl(t); setStage({ w: t.w, h: t.h }); setOpen(false) }

  return (
    <div>
      <PageHeader title="QR Shablonlar">
        <button className="btn-ghost" onClick={() => nav('/app/qr')}><LayoutTemplate size={16} />QR kodlar</button>
        {tpl && <button className="btn-primary" onClick={exportPng}><Download size={16} />PNG yuklab olish</button>}
      </PageHeader>

      {!tpl ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => pick(t)} className="card text-left transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-3 aspect-[4/5] w-full overflow-hidden rounded-xl" style={{ background: t.preview }} />
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted">{t.w} × {t.h} px</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr,280px]">
          <div className="card space-y-3">
            <div>
              <p className="mb-2 text-sm font-medium">Elementlar qo‘shish</p>
              <button className="btn-ghost w-full justify-start" onClick={() => setPicker(true)}><Plus size={16} />Mavjud QR kod qo‘shish</button>
              <label className="btn-ghost mt-2 w-full justify-start"><ImageIcon size={16} />Logotip yuklash<input type="file" className="hidden" accept="image/*" onChange={addLogo} /></label>
              {org.data?.logo && <button className="btn-ghost mt-2 w-full justify-start" onClick={useOrgLogo}><ImageIcon size={16} />Tashkilot logotipi</button>}
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium">Ko‘rinish</p>
              <div className="flex items-center gap-2">
                <button className="btn-ghost !px-2" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1)}><Minus size={14} /></button>
                <span class className="flex-1 text-center text-xs text-muted">{Math.round(zoom*100)%}%</span>
                <button className="btn-ghost !px-2" onclick={() => setZoom((z) => z + 1.0? setZoom((z) => Math.max(0.3, z - 0.1)) : setZoom((z))}</button>
              </div>
            </div>
            {selEl && (
              <div class className="border-t border-border pt-3 space-y-2">
                <p className="text-sm font-medium">Tanlangan element</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">Kenglik</label><input className="input !py-1.5" type="number" value={selEl.w} onChange={(e) => setEls((p) => p.map(x => x.id === sel ? { ...x, w: +e.target.value, h: +e.target.value } : x)} /></div>
                  <div><label className="label">Balandlik</label><input className="input !py-1.5" type="number" value={selEl.h} onChange={(e) => setEls((p) => p.map(x => x.id === sel ? {
