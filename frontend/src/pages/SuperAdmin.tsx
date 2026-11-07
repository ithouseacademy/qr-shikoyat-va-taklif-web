import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, errMsg } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Empty, Modal, PageHeader, StatCard, TableSkeleton } from '../components/ui'
import { fmtDate } from '../utils'

export function SuperLayout() {
  const { logout, user } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between bg-dark px-4 text-white">
        <div className="flex items-center gap-4"><span className="flex items-center gap-2 font-semibold"><img src="/logo.png" alt="WEBSTORM IT" className="h-8 w-auto rounded bg-white object-contain p-1" />Super Admin</span>
          {[['/super', 'Statistika', true], ['/super/organizations', 'Tashkilotlar'], ['/super/users', 'Foydalanuvchilar'], ['/super/audit', 'Audit loglar']].map(([to, l, end]: any) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>{l}</NavLink>)}</div>
        <button onClick={logout} className="flex items-center gap-1 text-sm"><LogOut size={16} />{user?.email}</button>
      </header>
      <main className="mx-auto max-w-[1400px] p-4 sm:p-6"><Outlet /></main>
    </div>
  )
}

export function SuperStats() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: async () => (await api.get('/admin/stats/')).data })
  const s = q.data || {}
  return <div><PageHeader title="Platforma statistikasi" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {[['Tashkilotlar', 'organizations'], ['Faol tashkilotlar', 'active_organizations'], ['Bloklangan', 'blocked_organizations'], ['Foydalanuvchilar', 'users'], ['Jami murojaatlar', 'feedbacks'], ['Faol QR-kodlar', 'active_qr'], ['Jami skanerlar', 'scans']].map(([l, k]) => <StatCard key={k} label={l} value={s[k] ?? '…'} />)}</div></div>
}

