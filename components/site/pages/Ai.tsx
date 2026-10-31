import { getDict } from '@/content'
import type { Locale } from '@/lib/site/routes'
import { jsonLd } from '@/lib/site/seo'
import Rich from '../Rich'
import Faq from '../Faq'
import JsonLd from '../JsonLd'
import Contact from '../Contact'

export default function Ai({ locale }: { locale: Locale }) {
  const d = getDict(locale), a = d.ai, ui = d.ui, c = a.chat
  return (
    <>
      <JsonLd data={jsonLd(locale, 'ai', a.title, a.desc, a.fq, locale === 'en' ? 'AI consulting, implementation and integration' : undefined)} />
      <section className="wrap page-hero"><p className="kick">{a.kick}</p><h1><Rich html={a.h1} /></h1><p className="lead"><Rich html={a.lead} /></p>
        <div className="actions"><a className="btn gold" href="#contact">{a.cta}</a></div></section>
      <section className="sec"><div className="wrap">
        <div className="split"><div><p className="kick">{a.s1k}</p><h2><Rich html={a.s1h} /></h2><p>{a.s1p}</p></div>
          <div className="chat" role="img" aria-label={c.alt}><div className="bub q">{c.q}</div><div className="bub a">{c.a}</div>
            <div className="opts"><span>{c.opt1}</span><span>{c.opt2}</span></div><small style={{ fontSize: 12, opacity: 0.65 }}>{c.note}</small></div></div>
        <div className="split"><div className="sheet"><small>{a.sh.label}</small><h3><Rich html={a.sh.title} /></h3>
          {a.sh.lines.map((l) => <div className="l" key={l.k}><span>{l.k}</span><strong>{l.v}</strong></div>)}</div>
          <div><p className="kick">{a.s2k}</p><h2><Rich html={a.s2h} /></h2><p>{a.s2p}</p><div style={{ marginTop: 22 }}><Faq items={a.fq} /></div></div></div></div></section>
      <section className="sec"><div className="wrap"><div className="sec-head"><h2>{a.get}</h2></div>
        <ol className="steps">{a.steps.map((s, i) => <li key={s.title}><b>{i + 1}</b><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
        <div className="actions"><a className="btn gold" href="#contact">{a.disc}</a></div></div></section>
      <Contact ui={ui} js={d.js} h2={a.c_h} ctx={a.ctx} wa={a.wa} subj={a.subj} />
    </>
  )
}
