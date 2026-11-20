import Link from 'next/link';
import { MODELS } from '../lib/models';
import { STRATEGY_COST } from '../lib/config';

const PLANS = [
  { name: 'Starter', price: 12, credits: '400', a: 'About 33 GPT Image pictures', b: 'Or 6 eight-second Veo clips' },
  { name: 'Pro', price: 29, credits: '1,100', a: 'About 90 GPT Image pictures', b: 'Or 17 eight-second Veo clips', pop: true },
  { name: 'Studio', price: 79, credits: '3,200', a: 'About 260 GPT Image pictures', b: 'Or 50 eight-second Veo clips' },
];
const STEPS = [
  ['Describe it', 'Type your idea in plain words. The prompt booster adds the detail for you.'],
  ['Pick model, size and length', 'Choose from top image and video models, then set the aspect ratio and clip length.'],
  ['Create and download', 'Watch it render, play a quick game while you wait, and keep everything in your history.'],
];
const SHOTS = [
  ['Neon street in Doha at night, rain', 'Image', 'linear-gradient(135deg,#ff9a6b,#c44f8f 45%,#3b2a8c)'],
  ['Slow push-in on a desert sunrise', 'Video', 'linear-gradient(135deg,#f6c453,#d9642b 50%,#4a1d6b)'],
  ['Perfume bottle on black marble', 'Image', 'linear-gradient(135deg,#2b2f4a,#8d7bd6 55%,#e6c9ff)'],
  ['Drone flight over turquoise water', 'Video', 'linear-gradient(135deg,#0f8fa8,#2fd0c1 50%,#0b2a6b)'],
  ['Cat astronaut on the moon', 'Image', 'linear-gradient(135deg,#1b1b2f,#5e60ce 55%,#d4d4ff)'],
  ['Coffee shop logo, warm and minimal', 'Image', 'linear-gradient(135deg,#6b4226,#d9a066 55%,#fff1d6)'],
];
const FEATS = [
  ['Top models, one place', 'GPT Image, Nano Banana, Veo, Kling and more. Switch models in one tap.'],
  ['Reference images', 'Upload a picture to steer style, a character or a starting frame.'],
  ['Your size, your length', '16:9, 9:16, 1:1 or 4:3, and clips from 4 to 15 seconds.'],
  ['Prompt booster', 'Short ideas become detailed prompts, so results look better the first time.'],
  ['Organized history', 'Start new conversations, search, rename and revisit anything you made.'],
  ['Play while you wait', 'A tiny game keeps the wait fun while your video renders.'],
  ['30-day marketing strategist', 'Answer a short interview and get a full strategy built around your brand, audience and goals.'],
  ['Ready-to-post content', 'Captions, hashtags and visual prompts for every post, one click away from creating the image or video.'],
];
const FAQ = [
  ['What is a credit?', 'Credits pay for each generation. Images cost a fixed number of credits, and videos cost credits per second. You always see the price before you press Generate.'],
  ['Do credits roll over?', 'Monthly plan credits reset each month. Top-up packs never expire.'],
  ['What if a generation fails?', 'Your credits are refunded automatically.'],
  ['Do I need a card to try it?', 'No. You get 20 free credits when you sign up.'],
  ['Which models can I use?', 'Three image models and four video models today, and we add more over time.'],
];
const costText = (m) => (m.durations ? `${m.cost({ seconds: 1 })} credits / second` : `${m.cost({ seconds: 1 })} credits`);

