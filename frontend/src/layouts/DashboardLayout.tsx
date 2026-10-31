import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Bell, Building2, ChevronDown, FileText, GitBranch, Home, Inbox, Info, Lightbulb, LogOut, Menu, MessageSquareWarning, QrCode, Settings, Share2, Users, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNotificationSocket, useUnread } from '../hooks/useNotifications'
import { api } from '../services/api'
import { fmtDate } from '../utils'
import { Empty } from '../components/ui'
import InstallPrompt from '../components/InstallPrompt'
import { APP_VERSION } from '../version'

const NAV_SECTIONS = [
  {
    title: 'Asosiy',
    items: [
      { to: '/app', label: 'Bosh sahifa', icon: Home, end: true },
      { to: '/app/feedbacks', label: 'Murojaatlar', icon: Inbox },
      { to: '/app/suggestions', label: 'Takliflar', icon: Lightbulb },
      { to: '/app/complaints', label: 'Shikoyatlar', icon: MessageSquareWarning },
    ],
  },
  {
    title: 'Boshqaruv',
    items: [
      { to: '/app/qr', label: 'QR kodlar', icon: QrCode },
      { to: '/app/social', label: 'Ijtimoiy tarmoqlar', icon: Share2, roles: ['owner', 'admin'] },
      { to: '/app/branches', label: 'Filiallar', icon: GitBranch, roles: ['owner', 'admin', 'manager'] },
      { to: '/app/departments', label: 'Bo‘limlar', icon: Building2 },
      { to: '/app/staff', label: 'Xodimlar', icon: Users, roles: ['owner', 'admin', 'manager'] },
    ],
  },
  {
    title: 'Tahlil',
    items: [
      { to: '/app/statistics', label: 'Statistika', icon: BarChart3, roles: ['owner', 'admin', 'manager'] },
      { to: '/app/reports', label: 'Hisobotlar', icon: FileText, roles: ['owner', 'admin', 'manager'] },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { to: '/app/notifications', label: 'Bildirishnomalar', icon: Bell },
      { to: '/app/settings', label: 'Sozlamalar', icon: Settings },
      { to: '/app/about', label: 'Dastur haqida', icon: Info },
    ],
  },
]

function Bell_() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient(); const nav = useNavigate()
  const unread = useUnread()
  const list = useQuery({ queryKey: ['notifications', 'dropdown'], enabled: open, queryFn: async () => (await api.get('/notifications/', { params: { page_size: 10 } })).data.results })
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/mark_all_read/'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['unread'] }); qc.invalidateQueries({ queryKey: ['notifications'] }) } })
  const go = async (n: any) => { await api.post(`/notifications/${n.id}/read/`); qc.invalidateQueries({ queryKey: ['unread'] }); setOpen(false); nav(n.feedback ? `/app/feedbacks/${n.feedback}` : '/app/notifications') }
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 hover:bg-slate-100" aria-label="Bildirishnomalar">
        <Bell size={20} />{!!unread.data && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">{unread.data > 99 ? '99+' : unread.data}</span>}
      </button>
      {open && <>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div className="fixed left-2 right-2 top-14 z-40 rounded-xl border border-border bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-border p-3"><b>Bildirishnomalar</b><button className="text-xs text-primary" onClick={() => markAll.mutate()}>Barchasini o‘qilgan deb belgilash</button></div>
          <div className="max-h-96 overflow-y-auto">
            {!list.data?.length ? <Empty title="Bildirishnoma yo‘q" /> : list.data.map((n: any) => (
              <button key={n.id} onClick={() => go(n)} className={`block w-full border-b border-border px-3 py-2 text-left hover:bg-slate-50 ${n.is_read ? '' : 'bg-blue-50/60'}`}>
                <p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted">{n.body}</p><p className="mt-0.5 text-[11px] text-muted">{fmtDate(n.created_at)}</p>
              </button>))}
          </div>
          <Link to="/app/notifications" onClick={() => setOpen(false)} className="block p-2 text-center text-sm text-primary">Hammasini ko‘rish</Link>
        </div>
      </>}
    </div>
  )
}

export default function DashboardLayout() {
  const { user, logout, can } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const unread = useUnread()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Asosiy: true })
  useEffect(() => {
    const sec = NAV_SECTIONS.find((s) => s.items.some((i) => (i.to === '/app' ? loc.pathname === '/app' : loc.pathname.startsWith(i.to))))
    if (sec) setExpanded((e) => (e[sec.title] ? e : { ...e, [sec.title]: true }))
  }, [loc.pathname])
  useNotificationSocket(true)
  const org = user?.organization
  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-dark/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-white/5 bg-[#0B1220] text-slate-400 transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/5 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white p-1"><img src="/logo.png" alt="WEBSTORM IT" className="h-full w-full object-contain" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{org?.name}</p><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">WEBSTORM IT</p></div>
          </div>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Yopish"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((n) => !n.roles || can(...n.roles))
            if (!items.length) return null
            return (
              <div key={section.title} className="pt-3 first:pt-2">
                <button type="button" onClick={() => setExpanded((e) => ({ ...e, [section.title]: !e[section.title] }))} className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-slate-300">
                  <span>{section.title}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${expanded[section.title] ? '' : '-rotate-90'}`} />
                </button>
                {expanded[section.title] && <div className="mt-1 space-y-0.5">
                  {items.map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'}`}>
                      {({ isActive }) => (<>
                        <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                        <n.icon size={18} className={isActive ? 'text-primary' : 'text-slate-500 transition-colors group-hover:text-slate-300'} />
                        <span className="truncate">{n.label}</span>
                        {n.to === '/app/notifications' && !!unread.data && <span className="ml-auto min-w-[20px] rounded-full bg-primary px-1.5 text-center text-[10px] font-semibold leading-5 text-white">{unread.data > 99 ? '99+' : unread.data}</span>}
                      </>)}
                    </NavLink>
                  ))}
                </div>}
              </div>
            )
          })}
        </nav>
        <div className="shrink-0 border-t border-white/5 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">v{APP_VERSION} · WEBSTORM IT</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-white px-3 sm:px-6">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Menyu"><Menu size={20} /></button>
          <div className="hidden text-sm text-muted lg:block">{org?.name}</div>
          <div className="flex items-center gap-2">
            <Bell_ />
            <div className="hidden text-right text-xs sm:block"><p className="font-medium">{user?.full_name}</p><p className="text-muted">{user?.role}</p></div>
            <button onClick={logout} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Chiqish"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-3 sm:p-6"><InstallPrompt /><Outlet /></main>
      </div>
    </div>
  )
}
