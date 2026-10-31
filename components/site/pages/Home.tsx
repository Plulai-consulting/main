import Link from 'next/link'
import { getDict } from '@/content'
import { COUNTRIES, path, type Locale } from '@/lib/site/routes'
import { jsonLd } from '@/lib/site/seo'
import Rich from '../Rich'
import Faq from '../Faq'
import JsonLd from '../JsonLd'
import Contact from '../Contact'
import { WaitlistButton } from '../Waitlist'

export default function Home({ locale }: { locale: Locale }) {
  const d = getDict(locale), h = d.home, ui = d.ui, js = d.js, ar = ui.arrow
  return (
    <>
      <JsonLd data={jsonLd(locale, 'home', h.title, h.desc, h.faq)} />
      <section className="wrap hero"><div>
        <span className="tag"><i></i>{h.tag}</span><h1><Rich html={h.h1} /></h1><p className="lead"><Rich html={h.lead} /></p>
        <div className="actions"><a className="btn gold" href="#contact">{h.cta}</a><WaitlistButton className="link">{h.wl} {ar}</WaitlistButton></div>
        <p className="fine">{h.fine}</p></div>
        <div className="stage"><img src="/assets/sculpture.svg" alt="" width={520} height={520} fetchPriority="high" />
          <div className="panel"><div className="panel-top">{h.pt}<small>{h.ill}</small></div>
            {h.rows.map((r, i) => <div className="row" key={r.title}><div><strong>{r.title}</strong><small>{r.sub}</small></div><span className={'pill' + (i === 2 ? ' on' : '')}>{r.pill}</span></div>)}</div>
          <div className="float">{h.float}</div></div></section>

      <section id="expertise" className="sec"><div className="wrap">
        <div className="sec-head"><h2><Rich html={h.e_h} /></h2><p>{h.e_p}</p></div>
        <div className="bento">
          <Link className="card big" href={path(locale, 'marketing')}><h3>{h.m_h}</h3><p>{h.m_p}</p>
            <div className="tiles" aria-hidden="true"><div className="tile g">{h.tiles[0]}</div><div className="tile y">{h.tiles[1]}</div><div className="tile p">{h.tiles[2]}</div></div>
            <span className="go">{h.m_go} {ar}</span></Link>
          <Link className="card big" href={path(locale, 'ai')}><h3>{h.a_h}</h3><p>{h.a_p}</p>
            <div className="ba" aria-hidden="true">
              <div><small>{h.ba.before.label}</small>{h.ba.before.items.map((x) => <span key={x}>{x}</span>)}</div>
              <div className="on"><small>{h.ba.after.label}</small>{h.ba.after.items.map((x) => <span key={x}>{x}</span>)}</div></div>
            <span className="go">{h.a_go} {ar}</span></Link>
        </div></div></section>

      <section id="markets" className="sec"><div className="wrap">
        <div className="sec-head"><h2><Rich html={h.mk_h} /></h2><p>{h.mk_p}</p></div>
        <div className="grid3 markets">{COUNTRIES.map((k) => <Link className="card" key={k} href={path(locale, k)}><h3>{d.countries[k].n}</h3><p>{d.countries[k].cities}</p><span className="go">{d.country.go} {ar}</span></Link>)}</div></div></section>

      <section id="how" className="sec"><div className="wrap"><div className="sec-head"><h2><Rich html={h.how_h} /></h2></div>
        <ol className="steps">{h.steps.map((s, i) => <li key={s.title}><b>{i + 1}</b><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol></div></section>

      <section id="next" className="sec"><div className="wrap"><div className="product"><div>
        <span className="tag"><i></i>{h.p_tag}</span><h2><Rich html={h.p_h} /></h2><p className="lead"><Rich html={h.p_lead} /></p>
        <div className="actions"><WaitlistButton className="btn gold">{h.p_btn}</WaitlistButton><Link className="link" href={path(locale, 'tool')}>{h.p_link} {ar}</Link></div>
        <p className="fine">{h.p_fine}</p>
        <div className="flow">{h.flow.map((x) => <span key={x}>{x}</span>)}</div></div>
        <div className="posts" role="img" aria-label={h.p_alt}>
          <div className="post p1"><small>{h.p1.brand}</small><strong><Rich html={h.p1.title} /></strong><small>{h.p1.foot}</small></div>
          <div className="post p2"><small>{h.p2.brand}</small><strong><Rich html={h.p2.title} /></strong><small>{h.p2.foot}</small></div>
          <div className="chk">{h.chk.title}<small>{h.chk.sub}</small></div></div></div></div></section>

      <section id="faq" className="sec"><div className="wrap faq-grid"><h2><Rich html={h.f_h} /></h2><Faq items={h.faq} /></div></section>
      <Contact ui={ui} js={js} h2={h.c_h} ctx={ui.c_ctx} wa={h.wa} subj={h.subj} chips />
    </>
  )
}
