import Link from 'next/link'
import { getDict } from '@/content'
import { COUNTRIES, path, type CountryKey, type Locale } from '@/lib/site/routes'
import { jsonLd } from '@/lib/site/seo'
import Rich from '../Rich'
import Faq from '../Faq'
import JsonLd from '../JsonLd'
import Contact from '../Contact'

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '')

// Title, description and wording for a country page. Also used by the route's metadata.
export function countryText(locale: Locale, key: CountryKey) {
  const d = getDict(locale), c = d.countries[key], s = d.country, n = c.n, t = c.title_n
  return { n, t, title: fill(s.title, { t, n }), desc: fill(s.desc, { t, n }), faq: [...c.faq, s.gen_faq] }
}
export default function Country({ locale, k }: { locale: Locale; k: CountryKey }) {
  const d = getDict(locale), c = d.countries[k], s = d.country, ui = d.ui, ar = ui.arrow
  const { n, t, title, desc, faq } = countryText(locale, k)
  const hrefs = [path(locale, 'marketing'), path(locale, 'ai'), path(locale, 'tool')]
  return (
    <>
      <JsonLd data={jsonLd(locale, k, title, desc, faq, locale === 'en' ? 'Marketing and AI consulting in ' + t : undefined)} />
      <section className="wrap page-hero"><p className="kick">{s.kick}</p><h1><Rich html={fill(s.h1, { n })} /></h1><p className="lead">{c.intro}</p>
        <div className="actions"><a className="btn gold" href="#contact">{ui.talk}</a></div></section>
      <section className="sec"><div className="wrap"><div className="sec-head"><h2>{fill(s.matters, { n })}</h2></div>
        <div className="grid3">{c.cards.map((x) => <div className="card" key={x.title}><h3>{x.title}</h3><p>{x.text}</p></div>)}</div></div></section>
      <section className="sec"><div className="wrap"><div className="sec-head"><h2>{fill(s.help, { n })}</h2></div>
        <div className="grid3">{s.links.map((l, i) => <Link className="card" key={l.title} href={hrefs[i]}><h3>{fill(l.title, { n })}</h3><p>{l.text}</p><span className="go">{s.go} {ar}</span></Link>)}</div></div></section>
      <section className="sec"><div className="wrap faq-grid"><h2>{locale === 'en' ? <>Questions,<br /><em>answered.</em></> : <>أسئلة،<br /><em>وأجوبتها.</em></>}</h2><Faq items={faq} /></div></section>
      <section className="sec"><div className="wrap"><div className="sec-head"><h2>{s.other}</h2></div>
        <div className="grid3 markets">{COUNTRIES.filter((x) => x !== k).map((x) => <Link className="card" key={x} href={path(locale, x)}><h3>{d.countries[x].n}</h3><p>{d.countries[x].cities}</p></Link>)}</div></div></section>
      <Contact ui={ui} js={d.js} h2={fill(s.h2c, { n })} ctx={fill(s.ctx, { n })} wa={fill(s.wa, { t, n: locale === 'en' ? t : n })} subj={fill(s.subj, { t, n })} />
    </>
  )
}
