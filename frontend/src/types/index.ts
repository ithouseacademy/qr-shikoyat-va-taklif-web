export type Role = 'super_admin' | 'owner' | 'admin' | 'manager' | 'employee'
export interface Org { id: number; name: string; slug: string; logo: string | null; primary_color: string; status: string }
export interface Me { id: number; email: string; phone: string | null; full_name: string; is_superuser: boolean; organization: Org | null; role: Role }
export interface Paged<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface Feedback {
  id: number; number: string; type: 'suggestion' | 'complaint' | 'rating'; type_display: string; category_name: string
  branch_name: string; department_name: string; name: string; phone: string; text: string; rating: number | null
  status: string; status_display: string; assigned_to: number | null; assigned_to_name: string; created_at: string
  comments?: { id: number; author_name: string; text: string; is_internal: boolean; created_at: string }[]
  history?: { id: number; changed_by_name: string; from_status: string; to_status: string; note: string; created_at: string }[]
  attachments?: string[]
}
export const STATUSES: Record<string, string> = {
  new: 'Yangi', in_progress: 'Ko‘rib chiqilmoqda', answered: 'Javob berildi', resolved: 'Hal qilindi', rejected: 'Rad etildi',
}
export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700', answered: 'bg-violet-100 text-violet-700',
  resolved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-slate-200 text-slate-600',
}
export const TYPE_LABELS: Record<string, string> = { suggestion: 'Taklif', complaint: 'Shikoyat', rating: 'Baho' }
