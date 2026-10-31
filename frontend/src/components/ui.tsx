import { ReactNode, useEffect } from 'react'
import { Inbox, X } from 'lucide-react'
import { STATUSES, STATUS_COLORS } from '../types'
import { cx } from '../utils'

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={cx('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[status])}>{STATUSES[status] || status}</span>
)

export const StatCard = ({ label, value, icon, tone = 'text-primary' }: { label: string; value: ReactNode; icon?: ReactNode; tone?: string }) => (
  <div className="card flex items-center justify-between">
    <div><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
    {icon && <div className={cx('rounded-lg bg-slate-50 p-2', tone)}>{icon}</div>}
  </div>
)

export const Skeleton = ({ className = 'h-6 w-full' }: { className?: string }) => <div className={cx('skeleton', className)} />
export const TableSkeleton = ({ rows = 6 }) => <div className="space-y-2 p-4">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>

export const Empty = ({ title = 'Ma‘lumot yo‘q', hint }: { title?: string; hint?: string }) => (
  <div className="flex flex-col items-center py-12 text-center text-muted"><Inbox size={36} /><p className="mt-2 font-medium">{title}</p>{hint && <p className="text-sm">{hint}</p>}</div>
)

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); if (open) window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-dark/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} aria-label="Yopish"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  )
}

export const Pagination = ({ page, count, size = 20, onPage }: { page: number; count: number; size?: number; onPage: (p: number) => void }) => {
  const pages = Math.max(1, Math.ceil(count / size))
  return (
    <div className="flex items-center justify-between border-t border-border p-3 text-sm text-muted">
      <span>Jami: {count}</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Oldingi</button>
        <span>{page} / {pages}</span>
        <button className="btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Keyingi</button>
      </div>
    </div>
  )
}

export const PageHeader = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-semibold">{title}</h1><div className="flex flex-wrap gap-2">{children}</div></div>
)
