import { ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, errMsg } from '../services/api'
import { Empty, Modal, PageHeader, TableSkeleton } from './ui'
import { useAuth } from '../contexts/AuthContext'

export interface Field { name: string; label: string; type?: 'text' | 'select' | 'checkbox' | 'password' | 'email'; options?: { value: any; label: string }[]; required?: boolean; createOnly?: boolean }
export interface Col { key: string; label: string; render?: (row: any) => ReactNode }

export default function CrudPage({ title, endpoint, columns, fields, canWrite = ['owner', 'admin'], noCreate, noDelete, noEdit, defaults = {}, extra }: {
  title: string; endpoint: string; columns: Col[]; fields: Field[]; canWrite?: string[]; noCreate?: boolean; noDelete?: boolean; noEdit?: boolean; defaults?: any; extra?: ReactNode
}) {
  const qc = useQueryClient()
  const { can } = useAuth()
  const writable = can(...canWrite)
  const [edit, setEdit] = useState<any | null>(null)
  const [q, setQ] = useState('')
  const list = useQuery({ queryKey: [endpoint, q], queryFn: async () => { const d = (await api.get(`/${endpoint}/`, { params: { search: q || undefined, page_size: 100 } })).data; return d.results ?? d } })
  const save = useMutation({
    mutationFn: (v: any) => (v.id ? api.patch(`/${endpoint}/${v.id}/`, v) : api.post(`/${endpoint}/`, v)),
    onSuccess: () => { toast.success('Saqlandi'); setEdit(null); qc.invalidateQueries({ queryKey: [endpoint] }) },
    onError: (e) => toast.error(errMsg(e)),
  })
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/${endpoint}/${id}/`),
    onSuccess: () => { toast.success('O‘chirildi'); qc.invalidateQueries({ queryKey: [endpoint] }) },
    onError: (e) => toast.error(errMsg(e)),
  })
  const rows: any[] = list.data || []

  return (
    <div>
      <PageHeader title={title}>
        <input className="input !w-48" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
        {writable && !noCreate && <button className="btn-primary" onClick={() => setEdit({ ...defaults })}><Plus size={16} />Qo‘shish</button>}
      </PageHeader>
      {extra}
      <div className="card overflow-x-auto !p-0">
        {list.isLoading ? <TableSkeleton /> : !rows.length ? <Empty hint="Hozircha hech narsa yo‘q" /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted"><tr>{columns.map((c) => <th key={c.key} className="px-4 py-3">{c.label}</th>)}{writable && <th className="px-4 py-3 text-right">Amallar</th>}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                {columns.map((c) => <td key={c.key} className="px-4 py-3">{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}
                {writable && <td className="whitespace-nowrap px-4 py-3 text-right">
                  {!noEdit && <button className="mr-2 text-muted hover:text-primary" onClick={() => setEdit(r)} aria-label="Tahrirlash"><Pencil size={16} /></button>}
                  {!noDelete && r.role !== 'owner' && <button className="text-muted hover:text-red-600" onClick={() => confirm('O‘chirilsinmi?') && del.mutate(r.id)} aria-label="O‘chirish"><Trash2 size={16} /></button>}
                </td>}
              </tr>))}</tbody>
          </table>)}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Tahrirlash' : 'Yangi qo‘shish'}>
        {edit && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(edit) }}>
          {fields.filter((f) => !(f.createOnly && edit.id)).map((f) => (
            <div key={f.name}>
              {f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit[f.name]} onChange={(e) => setEdit({ ...edit, [f.name]: e.target.checked })} />{f.label}</label>
              ) : (<>
                <label className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="input" required={f.required} value={edit[f.name] ?? ''} onChange={(e) => setEdit({ ...edit, [f.name]: e.target.value === '' ? null : isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })}>
                    <option value="">— tanlang —</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : <input className="input" type={f.type || 'text'} required={f.required} value={edit[f.name] ?? ''} onChange={(e) => setEdit({ ...edit, [f.name]: e.target.value })} />}
              </>)}
            </div>))}
          <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Bekor qilish</button><button className="btn-primary" disabled={save.isPending}>Saqlash</button></div>
        </form>}
      </Modal>
    </div>
  )
}
