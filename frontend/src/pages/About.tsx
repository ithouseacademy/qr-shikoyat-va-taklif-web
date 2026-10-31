import { Building2, CalendarDays, Code2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { APP_NAME, APP_OWNER, APP_VERSION } from '../version'

export default function About() {
  const nav = useNavigate()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Dastur haqida" />
      <div className="card text-center">
        <img src="/logo.png" alt="WEBSTORM IT" className="mx-auto mb-4 h-16 w-auto object-contain" />
        <h2 className="text-xl font-semibold">{APP_NAME}</h2>
        <p className="mt-2 text-sm text-muted">Taklif va shikoyatlarni QR-kod orqali qabul qilish, tahlil qilish va boshqarish uchun zamonaviy platforma.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-primary"><Building2 size={20} /></span>
          <div><p className="text-xs text-muted">Loyiha asoschisi</p><p className="font-semibold">WEBSTORM IT kompaniyasi</p></div>
        </div>
        <div className="card flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-primary"><ShieldCheck size={20} /></span>
          <div><p className="text-xs text-muted">Loyiha egasi</p><p className="font-semibold">WEBSTORM IT kompaniyasi</p></div>
        </div>
        <div className="card flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-primary"><Code2 size={20} /></span>
          <div><p className="text-xs text-muted">Ishlab chiqaruvchi</p><p className="font-semibold">WEBSTORM IT</p></div>
        </div>
        <div className="card flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-primary"><CalendarDays size={20} /></span>
          <div><p className="text-xs text-muted">Versiya</p><p className="font-semibold">{APP_VERSION}</p></div>
        </div>
      </div>

      <div className="card mt-4 text-sm text-muted">
        <p>Ushbu dastur <b className="text-ink">WEBSTORM IT kompaniyasiga tegishli</b>. Dasturiy ta’minot WEBSTORM IT tomonidan ishlab chiqilgan va texnik qo‘llab-quvvatlanadi.</p>
        <p className="mt-2">© {new Date().getFullYear()} {APP_OWNER}. Barcha huquqlar himoyalangan.</p>
      </div>

      <button onClick={() => nav(-1)} className="mt-4 text-sm text-primary">← Orqaga</button>
    </div>
  )
}
