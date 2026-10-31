'use client'
import { useState } from 'react'
import Rich from './Rich'
const WA = 'https://wa.me/97455548407?text='
export default function Contact({ ui, js, h2, ctx, wa, subj, chips }: { ui: any; js: any; h2: string; ctx: string; wa: string; subj: string; chips?: boolean }) {
  const [topic, setTopic] = useState<string | null>(null)
  const t = topic ? (js.lower ? topic.toLowerCase() : topic) : ''
  const text = topic ? js.topic.replace('{t}', t) : ctx, waText = topic ? js.wa.replace('{t}', t) : wa, subject = topic ? js.subj.replace('{t}', topic) : subj
  return (
    <section id="contact" className="wrap"><div className="contact-card"><h2><Rich html={h2} /></h2><div className="contact-options">
      {chips && <div className="chips" role="group" aria-label={ui.c_label}>{ui.c_chips.map((c: string) => <button type="button" key={c} aria-pressed={topic === c} onClick={() => setTopic(c)}>{c}</button>)}</div>}
      <p id="contact-context">{text}</p>
      <a id="whatsapp-link" href={WA + encodeURIComponent(waText)} target="_blank" rel="noopener">{ui.c_wa} <span>{ui.arrow}</span></a>
      <a id="email-link" href={`mailto:ceo@plulai.com?subject=${encodeURIComponent(subject)}`}>ceo@plulai.com <span>{ui.arrow}</span></a>
    </div></div></section>
  )
}
