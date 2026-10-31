'use client'
import { useState } from 'react'
export default function SetupCheck(){
  const [res,setRes]=useState<any>(null),[busy,setBusy]=useState(false),[err,setErr]=useState('')
  const run=async()=>{setBusy(true);setErr('');try{const r=await fetch('/api/admin/health',{method:'POST'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Failed');setRes(j)}catch(e:any){setErr(e.message)}setBusy(false)}
  const groups:string[]=res?[...new Set<string>(res.checks.map((c:any)=>c.group))]:[]
  return <div className="card">
    <p className="muted" style={{marginTop:0}}>Checks that your keys are set and that the database is ready. It never shows your key values.</p>
    <button className="btn" onClick={run} disabled={busy}>{busy?'Checking…':res?'Check again':'Run setup check'}</button>
    {err&&<p className="err" role="alert">{err}</p>}
    {res&&<div role="status" style={{marginTop:20}}>
      <p style={{fontSize:18}}><b>{res.ready?'Everything required is ready.':'Some required items need attention.'}</b></p>
      {groups.map(g=><div key={g} style={{marginBottom:14}}><b>{g}</b>{res.checks.filter(c=>c.group===g).map(c=><p key={c.name} style={{margin:'6px 0 0'}}><span aria-hidden="true">{c.ok?'✓':'✗'}</span> <span className="sr">{c.ok?'Passed: ':'Needs attention: '}</span>{c.name}{c.note&&<span className="muted"> · {c.note}</span>}</p>)}</div>)}</div>}
  </div>
}
