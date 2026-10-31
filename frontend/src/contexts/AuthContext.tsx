import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { api, tokens } from '../services/api'
import { Me } from '../types'

interface Ctx { user: Me | null; loading: boolean; login: (l: string, p: string) => Promise<Me>; register: (d: any) => Promise<Me>; logout: () => void; refresh: () => Promise<void>; can: (...roles: string[]) => boolean }
const AuthCtx = createContext<Ctx>(null as any)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(!!tokens.access)

  const refresh = async () => { const r = await api.get('/auth/me/'); setUser(r.data) }
  useEffect(() => {
    if (tokens.access) refresh().catch(() => tokens.clear()).finally(() => setLoading(false))
  }, [])

  const accept = (d: any) => { tokens.set(d.access, d.refresh); setUser(d.user); return d.user as Me }
  const login = async (login: string, password: string) => accept((await api.post('/auth/login/', { login, password })).data)
  const register = async (d: any) => accept((await api.post('/auth/register/', d)).data)
  const logout = () => { tokens.clear(); setUser(null); window.location.href = '/login' }
  const can = (...roles: string[]) => !!user && roles.includes(user.role)

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh, can }}>{children}</AuthCtx.Provider>
}
