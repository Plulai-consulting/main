import type { Metadata, Viewport } from 'next'
import { SITE, path, type Locale, type PageKey } from './routes'

export const siteViewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f5f1eb' }

export function pageMetadata(locale: Locale, key: PageKey, title: string, description: string): Metadata {
  const url = SITE + path(locale, key), other: Locale = locale === 'en' ? 'ar' : 'en', img = `${SITE}/og?l=${locale}`
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url, languages: { en: SITE + path('en', key), ar: SITE + path('ar', key), 'x-default': SITE + path('en', key) } },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: { type: 'website', siteName: 'PlulAI Consulting', title, description, url, locale: locale === 'ar' ? 'ar_AR' : 'en_US', alternateLocale: other === 'ar' ? 'ar_AR' : 'en_US', images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [img] },
    icons: { icon: '/assets/mark.svg' },
  }
}

const AREA = ['Qatar', 'United Arab Emirates', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Oman'].map((name) => ({ '@type': 'Country', name }))
const strip = (t: string) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')

// Structured data (Organization, WebSite, page, breadcrumb, service, FAQ) so search engines and AI answers understand the business.
export function jsonLd(locale: Locale, key: PageKey, title: string, desc: string, faq?: { q: string; a: string }[], service?: string) {
  const url = SITE + path(locale, key)
  const graph: any[] = [
    { '@type': 'Organization', '@id': SITE + '/#org', name: 'PlulAI Consulting', url: SITE + '/', logo: SITE + '/assets/mark.svg', email: 'ceo@plulai.com', areaServed: AREA,
      contactPoint: { '@type': 'ContactPoint', contactType: 'sales', telephone: '+97455548407', email: 'ceo@plulai.com', availableLanguage: ['English', 'Arabic'] } },
    { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: 'PlulAI Consulting', publisher: { '@id': SITE + '/#org' }, inLanguage: ['en', 'ar'] },
    { '@type': 'WebPage', '@id': url + '#page', url, name: strip(title), description: strip(desc), inLanguage: locale, isPartOf: { '@id': SITE + '/#site' }, about: { '@id': SITE + '/#org' } },
  ]
  if (key === 'home') graph.push({ '@type': 'ProfessionalService', name: 'PlulAI Consulting', url: SITE + '/', areaServed: AREA, serviceType: ['Marketing', 'AI consulting', 'Social media strategy'], parent: { '@id': SITE + '/#org' } })
  else graph.push({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: locale === 'en' ? 'Home' : 'الرئيسية', item: SITE + path(locale, 'home') },
    { '@type': 'ListItem', position: 2, name: strip(title).split('|')[0].trim(), item: url }] })
  if (service) graph.push({ '@type': 'Service', name: service, provider: { '@id': SITE + '/#org' }, areaServed: AREA, url })
  if (faq?.length) graph.push({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: strip(f.q), acceptedAnswer: { '@type': 'Answer', text: strip(f.a) } })) })
  return { '@context': 'https://schema.org', '@graph': graph }
}