export default function Landing() {
  return (
    <main style={{ paddingBottom: 40 }}>
      <nav className="nav glass sticky">
        <Link href="/" className="logo">✦ Pllulai Studio</Link>
        <div className="nav-r">
          <a href="#models">Models</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
          <Link href="/login" className="btn hide-sm">Log in</Link>
          <Link href="/login?mode=signup" className="btn primary">Get started</Link>
          <details className="mnav">
            <summary aria-label="Menu">☰</summary>
            <div className="mnav-list glass"><a href="#models">Models</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
          </details>
        </div>
      </nav>

      <section className="hero">
        <span className="badge glass">20 free credits · no card needed</span>
        <h1><span className="grad">Create stunning images and videos</span><br />from one simple prompt</h1>
        <p className="muted">Pick a model, choose the size and length, add a reference if you have one. Pllulai Studio does the rest.</p>
        <div className="cta-row">
          <Link href="/login?mode=signup" className="btn primary">Start creating free</Link>
          <a href="#pricing" className="btn">See pricing</a>
        </div>

        <div className="mock glass" aria-hidden="true">
          <div className="mock-side">
            <div className="mk-btn sel">＋ New conversation</div>
            {['Neon street in Doha', 'Perfume on marble', 'Desert drone flight', 'Cat astronaut'].map((t, i) => <div key={t} className={'mk-row' + (i === 0 ? ' on' : '')}>{t}</div>)}
          </div>
          <div className="mock-main">
            <div className="mk-you sel">A neon-lit street in Doha at night, rain, cinematic</div>
            <div className="mk-tiles">
              <div className="mk-tile" style={{ background: SHOTS[0][2] }} />
              <div className="mk-tile" style={{ background: SHOTS[3][2] }} />
            </div>
            <div className="mk-bar glass"><span className="muted">Describe your video or image…</span><span className="pill">Veo 3.1 Lite · 16:9 · 8s</span><span className="mk-go sel">↑</span></div>
          </div>
        </div>
      </section>

      <section id="models" className="sec">
        <h2>The best models, one simple app</h2>
        <p className="lead muted">No juggling accounts or tabs. Pick the right model for each idea.</p>
        <div className="chips">{['GPT Image', 'Nano Banana', 'FLUX', 'Veo 3.1', 'Kling 3', 'Seedance 2.0'].map((n) => <span key={n} className="glass">{n}</span>)}</div>
      </section>

      <section id="how" className="sec">
        <h2>How it works</h2>
        <p className="lead muted">From idea to result in three steps.</p>
        <div className="grid3">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="glass gcard"><div className="num sel">{i + 1}</div><h3>{t}</h3><div className="muted">{d}</div></div>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2>Made with Pllulai Studio</h2>
        <p className="lead muted">A taste of what one prompt can do.</p>
        <div className="shots">
          {SHOTS.map(([t, k, g]) => (
            <div key={t} className="glass shot"><div className="art" style={{ background: g }} /><div className="cap"><span>{t}</span><span className="pill">{k}</span></div></div>
          ))}
        </div>
      </section>

      <section className="sec">
        <h2>Everything you need to create</h2>
        <p className="lead muted">Simple on the surface, powerful underneath.</p>
        <div className="grid3">
          {FEATS.map(([t, d]) => <div key={t} className="glass gcard"><h3 style={{ marginTop: 0 }}>{t}</h3><div className="muted">{d}</div></div>)}
        </div>
      </section>

      <section id="pricing" className="sec" style={{ textAlign: 'center' }}>
        <h2>Simple pricing</h2>
        <p className="lead muted">Credits reset every month. Top-up packs never expire.</p>
        <div className="plans" style={{ textAlign: 'left', marginTop: 0 }}>
          {PLANS.map((p) => (
            <div key={p.name} className={'glass' + (p.pop ? ' pop' : '')}>
              {p.pop && <span className="tag sel">Most popular</span>}
              <b>{p.name}</b>
              <div><span className="price">${p.price}</span><span className="muted"> / month</span></div>
              <b>{p.credits} credits each month</b>
              <div>✓ {p.a}</div><div>✓ {p.b}</div><div>✓ Every model and size</div>
              <Link href="/login?mode=signup" className={'btn' + (p.pop ? ' primary' : '')}>Choose {p.name}</Link>
            </div>
          ))}
        </div>
        <div className="tbl glass" style={{ textAlign: 'left' }}>
          <h3 style={{ margin: '16px 0 4px' }}>What credits buy</h3>
          {Object.values(MODELS).filter((m) => !m.hidden).map((m) => (
            <div key={m.label}><span>{m.label} <span className="muted">· {m.type}</span></span><b>{costText(m)}</b></div>
          ))}
          <div><span>30-day marketing strategy <span className="muted">· strategist</span></span><b>{STRATEGY_COST} credits</b></div>
        </div>
      </section>

      <section id="faq" className="sec">
        <h2>Questions</h2>
        <p className="lead muted">Quick answers before you start.</p>
        <div className="faq">{FAQ.map(([q, a]) => <details key={q} className="glass"><summary>{q}</summary><p className="muted">{a}</p></details>)}</div>
      </section>

      <section className="band glass">
        <h2 style={{ margin: '0 0 10px', fontSize: 36 }}>Ready to create something?</h2>
        <p className="muted" style={{ margin: '0 0 24px' }}>Sign up and get 20 free credits to try it.</p>
        <Link href="/login?mode=signup" className="btn primary">Start creating free</Link>
      </section>

      <footer className="foot muted"><span>✦ Pllulai Studio</span><span>© Pllulai Studio · Terms · Privacy</span></footer>
    </main>
  );
}
