'use client';
import { useEffect, useState } from 'react';

// Tap-the-orb mini game shown while something is being created
export default function Game({ type, label }) {
  const [d, setD] = useState({ x: 50, y: 50 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const hop = () => setD({ x: 8 + Math.random() * 84, y: 14 + Math.random() * 72 });
  useEffect(() => { try { setBest(+localStorage.getItem('pl-best') || 0); } catch {} }, []);
  useEffect(() => { const t = setTimeout(hop, Math.max(450, 1000 - score * 20)); return () => clearTimeout(t); }, [d, score]);
  function tap() {
    const s = score + 1;
    setScore(s);
    if (s > best) { setBest(s); try { localStorage.setItem('pl-best', String(s)); } catch {} }
    hop();
  }
  return (
    <div className="game">
      <div className="game-top"><span>{label || `Creating your ${type}… tap the orb while you wait`}</span><b>Score {score} · Best {best}</b></div>
      <div className="arena"><button className="orb" aria-label="Tap the orb" style={{ left: d.x + '%', top: d.y + '%' }} onClick={tap} /></div>
    </div>
  );
}