export function SuperOrgs() {
  const qc = useQueryClient(); const [search, setSearch] = useState('')
  const q = useQuery({ queryKey: ['admin-orgs', search], queryFn: async () => (await api.get('/admin/organizations/', { params: { search: search || undefined, page_size: 100 } })).data.results })
  const set = useMutation({ mutationFn: ({ id, status }: any) => api.patch(`/admin/organizations/${id}/`, { status }), onSuccess: () => { toast.success('Yangilandi'); qc.invalidateQueries({ queryKey: ['admin-orgs'] }) }, onError: (e) => toast.error(errMsg(e)) })
  return (
    <div><PageHeader title="Tashkilotlar"><input className="input !w-56" placeholder="Qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} /></PageHeader>
      <div className="card overflow-x-auto !p-0">{q.isLoading ? <TableSkeleton /> : !q.data?.length ? <Empty /> : (
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr>{['Nomi', 'Slug', 'Xodimlar', 'Murojaatlar', 'Faol QR', 'Yaratilgan', 'Holat'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
          <tbody>{q.data.map((o: any) => <tr key={o.id} className="border-t border-border"><td className="px-3 py-3 font-medium">{o.name}</td><td className="px-3 py-3">{o.slug}</td><td className="px-3 py-3">{o.members_count}</td><td className="px-3 py-3">{o.feedback_count}</td><td className="px-3 py-3">{o.qr_count}</td><td className="px-3 py-3">{fmtDate(o.created_at)}</td>
            <td className="px-3 py-3"><select className="input !w-auto" value={o.status} onChange={(e) => set.mutate({ id: o.id, status: e.target.value })}><option value="active">Faol</option><option value="inactive">Faol emas</option><option value="blocked">Bloklangan</option></select></td></tr>)}</tbody></table>)}</div></div>
  )
}

const ROLE_LABEL: Record<string, string> = { owner: 'Egasi', admin: 'Admin', manager: 'Menejer', employee: 'Xodim' }

export function SuperUsers() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const q = useQuery({ queryKey: ['admin-users'], queryFn: async () => (await api.get('/admin/users/', { params: { page_size: 100 } })).data.results })
  const selected = q.data?.find((u: any) => u.id === selectedId)
  const t = useMutation({ mutationFn: (u: any) => api.patch(`/admin/users/${u.id}/`, { is_active: !u.is_active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }), onError: (e) => toast.error(errMsg(e)) })
  const branding = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) => api.patch(`/admin/users/${id}/`, { show_branding: value }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['public'] }) },
    onError: (e) => toast.error(errMsg(e)),
  })
  return <div><PageHeader title="Foydalanuvchilar" /><div className="card overflow-x-auto !p-0">{q.isLoading ? <TableSkeleton /> : (
    <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr>{['Ism', 'Email', 'Telefon', 'Tashkilot', 'Holat'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
      <tbody>{q.data.map((u: any) => <tr key={u.id} onClick={() => setSelectedId(u.id)} className="cursor-pointer border-t border-border hover:bg-slate-50"><td className="px-3 py-3">{u.full_name}</td><td className="px-3 py-3">{u.email}</td><td className="px-3 py-3">{u.phone || '—'}</td><td className="px-3 py-3">{u.organization || (u.is_superuser ? 'Super Admin' : '—')}</td>
        <td className="px-3 py-3">{!u.is_superuser && <button className={u.is_active ? 'btn-ghost' : 'btn-primary'} onClick={(e) => { e.stopPropagation(); t.mutate(u) }}>{u.is_active ? 'Bloklash' : 'Faollashtirish'}</button>}</td></tr>)}</tbody></table>)}</div>
    <Modal open={!!selected} onClose={() => setSelectedId(null)} title="Foydalanuvchi ma’lumoti">
      {selected && <div className="space-y-2 text-sm">
        {[['Ism-familiya', selected.full_name || '—'], ['Email', selected.email], ['Telefon', selected.phone || '—'], ['Tashkilot', selected.organization || (selected.is_superuser ? 'Super Admin' : '—')], ['Rol', selected.role ? (ROLE_LABEL[selected.role] || selected.role) : '—'], ['Holat', selected.is_active ? 'Faol' : 'Bloklangan'], ['Ro‘yxatdan o‘tgan', fmtDate(selected.date_joined)], ['Oxirgi kirish', selected.last_login ? fmtDate(selected.last_login) : '—']].map(([l, v]) => (
          <div key={l} className="flex justify-between gap-3 border-b border-border py-1.5"><span className="text-muted">{l}</span><span className="text-right font-medium">{v}</span></div>))}
        {selected.organization ? <div className="border-t border-border pt-3">
          <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="h-4 w-4" checked={!!selected.show_branding} disabled={branding.isPending} onChange={(e) => branding.mutate({ id: selected.id, value: e.target.checked })} />WEBSTORM IT brendingini mijoz sahifasida ko‘rsatish</label>
          <p className="mt-1 text-xs text-muted">O‘chirilsa, bu tashkilotning mijoz QR sahifasidagi “WEBSTORM IT” va “Dastur haqida” bloki umuman ko‘rinmaydi.</p>
        </div> : <p className="border-t border-border pt-3 text-xs text-muted">Super admin uchun tashkilot va brending sozlamasi mavjud emas.</p>}
      </div>}
    </Modal>
  </div>
}

export function SuperAudit() {  const q = useQuery({ queryKey: ['admin-audit'], queryFn: async () => (await api.get('/admin/audit/', { params: { page_size: 100 } })).data.results })
  return <div><PageHeader title="Audit loglar" /><div className="card overflow-x-auto !p-0">{q.isLoading ? <TableSkeleton /> : !q.data?.length ? <Empty /> : (
    <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr>{['Vaqt', 'Foydalanuvchi', 'Tashkilot', 'Amal', 'Obyekt', 'IP'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
      <tbody>{q.data.map((a: any) => <tr key={a.id} className="border-t border-border"><td className="whitespace-nowrap px-3 py-2">{fmtDate(a.created_at)}</td><td className="px-3 py-2">{a.user_name || '—'}</td><td className="px-3 py-2">{a.organization_name || '—'}</td><td className="px-3 py-2">{a.action}</td><td className="px-3 py-2">{a.entity} #{a.entity_id}</td><td className="px-3 py-2">{a.ip}</td></tr>)}</tbody></table>)}</div></div>
}
