import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, download, errMsg } from '../services/api'
import { Empty, PageHeader, Skeleton } from '../components/ui'

const COLORS = ['#2563EB', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6']

function useReport() {
  const [p, setP] = useState({ period: 'daily', date_from: '', date_to: '' })
  const params = Object.fromEntries(Object.entries(p).filter(([, v]) => v))
  const q = useQuery({ queryKey: ['report', params], queryFn: async () => (await api.get('/analytics/reports/', { params })).data })
  const Filters = (
    <div className="card mb-4 flex flex-wrap items-end gap-2">
      <div><label className="label">Davr</label><select className="input" value={p.period} onChange={(e) => setP({ ...p, period: e.target.value })}><option value="daily">Kunlik</option><option value="weekly">Haftalik</option><option value="monthly">Oylik</option></select></div>
      <div><label className="label">Dan</label><input type="date" className="input" value={p.date_from} onChange={(e) => setP({ ...p, date_from: e.target.value })} /></div>
      <div><label className="label">Gacha</label><input type="date" className="input" value={p.date_to} onChange={(e) => setP({ ...p, date_to: e.target.value })} /></div>
    </div>)
  return { q, params, Filters }
}

const Table = ({ rows }: { rows: any[] }) => !rows?.length ? <Empty /> : (
  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr>{Object.keys(rows[0]).map((k) => <th key={k} className="px-3 py-2">{k}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{Object.values(r).map((v: any, j) => <td key={j} className="px-3 py-2">{v ?? '—'}</td>)}</tr>)}</tbody></table></div>)

export function Statistics() {
  const { q, Filters } = useReport(); const r = q.data
  return (
    <div><PageHeader title="Statistika" />{Filters}
      {q.isLoading || !r ? <Skeleton className="h-80" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card lg:col-span-2"><h3 className="mb-3 font-medium">Murojaatlar dinamikasi</h3>
            {!r.series.length ? <Empty /> : <ResponsiveContainer width="100%" height={280}><LineChart data={r.series}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="period" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
              <Line dataKey="suggestions" name="Takliflar" stroke="#2563EB" /><Line dataKey="complaints" name="Shikoyatlar" stroke="#EF4444" /><Line dataKey="ratings" name="Baholar" stroke="#F59E0B" /></LineChart></ResponsiveContainer>}</div>
          <div className="card"><h3 className="mb-3 font-medium">Takliflar / shikoyatlar nisbati</h3>
            <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={r.ratio} dataKey="count" nameKey="type" outerRadius={85} label>{r.ratio.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
          <div className="card"><h3 className="mb-3 font-medium">Eng ko‘p shikoyat kategoriyalari</h3>
            {!r.top_complaint_categories.length ? <Empty /> : <ResponsiveContainer width="100%" height={240}><BarChart data={r.top_complaint_categories} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="category" width={110} fontSize={12} /><Tooltip /><Bar dataKey="count" name="Soni" fill="#EF4444" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>}</div>
          <div className="card"><h3 className="mb-3 font-medium">Filiallar</h3>
            {!r.branches.length ? <Empty /> : <ResponsiveContainer width="100%" height={240}><BarChart data={r.branches}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="branch" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend /><Bar dataKey="total" name="Murojaatlar" fill="#2563EB" /><Bar dataKey="scans" name="Skanerlar" fill="#10B981" /></BarChart></ResponsiveContainer>}</div>
          <div className="card"><h3 className="mb-3 font-medium">Hal qilish vaqti</h3>
            <p className="text-3xl font-semibold">{r.resolution.avg_hours ?? '—'}<span className="text-base font-normal text-muted"> soat (o‘rtacha)</span></p><p className="text-sm text-muted">Hal qilingan murojaatlar: {r.resolution.resolved}</p></div>
        </div>)}
    </div>
  )
}

export function Reports() {
  const { q, params, Filters } = useReport(); const r = q.data
  const exp = (format: string, what?: string) => download('/analytics/export/', { ...params, format, what }, `hisobot.${format}`).catch((e) => toast.error(errMsg(e)))
  const sec = (t: string, rows: any[]) => <div className="card" key={t}><h3 className="mb-2 font-medium">{t}</h3><Table rows={rows} /></div>
  return (
    <div>
      <PageHeader title="Hisobotlar">
        <button className="btn-ghost" onClick={() => exp('xlsx')}><Download size={16} />Excel</button>
        <button className="btn-ghost" onClick={() => exp('pdf')}><Download size={16} />PDF</button>
        <button className="btn-ghost" onClick={() => exp('xlsx', 'feedbacks')}><Download size={16} />Murojaatlar (Excel)</button>
      </PageHeader>{Filters}
      {q.isLoading || !r ? <Skeleton className="h-80" /> : <div className="space-y-4">
        {sec('Davr bo‘yicha murojaatlar', r.series)}{sec('Filiallar statistikasi', r.branches)}{sec('Bo‘limlar statistikasi', r.departments)}
        {sec('Eng ko‘p shikoyat kategoriyalari', r.top_complaint_categories)}{sec('Xodimlar samaradorligi', r.staff)}</div>}
    </div>
  )
}
