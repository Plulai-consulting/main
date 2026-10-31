import '@/styles/site.css'
import { getDict } from '@/content'
import type { Locale } from '@/lib/site/routes'
import SiteShell from './SiteShell'
// Runs before the page paints so a saved dark theme never flashes light.
const THEME = `try{if(localStorage.getItem("plulai-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`
export default function RootHtml({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <html lang={locale} dir={getDict(locale).ui.dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
        <link rel="preload" href="/assets/Inter.woff2" as="font" type="font/woff2" crossOrigin="" />
        {locale === 'ar' && <link rel="preload" href="/assets/NotoSansArabic.woff2" as="font" type="font/woff2" crossOrigin="" />}
      </head>
      <body><SiteShell locale={locale}>{children}</SiteShell></body>
    </html>
  )
}
