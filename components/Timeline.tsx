import { PHASES } from '@/lib/phases'
export default function Timeline({phase}){
  const i=PHASES.findIndex(p=>p[0]===phase)
  return <div><div className="phases" aria-hidden="true">{PHASES.map((p,k)=><i key={p[0]} className={k<=i?'on':''}/>)}</div>
    <ol className="tl">{PHASES.map((p,k)=><li key={p[0]} className={k===i?'now':k<i?'past':''} aria-current={k===i?'step':undefined}>{p[1]}</li>)}</ol></div>
}
