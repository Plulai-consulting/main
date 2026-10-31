'use client'
import { useEffect, useState } from 'react'
// Mobile bottom bar (WhatsApp / email). Hidden while the contact section is on screen.
export default function Dock({ js }: { js: any }) {
  const [hide, setHide] = useState(false)
  useEffect(() => {
    const el = document.getElementById('contact'); if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((es) => setHide(es[0].isIntersecting), { threshold: 0.2 }); io.observe(el); return () => io.disconnect()
  }, [])
  return <div className={'dock' + (hide ? ' hide' : '')}>
    <a href={`https://wa.me/97455548407?text=${encodeURIComponent(js.waDefault)}`} target="_blank" rel="noopener">{js.dockWa}</a><a href="mailto:ceo@plulai.com">{js.dockMail}</a></div>
}
