'use client'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import Rich from './Rich'

const Ctx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} })
export const WaitlistProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false)
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}
export function WaitlistButton({ children, className }: { children: ReactNode; className?: string }) {
  const { setOpen } = useContext(Ctx)
  return <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
}
export function WaitlistDialog({ ui, js }: { ui: any; js: any }) {
  const { open, setOpen } = useContext(Ctx), ref = useRef<HTMLDialogElement>(null)
  const [msg, setMsg] = useState<ReactNode>(''), [busy, setBusy] = useState(false), [bad, setBad] = useState({ n: false, e: false })
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close() }, [open])
  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const form = ev.currentTarget, f = new FormData(form), name = String(f.get('name') || '').trim(), email = String(f.get('email') || '').trim(), ok = /^\S+@\S+\.\S+$/.test(email)
    setBad({ n: !name, e: !ok })
    if (!name || !ok) { setMsg(js.need); return }
    setBusy(true); setMsg(js.saving)
    try {
      const r = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, business: String(f.get('business') || '').trim(), website: String(f.get('website') || '') }) })
      if (!r.ok) throw new Error('failed')
      setMsg(js.ok); form.reset()
    } catch { setMsg(<>{js.errA} <a href="https://wa.me/97455548407" target="_blank" rel="noopener">{js.errLink}</a> {js.errB}</>) }
    setBusy(false)
  }
  return (
    <dialog id="waitlist" ref={ref} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) { const r = ref.current!.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) setOpen(false) } }}>
      <button className="close-dialog" aria-label={ui.d_close} onClick={() => setOpen(false)}>×</button>
      <p className="kick">{ui.d_kick}</p><h2><Rich html={ui.d_h} /></h2><p>{ui.d_p}</p>
      <form id="wl-form" noValidate onSubmit={submit}>
        <label>{ui.d_name}<input name="name" autoComplete="name" required aria-invalid={bad.n} /></label>
        <label>{ui.d_mail}<input name="email" type="email" autoComplete="email" required aria-invalid={bad.e} /></label>
        <label>{ui.d_biz}<input name="business" autoComplete="organization" /></label>
        <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button className="btn" type="submit" disabled={busy}>{ui.d_btn}</button><p className="wl-msg" id="wl-msg" role="status">{msg}</p>
      </form>
      <small>{ui.d_small}</small>
      <details><summary>{ui.d_sum} <span>+</span></summary><p>{ui.d_det}</p></details>
    </dialog>
  )
}
