import Link from 'next/link'
import { getDict } from '@/content'
import { path, type Locale } from '@/lib/site/routes'
import Header from './Header'
import Dock from './Dock'
import { WaitlistProvider, WaitlistButton, WaitlistDialog } from './Waitlist'

export default function SiteShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const { ui, js } = getDict(locale)
  return (
    <WaitlistProvider>
      <a className="skip" href="#main">{ui.skip}</a>
      <Header locale={locale} ui={ui} js={js} />
      <main id="main">{children}</main>
      <footer><div className="wrap">
        <Link href={path(locale, 'home')} className="logo" aria-label={ui.home}><img className="lg-light" src="/assets/logo-dark.svg" alt="PlulAI Consulting" width={110} height={36} /><img className="lg-dark" src="/assets/logo.svg" alt="" aria-hidden="true" width={110} height={36} /></Link>
        <span>© {new Date().getFullYear()} {ui.rights}</span>
        <WaitlistButton>{ui.wl_link}</WaitlistButton>
      </div></footer>
      <WaitlistDialog ui={ui} js={js} />
      <Dock js={js} />
    </WaitlistProvider>
  )
}
