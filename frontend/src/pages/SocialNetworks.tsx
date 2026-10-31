import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, errMsg } from '../services/api'
import { PageHeader, Skeleton } from '../components/ui'
import { SOCIAL_PLATFORMS, SocialIcon, SocialLink, platformLabel } from '../utils/social'

type BaseRow = { name: string; url: string }

export default function SocialNetworks() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['org'], queryFn: async () => (await api.get('/organization/')).data })
  const [base, setBase] = useState<Record<string, BaseRow> | null>(null)
  const [custom, setCustom] = useState<SocialLink[]>([])

  useEffect(() => {
    if (!q.data) return
    const map: Record<string, BaseRow> = {}
    const extra: SocialLink[] = []
    ;(q.data.settings?.social_links || []).forEach((l: SocialLink) => {
      const isKnown = SOCIAL_PLATFORMS.some((p) => p.value === l.platform)
      if (isKnown && !map[l.platform]) map[l.platform] = { name: l.name || platformLabel(l.platform), url: l.url }
      else extra.push({ platform: l.platform, name: l.name || platformLabel(l.platform), url: l.url })
    })
    setBase(map)
    setCustom(extra)
  }, [q.data])

  const save = useMutation({
    mutationFn: (v: SocialLink[]) => api.patch('/organization/', { settings: { social_links: v } }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['org'] }) },
    onError: (e) => toast.error(errMsg(e)),
  })

  if (!base) return <div><PageHeader title="Ijtimoiy tarmoqlar" /><Skeleton className="h-64" /></div>

  const row = (platform: string): BaseRow => base[platform] || { name: platformLabel(platform), url: '' }
  const setRow = (platform: string, patch: Partial<BaseRow>) => setBase({ ...base, [platform]: { ...row(platform), ...patch } })
  const setExtra = (i: number, patch: Partial<SocialLink>) => setCustom(custom.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const removeExtra = (i: number) => setCustom(custom.filter((_, j) => j !== i))

  const active: SocialLink[] = [
    ...SOCIAL_PLATFORMS.filter((p) => row(p.value).url.trim()).map((p) => ({ platform: p.value, name: row(p.value).name.trim() || p.label, url: row(p.value).url.trim() })),
    ...custom.filter((l) => l.url.trim()).map((l) => ({ platform: l.platform, name: l.name.trim() || platformLabel(l.platform), url: l.url.trim() })),
  ]

  return (
    <div>
      <PageHeader title="Ijtimoiy tarmoqlar">
        <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate(active)}>Saqlash</button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card">
            <p className="mb-3 text-sm text-muted">Havolasi kiritilgan tarmoqlar mijozlar QR sahifasida chiqadi. Kerak bo‘lmaganini bo‘sh qoldiring.</p>
            <div className="divide-y divide-border">
              {SOCIAL_PLATFORMS.map((p) => (
                <div key={p.value} className="grid gap-2 py-3 sm:grid-cols-[130px_1fr]">
                  <div className="flex items-center gap-2 text-sm font-medium"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-primary"><SocialIcon platform={p.value} size={18} /></span>{p.label}</div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                    <input className="input" placeholder={`${p.label} havolasi (https://...)`} value={row(p.value).url} onChange={(e) => setRow(p.value, { url: e.target.value })} />
                    <input className="input" placeholder="Nomi" value={row(p.value).name} onChange={(e) => setRow(p.value, { name: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div><h3 className="font-medium">Boshqa havolalar</h3><p className="text-sm text-muted">O‘zingiz xohlagan nom, ikonka va havolani qo‘shing.</p></div>
              <button className="btn-ghost" onClick={() => setCustom([...custom, { platform: 'website', name: '', url: '' }])}><Plus size={16} />Qo‘shish</button>
            </div>
            {!custom.length && <p className="rounded-xl bg-slate-50 p-3 text-sm text-muted">Hozircha qo‘shimcha havola yo‘q.</p>}
            <div className="space-y-3">
              {custom.map((l, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
                    <select className="input" value={l.platform} onChange={(e) => setExtra(i, { platform: e.target.value })}>
                      {SOCIAL_PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <input className="input" placeholder="Nomi (masalan: Bizning kanal)" value={l.name} onChange={(e) => setExtra(i, { name: e.target.value })} />
                    <button className="btn-ghost !px-2 text-red-600" onClick={() => removeExtra(i)}><Trash2 size={16} /></button>
                  </div>
                  <input className="input mt-2" placeholder="Havola (https://...)" value={l.url} onChange={(e) => setExtra(i, { url: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 font-medium">Mijoz sahifasida ko‘rinishi</h3>
          <div className="space-y-2">
            {!active.length && <p className="text-sm text-muted">Havola kiritilgan tarmoqlar shu yerda ko‘rinadi.</p>}
            {active.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left text-sm">
                <span className="rounded-xl bg-primary p-2 text-white"><SocialIcon platform={l.platform} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{l.name}</span><span className="block truncate text-xs text-muted"><Link2 size={11} className="inline" /> {l.url}</span></span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
