import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Clock, Inbox, Lightbulb, MessageSquareWarning, Sparkles, Star } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Empty, PageHeader, Skeleton, StatCard } from '../components/ui'

export const useSummary = () => useQuery({ queryKey: ['summary'], queryFn: async () => (await api.get('/analytics/summary/')).data })

export default function Dashboard() {
  const { can, user } = useAuth()
  const { data: s, isLoading } = useSummary()
  if (!can('owner', 'admin', 'manager')) return <div className="card"><h2 className="font-semibold">Xush kelibsiz, {user?.full_name}</h2><p className="mt-1 text-sm text-muted">Sizga biriktirilgan murojaatlarni “Murojaatlar” bo‘limida ko‘rishingiz mumkin.</p></div>
  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  const short = (d: any[]) => d.map((x) => ({ ...x, date: x.date.slice(5) }))
  return (
    <div className="space-y-4">
      <PageHeader title="Bosh sahifa" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jami murojaatlar" value={s.total} icon={<Inbox size={20} />} />
        <StatCard label="Yangi" value={s.new} icon={<Sparkles size={20} />} tone="text-blue-600" />
        <StatCard label="Ko‘rib chiqilmoqda" value={s.in_progress} icon={<Clock size={20} />} tone="text-amber-600" />
        <StatCard label="Hal qilingan" value={s.resolved} icon={<CheckCircle2 size={20} />} tone="text-emerald-600" />
        <StatCard label="Jami takliflar" value={s.suggestions} icon={<Lightbulb size={20} />} tone="text-violet-600" />
        <StatCard label="Jami shikoyatlar" value={s.complaints} icon={<MessageSquareWarning size={20} />} tone="text-red-600" />
        <StatCard label="O‘rtacha baho" value={s.avg_rating ?? '—'} icon={<Star size={20} />} tone="text-amber-500" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h3 className="mb-3 font-medium">Oxirgi 7 kun</h3>
          <ResponsiveContainer width="100%" height={260}><BarChart data={short(s.last7)}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="date" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
            <Bar dataKey="suggestion" name="Takliflar" fill="#2563EB" radius={[4, 4, 0, 0]} /><Bar dataKey="complaint" name="Shikoyatlar" fill="#EF4444" radius={[4, 4, 0, 0]} /><Bar dataKey="rating" name="Baholar" fill="#F59E0B" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="card"><h3 className="mb-3 font-medium">Oxirgi 30 kun</h3>
          <ResponsiveContainer width="100%" height={260}><LineChart data={short(s.last30)}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="date" fontSize={12} interval={4} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
            <Line dataKey="suggestion" name="Takliflar" stroke="#2563EB" dot={false} /><Line dataKey="complaint" name="Shikoyatlar" stroke="#EF4444" dot={false} /></LineChart></ResponsiveContainer></div>
      </div>
      <div className="card"><h3 className="mb-3 font-medium">Eng faol filiallar</h3>
        {!s.top_branches.length ? <Empty /> : s.top_branches.map((b: any) => (
          <div key={b.name} className="mb-2"><div className="flex justify-between text-sm"><span>{b.name}</span><b>{b.count}</b></div>
            <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-primary" style={{ width: `${(b.count / s.top_branches[0].count) * 100}%` }} /></div></div>))}
      </div>
    </div>
  )
}
