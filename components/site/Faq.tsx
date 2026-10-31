export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  return <div className="faq-list">{items.map((f) => <details key={f.q}><summary>{f.q} <span>+</span></summary><p>{f.a}</p></details>)}</div>
}
