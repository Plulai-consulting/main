import { clients, quotes } from '@/content/clients'
import type { Locale } from '@/lib/site/routes'
import Rich from './Rich'

// "They trust us" section. Shows nothing until content/clients.ts has a real client or testimonial.
export default function Trusted({ locale, title, text }: { locale: Locale; title: string; text: string }) {
  if (!clients.length && !quotes.length) return null
  return (
    <section id="clients" className="sec trust"><div className="wrap">
      <div className="sec-head"><h2><Rich html={title} /></h2><p>{text}</p></div>
      {!!clients.length && (
        <ul className="trust-row" aria-label={title.replace(/<[^>]+>/g, '')}>
          {clients.map((c) => {
            const name = locale === 'ar' && c.nameAr ? c.nameAr : c.name
            const inner = c.logo ? <img src={c.logo} alt={name} height={36} /> : <span className="wordmark">{name}</span>
            return <li key={c.name} className="chip">{c.href ? <a href={c.href} target="_blank" rel="noopener">{inner}</a> : inner}</li>
          })}
        </ul>
      )}
      {!!quotes.length && (
        <div className="quotes">
          {quotes.map((q) => (
            <figure className="quote" key={q.name}><blockquote>“{q.text[locale]}”</blockquote><figcaption><b>{q.name}</b><span>{q.role[locale]}</span></figcaption></figure>
          ))}
        </div>
      )}
    </div></section>
  )
}