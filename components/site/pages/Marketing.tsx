import { getDict } from '@/content'
import type { Locale } from '@/lib/site/routes'
import { jsonLd } from '@/lib/site/seo'
import Rich from '../Rich'
import Faq from '../Faq'
import JsonLd from '../JsonLd'
import Contact from '../Contact'

export default function Marketing({ locale }: { locale: Locale }) {
  const d = getDict(locale), m = d.marketing, ui = d.ui
  return (
    <>
      <JsonLd data={jsonLd(locale, 'marketing', m.title, m.desc, m.faq, locale === 'en' ? 'Marketing: brand identity, social content and campaigns' : undefined)} />
      <section className="wrap page-hero"><p className="kick">{m.kick}</p><h1><Rich html={m.h1} /></h1><p className="lead">{m.lead}</p>
        <div className="actions"><a className="btn gold" href="#contact">{m.talk}</a></div></section>
      <section className="wrap"><div className="grid3" role="img" aria-label={m.ill}>
        {m.posters.map((p) => <div className={'poster ' + p.tone} key={p.brand}><small>{p.brand}</small><strong><Rich html={p.title} /></strong>
          {p.tone === 'p' && <img src="/assets/sculpture.svg" alt="" loading="lazy" />}<small>{p.foot}</small></div>)}</div>
        <p className="fine">{m.ill}</p></section>
      <section className="sec" style={{ marginTop: 80 }}><div className="wrap">
        <div className="grid3">{m.cards.map((c) => <a className="card" href="#contact" key={c.title}><h3>{c.title}</h3><p>{c.text}</p><span className="go">{m.go} {ui.arrow}</span></a>)}</div>
        <div style={{ marginTop: 40 }}><Faq items={m.faq} /></div></div></section>
      <Contact ui={ui} js={d.js} h2={m.c_h} ctx={m.ctx} wa={m.wa} subj={m.subj} />
    </>
  )
}
