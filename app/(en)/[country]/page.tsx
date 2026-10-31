import { notFound } from 'next/navigation'
import Country, { countryText } from '@/components/site/pages/Country'
import { COUNTRIES, SLUG, keyFromSlug, type CountryKey } from '@/lib/site/routes'
import { pageMetadata } from '@/lib/site/seo'

export const dynamicParams = false
export const generateStaticParams = () => COUNTRIES.map((k) => ({ country: SLUG[k] }))
const keyOf = (slug: string): CountryKey | null => {
  const k = keyFromSlug(slug)
  return k && (COUNTRIES as readonly string[]).includes(k) ? (k as CountryKey) : null
}
export function generateMetadata({ params }: { params: { country: string } }) {
  const k = keyOf(params.country)
  if (!k) return {}
  const t = countryText('en', k)
  return pageMetadata('en', k, t.title, t.desc)
}
export default function Page({ params }: { params: { country: string } }) {
  const k = keyOf(params.country)
  if (!k) notFound()
  return <Country locale="en" k={k!} />
}
