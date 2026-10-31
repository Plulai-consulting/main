import type { ReactNode } from 'react'
// Copy uses only <br> and <em>. Parsed into real elements, no raw HTML is injected.
export default function Rich({ html }: { html: string }) {
  const out: ReactNode[] = []
  html.split(/(<br\s*\/?>|<em>.*?<\/em>)/g).forEach((seg, i) => {
    if (!seg) return
    if (/^<br/.test(seg)) out.push(<br key={i} />)
    else if (seg.startsWith('<em>')) out.push(<em key={i}>{seg.slice(4, -5)}</em>)
    else out.push(seg)
  })
  return <>{out}</>
}
