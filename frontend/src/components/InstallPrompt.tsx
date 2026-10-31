import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { isIOS, isStandalone } from '../services/push'

/** Android/Windows/macOS: beforeinstallprompt. iOS: Add to Home Screen ko'rsatmasi. */
export default function InstallPrompt() {
  const [evt, setEvt] = useState<any>(null)
  const [hidden, setHidden] = useState(!!localStorage.getItem('install_hidden'))
  useEffect(() => { const h = (e: Event) => { e.preventDefault(); setEvt(e) }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h) }, [])
  if (hidden || isStandalone() || (!evt && !isIOS())) return null
  return (
    <div className="card mb-4 flex items-center justify-between gap-3 !border-primary/30 !bg-blue-50 text-sm">
      <div className="flex items-center gap-2"><Download size={18} className="text-primary" />{evt ? 'Ilovani qurilmangizga o‘rnating' : 'iPhone: Share tugmasi → “Add to Home Screen” orqali o‘rnating'}</div>
      <div className="flex gap-2">{evt && <button className="btn-primary" onClick={async () => { evt.prompt(); await evt.userChoice; setEvt(null) }}>O‘rnatish</button>}<button className="btn-ghost" onClick={() => { localStorage.setItem('install_hidden', '1'); setHidden(true) }}>Yopish</button></div>
    </div>
  )
}
