import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { api, errMsg } from '../services/api'

type Item = { name: string; url: string }

export default function MenuLinks() {
  const qc = useQueryClient()
  const org = useQuery({ queryKey: ['organization-menu'], queryFn: async () => (await api.get('/organization/')).data })
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    if (org.data) setItems((org.data.settings?.menu_links || []).map((l: any) => ({ name: l.name || '', url: l.url || '' })))
  }, [org.data])

  const save = useMutation({
    mutationFn: async () => (await api.patch('/organization/', { settings: { menu_links: items } })).data,
    onSuccess: () => {
      toast.success('Saqlandi')
      qc.invalidateQueries({ queryKey: ['organization-menu'] })
      qc.invalidateQueries({ queryKey: ['organization'] })
    },
    onError: (e: any) => toast.error(errMsg(e)),
  })

  const update = (i: number, k: keyof Item, v: string) => setItems(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const add = () => items.length < 20 && setItems([...items, { name: '', url: '' }])
  const remove = (i: number) => setItems(items.filter((_, j) => j !== i))

  if (org.isLoading) return <div className="p-6 text-muted">Yuklanmoqda...</div>
  if (org.isError) return <div className="p-6 text-red-600">Ma’lumotni yuklab bo‘lmadi</div>

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Menyu havolalari</h1>
        <p className="mt-1 text-sm text-muted">
          Bu havolalar mijoz sahifasida “Taklif yuborish” tugmasi tepasida chiqadi. Havola qo‘shilmasa, hech narsa ko‘rinmaydi.
        </p>
      </div>

      {!items.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">Havolalar hali qo‘shilmagan.</p>}

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
            <input
              className="input sm:w-48"
              placeholder="Nomi (masalan, Menyu)"
              maxLength={40}
              value={it.name}
              onChange={(e) => update(i, 'name', e.target.value)}
            />
            <input
              className="input flex-1"
              placeholder="https://..."
              maxLength={500}
              value={it.url}
              onChange={(e) => update(i, 'url', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="O‘chirish"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={add}
          disabled={items.length >= 20}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          <Plus size={16} />Havola qo‘shish
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </div>
  )
}