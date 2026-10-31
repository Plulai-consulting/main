import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { aiBase, aiKey } from '@/lib/ai/openai'
export const maxDuration=60
const has=k=>!!(process.env[k]&&String(process.env[k]).trim())
// Admin-only setup check. Returns pass/fail only, never any key values.
export async function POST(){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)return NextResponse.json({error:'Please log in.'},{status:401})
  const {data:me}=await sb.from('profiles').select('role').eq('id',user.id).single()
  if(me?.role!=='admin')return NextResponse.json({error:'Admins only.'},{status:403})
  const checks:any[]=[],add=(group,name,ok,note)=>checks.push({group,name,ok,note:note||''})
  const provider=(process.env.IMAGE_PROVIDER||'higgsfield').toLowerCase()
  for(const k of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])add('Database',k,has(k),has(k)?'':'Missing. Add it in your hosting settings.')
  add('AI','AI key (AI_API_KEY or OPENAI_API_KEY)',!!aiKey(),aiKey()?'':'Missing. The interview, strategy and posts all need it.')
  if(provider==='higgsfield'){for(const k of ['HIGGSFIELD_KEY_ID','HIGGSFIELD_KEY_SECRET'])add('Images',k,has(k),has(k)?'':'Missing. Needed because IMAGE_PROVIDER is higgsfield.')}
  else add('Images','OpenAI images',has('OPENAI_API_KEY'),`IMAGE_PROVIDER is ${provider}. Uses your OpenAI key.`)
  for(const k of ['RESEND_API_KEY','RESEND_FROM','ADMIN_NOTIFY_EMAIL','APP_URL','WEBHOOK_SECRET'])add('Emails (optional)',k,has(k),has(k)?'':'Not set. Email notifications will be skipped.')
  const db=adminClient()
  for(const t of ['profiles','generations','generation_audits','interviews','waitlist']){
    try{const {error}=await db.from(t).select('id',{count:'exact',head:true}).limit(1);add('Database','Table '+t,!error,error?(t==='interviews'?'Missing. Run supabase/step5.sql in the Supabase SQL editor.':'Missing. Run supabase/schema.sql.'):'')}catch{add('Database','Table '+t,false,'Could not reach the database.')}}
  try{const {data,error}=await db.storage.getBucket('tool-images');add('Database','Storage bucket tool-images',!!data&&!error,error?'Missing. Run supabase/schema.sql.':'')}catch{add('Database','Storage bucket tool-images',false,'Could not check.')}
  if(aiKey()){
    const model=process.env.OPENAI_MODEL||'gpt-5-mini',base=aiBase()
    try{const r=await fetch(base+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+aiKey(),'Content-Type':'application/json'},body:JSON.stringify({model,max_tokens:16,messages:[{role:'user',content:'Reply with the word OK.'}]}),signal:AbortSignal.timeout(30000)})
      const txt=r.ok?'':(await r.text().catch(()=>'')).replace(/\s+/g,' ').slice(0,200)
      add('AI','AI connection ('+new URL(base).host+', model '+model+')',r.ok,r.ok?'The key and model work.':`Status ${r.status}. ${txt}`)}
    catch{add('AI','AI connection',false,'Could not reach the AI provider.')}
  }
  if(provider==='higgsfield'&&has('HIGGSFIELD_KEY_ID'))add('Images','Higgsfield connection',true,'Keys are set. They are confirmed by the first image you generate (images are billed per image).')
  return NextResponse.json({checks,ready:checks.filter(c=>c.group!=='Emails (optional)').every(c=>c.ok)})
}
