import Link from 'next/link'
import { getDict } from '@/content'
import { path, type Locale } from '@/lib/site/routes'
import { jsonLd } from '@/lib/site/seo'
import Rich from '../Rich'
import Faq from '../Faq'
import JsonLd from '../JsonLd'
import Contact from '../Contact'
import { WaitlistButton } from '../Waitlist'

export default function Tool({ locale }: { locale: Locale }) {
  const d = getDict(locale), t = d.tool, ui = d.ui, pa = t.paper
  return (
    <>
      <JsonLd data={jsonLd(locale, 'tool', t.title, t.desc, t.faq)} />
      <section className="wrap page-hero"><span className="tag"><i></i>{t.tag}</span><h1><Rich html={t.h1} /></h1><p className="lead"><Rich html={t.lead} /></p>
        <div className="actions"><WaitlistButton className="btn gold">{t.btn}</WaitlistButton></div></section>
      <section className="wrap"><div className="split" role="img" aria-label={t.alt}>
        <div className="paper"><small>{pa.label}</small><h3><Rich html={pa.title} /></h3>{pa.items.map((i) => <div className="t" key={i.k}><small>{i.k}</small>{i.v}</div>)}</div>
        <div className="stack"><div className="row-posts">
          <div className="post p1"><small>{t.p1.brand}</small><strong><Rich html={t.p1.title} /></strong><small>{t.p1.foot}</small></div>
          <div className="post p2"><small>{t.p2.brand}</small><strong><Rich html={t.p2.title} /></strong><small>{t.p2.foot}</small></div></div>
          <div className="caption"><small>{t.cap.label}</small>{t.cap.text}</div></div></div>
        <p className="fine">{t.ill}</p></section>
      <section className="sec" style={{ marginTop: 80 }}><div className="wrap"><div className="sec-head"><h2>{t.des}</h2></div>
        <div className="grid3">{t.cards.map((c) => <div className="card" key={c.title}><h3>{c.title}</h3><p>{c.text}</p></div>)}</div></div></section>
      <section className="sec"><div className="wrap"><div className="split"><div><p className="kick">{t.sk}</p><h2><Rich html={t.sh} /></h2><p>{t.sp}</p><div style={{ marginTop: 22 }}><Faq items={t.sq} /></div></div>
        <div className="posts" role="img" aria-label={t.ralt}><div className="post p2" style={{ insetInlineStart: '20%', top: 10 }}><small>{t.rp.brand}</small><strong><Rich html={t.rp.title} /></strong><small>{t.rp.foot}</small></div>
          <div className="chk">{t.chk.title}<small>{t.chk.sub}</small></div></div></div></div></section>
      <section className="sec"><div className="wrap"><div className="product" style={{ gridTemplateColumns: '1fr 1fr' }}><div><span className="tag"><i></i>{t.jt}</span><h2><Rich html={t.jh} /></h2></div>
        <div><p className="lead" style={{ marginTop: 0 }}><Rich html={t.jl} /></p>
          <div className="actions"><WaitlistButton className="btn gold">{t.jb}</WaitlistButton><Link className="link" href={path(locale, 'marketing')}>{t.jk} {ui.arrow}</Link></div><p className="fine">{t.jf}</p></div></div></div></section>
      <section className="wrap"><Faq items={t.faq} /></section>
      <Contact ui={ui} js={d.js} h2={t.c_h} ctx={t.ctx} wa={t.wa} subj={t.subj} />
    </>
  )
}
