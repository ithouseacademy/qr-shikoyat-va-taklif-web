import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { api, errMsg } from '../services/api'

const Shell = ({ title, children }: any) => (
  <div className="grid min-h-screen place-items-center bg-bg p-4">
    <div className="card w-full max-w-md !p-6">
      <div className="mb-5 flex items-center gap-2"><img src="/logo.png" alt="WEBSTORM IT" className="h-10 w-auto object-contain" /><b className="text-lg">QR Feedback</b></div>
      <h1 className="mb-4 text-xl font-semibold">{title}</h1>{children}
      <p className="mt-5 border-t border-border pt-3 text-center text-xs text-muted"><Link to="/about" className="text-primary">Dastur haqida</Link> · © WEBSTORM IT</p>
    </div>
  </div>
)
const Err = ({ e }: any) => (e ? <p className="mt-1 text-xs text-red-600">{e.message}</p> : null)
const home = (u: any) => (u.is_superuser ? '/super' : '/app')

export function Login() {
  const { login, user } = useAuth(); const nav = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(z.object({ login: z.string().min(3, 'Telefon yoki email'), password: z.string().min(1, 'Parolni kiriting') })) })
  if (user) return <Navigate to={home(user)} replace />
  return (
    <Shell title="Tizimga kirish">
      <form className="space-y-3" onSubmit={handleSubmit(async (d) => { try { nav(home(await login(d.login, d.password))) } catch (e) { toast.error(errMsg(e)) } })}>
        <div><label className="label">Telefon yoki email</label><input className="input" {...register('login')} autoComplete="username" /><Err e={errors.login} /></div>
        <div><label className="label">Parol</label><input className="input" type="password" {...register('password')} autoComplete="current-password" /><Err e={errors.password} /></div>
        <button className="btn-primary w-full" disabled={isSubmitting}>Kirish</button>
      </form>
      <div className="mt-4 flex justify-between text-sm"><Link className="text-primary" to="/forgot-password">Parolni unutdingizmi?</Link><Link className="text-primary" to="/register">Ro‘yxatdan o‘tish</Link></div>
    </Shell>
  )
}

export function Register() {
  const { register: reg, user } = useAuth(); const nav = useNavigate()
  const schema = z.object({ organization_name: z.string().min(2, 'Tashkilot nomi'), full_name: z.string().min(2, 'Rahbar ismi'), phone: z.string().min(9, 'Telefon raqam'), email: z.string().email('Email noto‘g‘ri'), password: z.string().min(8, 'Kamida 8 ta belgi') })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  if (user) return <Navigate to={home(user)} replace />
  const F = ({ n, l, t = 'text' }: any) => <div><label className="label">{l}</label><input className="input" type={t} {...register(n)} /><Err e={(errors as any)[n]} /></div>
  return (
    <Shell title="Tashkilotni ro‘yxatdan o‘tkazish">
      <form className="space-y-3" onSubmit={handleSubmit(async (d) => { try { await reg(d); nav('/app') } catch (e) { toast.error(errMsg(e)) } })}>
        <F n="organization_name" l="Tashkilot nomi" /><F n="full_name" l="Rahbar ismi" /><F n="phone" l="Telefon raqam" t="tel" /><F n="email" l="Email" t="email" /><F n="password" l="Parol" t="password" />
        <button className="btn-primary w-full" disabled={isSubmitting}>Ro‘yxatdan o‘tish</button>
      </form>
      <p className="mt-4 text-sm">Akkauntingiz bormi? <Link className="text-primary" to="/login">Kirish</Link></p>
    </Shell>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false)
  return (
    <Shell title="Parolni tiklash">
      {sent ? <p className="text-sm">Agar email mavjud bo‘lsa, tiklash havolasi yuborildi.</p> : (
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api.post('/auth/password-reset/', { email }); setSent(true) } catch (er) { toast.error(errMsg(er)) } }}>
          <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-primary w-full">Havola yuborish</button>
        </form>)}
      <Link className="mt-4 block text-sm text-primary" to="/login">← Kirishga qaytish</Link>
    </Shell>
  )
}

export function ResetPassword() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const [pw, setPw] = useState('')
  return (
    <Shell title="Yangi parol">
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api.post('/auth/password-reset/confirm/', { uid: sp.get('uid'), token: sp.get('token'), password: pw }); toast.success('Parol yangilandi'); nav('/login') } catch (er) { toast.error(errMsg(er)) } }}>
        <div><label className="label">Yangi parol</label><input className="input" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <button className="btn-primary w-full">Saqlash</button>
      </form>
    </Shell>
  )
}
