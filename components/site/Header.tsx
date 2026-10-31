'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { keyFromPath, path, type Locale } from '@/lib/site/routes'

export default function Header({ locale, ui, js }: { locale: Locale; ui: any; js: any }) {
  const pathname = usePathname() || '/', rel = locale === 'ar' ? pathname.replace(/^\/ar/, '') || '/' : pathname
  const cur = keyFromPath(rel), other: Locale = locale === 'en' ? 'ar' : 'en'
  const [open, setOpen] = useState(false), [dark, setDark] = useState(false), ref = useRef<HTMLElement>(null), burger = useRef<HTMLButtonElement>(null)
  useEffect(() => setDark(document.documentElement.dataset.theme === 'dark'), [])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); burger.current?.focus() } }
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', key); document.addEventListener('click', click)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('click', click) }
  }, [open])
  useEffect(() => { const m = matchMedia('(min-width:921px)'), f = (e: MediaQueryListEvent) => e.matches && setOpen(false); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  function toggleTheme() {
    const d = !dark; setDark(d)
    document.documentElement.dataset.theme = d ? 'dark' : 'light'
    try { localStorage.setItem('plulai-theme', d ? 'dark' : 'light') } catch {}
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', d ? '#0a0a0a' : '#f5f1eb')
  }
  const link = (k: 'marketing' | 'ai' | 'tool', label: string, extra?: boolean) => (
    <Link href={path(locale, k)} aria-current={cur === k ? 'page' : undefined} onClick={() => setOpen(false)}>{label}{extra && <> <span className="dot" /></>}</Link>)
  return (
    <header className={'top' + (open ? ' open' : '')} ref={ref}><div className="bar">
      <Link className="logo" href={path(locale, 'home')} aria-label={ui.home}>
        <img className="lg-light" src="/assets/logo-dark.svg" alt="PlulAI Consulting" width={112} height={36} /><img className="lg-dark" src="/assets/logo.svg" alt="" aria-hidden="true" width={112} height={36} /></Link>
      <nav id="site-nav" aria-label={ui.main_nav}>
        {link('marketing', ui.nav_m)}{link('ai', ui.nav_a)}{link('tool', ui.nav_t, true)}
        {cur === 'home' && <a href="/login">{ui.login}</a>}
        <a className="nav-cta" href="#contact" onClick={() => setOpen(false)}>{ui.talk}</a>
      </nav>
      <div className="hd-actions">
        <a className="lang" href={path(other, cur)} hrefLang={other} lang={other}>{(ui.langlabel)}</a>
        <button className="theme" type="button" aria-label={dark ? js.light : js.dark} onClick={toggleTheme}>
          <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button>
        <a className="btn gold sm" href="#contact">{ui.talk}</a>
        <button className="burger" type="button" ref={burger} aria-label={open ? js.closeMenu : js.openMenu} aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}><span /></button>
      </div></div></header>
  )
}
