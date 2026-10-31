import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { cleanBrief } from '@/lib/ai/brief'
import { runTextPipeline } from '@/lib/ai/pipeline'
import { runFullPipeline, briefFromProfile } from '@/lib/ai/strategy'
export const maxDuration=300
const fail=(m:string,s:number,hint?:string)=>NextResponse.json({error:m,...(hint?{hint}:{})},{status:s})
export async function POST(req){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)return fail('Please log in.',401)
  const {data:me}=await sb.from('profiles').select('tool_access,monthly_quota,role').eq('id',user.id).single()
  if(!me?.tool_access)return fail('Early access has not been enabled for your account yet.',403)
  const body=await req.json().catch(()=>null)
  const db=adminClient()
  let brief,profile=null,interviewId=null
  if(body?.interview_id){ // guided flow: the brief comes from the discovery interview
    const {data:iv}=await db.from('interviews').select('id,business,profile,status').eq('id',String(body.interview_id)).eq('user_id',user.id).maybeSingle()
    if(!iv||iv.status!=='profiled'||!iv.profile)return fail('Please finish the questions first.',400)
    const fix=String(body.corrections||'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,600)
    profile=fix?{...iv.profile,owner_corrections:fix}:iv.profile;interviewId=iv.id
    brief=cleanBrief(briefFromProfile(iv.business,profile,{platforms:Array.isArray(body.platforms)?body.platforms:[],post_count:Number(body.post_count)||5}))
  }else brief=cleanBrief(body)
  if(!brief)return fail('Please complete the required fields.',400)
  const month=new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),1)).toISOString()
  const [{count:used},{count:running}]=await Promise.all([
    db.from('generations').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',month).neq('status','failed'),
    db.from('generations').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('status','running').gte('created_at',new Date(Date.now()-5*60e3).toISOString())])
  if(running)return fail('A plan is already being created. Please wait a moment.',429)
  if((used||0)>=me.monthly_quota)return fail(`You have used all ${me.monthly_quota} plans for this month.`,429)
  const {data:gen,error}=await db.from('generations').insert({user_id:user.id,brief,interview_id:interviewId,profile}).select('id').single()
  if(error)return fail('Something went wrong. Please try again.',500)
  try{
    const r=profile?await runFullPipeline(brief,profile):await runTextPipeline(brief)
    await db.from('generation_audits').insert(r.log.map(l=>({generation_id:gen.id,attempt:l.attempt,passed:l.passed,issues:l.issues,draft:l.draft})))
    // Only content that passed every check is ever written where the client can read it.
    if(r.ok)await db.from('generations').update({status:'ready',strategy:r.output.strategy,posts:r.output.posts,attempts:r.attempts,finished_at:new Date().toISOString()}).eq('id',gen.id)
    else await db.from('generations').update({status:'needs_review',attempts:r.attempts,finished_at:new Date().toISOString()}).eq('id',gen.id)
    return NextResponse.json({id:gen.id,status:r.ok?'ready':'needs_review'})
  }catch(e:any){
    await db.from('generations').update({status:'failed',finished_at:new Date().toISOString()}).eq('id',gen.id)
    console.error('[generate]',e)
    return fail('Something went wrong. Please try again in a moment.',500,me.role==='admin'?String(e?.message||e).slice(0,400):undefined)
  }
}
