import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DOCS } from '../../../lib/legal';

export function generateStaticParams() { return Object.keys(DOCS).map((slug) => ({ slug })); }

export default async function Legal({ params }) {
  const { slug } = await params;
  const d = DOCS[slug];
  if (!d) notFound();
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 60px' }}>
      <Link href="/" className="logo">✦ Pllulai Studio</Link>
      <h1 style={{ fontSize: 34, margin: '28px 0 8px' }}>{d.title}</h1>
      <div className="glass" style={{ borderRadius: 18, padding: '12px 16px', margin: '0 0 20px', fontSize: 14 }}>
        Draft template: replace the details in [brackets] (see <code>lib/config.js</code>) and have a lawyer review this page before launch.
      </div>
      {d.sections.map(([h, paras]) => (
        <section key={h} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 19, margin: '0 0 8px' }}>{h}</h2>
          {paras.map((p, i) => <p key={i} className="muted" style={{ margin: '0 0 8px', lineHeight: 1.65 }}>{p}</p>)}
        </section>
      ))}
      <p style={{ marginTop: 30, fontSize: 14 }}>
        <Link href="/legal/terms">Terms</Link> · <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/refunds">Credits &amp; Refunds</Link> · <Link href="/legal/acceptable-use">Acceptable use</Link>
      </p>
    </main>
  );
}
