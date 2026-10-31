import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { cleanBiz, cleanAnswers, interviewStep, buildProfile, MAX_ROUNDS } from '@/lib/ai/strategy'
export const maxDuration=120
const fail=(m:string,s:number,hint?:string)=>NextResponse.json({error:m,...(hint?{hint}:{})},{status:s})
const AGAIN='Something went wrong. Please try again in a moment.'
export async function POST(req){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)return fail('Please log in.',401)
  const {data:me}=await sb.from('profiles').select('tool_access,role').eq('id',user.id).single()
  if(!me?.tool_access)return fail('Early access has not been enabled for your account yet.',403)
  const body=await req.json().catch(()=>null)
  const db=adminClient()
  try{
    if(body?.action==='start'){
      const biz=cleanBiz(body)
      if(!biz)return fail('Please add your business name, industry and a few sentences about what you do.',400)
      const {count}=await db.from('interviews').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-864e5).toISOString())
      if((count||0)>=8)return fail('You have started several sessions today. Please continue one of them or come back tomorrow.',429)
      const step=await interviewStep(biz,[],1)
      const rounds=[{questions:step.questions,answers:null,reflection:step.reflection}]
      const {data:row,error}=await db.from('interviews').insert({user_id:user.id,business:biz,rounds,coverage:step.coverage}).select('id').single()
      if(error){console.error('[interview] insert failed',error);return fail(AGAIN,500,me.role==='admin'?'Database: '+error.message+' (did you run supabase/step5.sql?)':undefined)}
      return NextResponse.json({id:row.id,round:{no:1,questions:step.questions,coverage:step.coverage,reflection:step.reflection}})
    }
    if(body?.action==='answer'){
      const {data:iv}=await db.from('interviews').select('*').eq('id',String(body.id||'')).eq('user_id',user.id).maybeSingle()
      if(!iv||iv.status!=='asking')return fail('This session is no longer open.',404)
      const rounds=iv.rounds,last=rounds[rounds.length-1]
      if(last.answers)return fail('These questions were already answered.',409)
      last.answers=cleanAnswers(last,body.answers)
      if(!Object.keys(last.answers).length)return fail('Please answer at least one question.',400)
      let step:any={done:true,coverage:iv.coverage,questions:[]}
      if(rounds.length<MAX_ROUNDS)step=await interviewStep(iv.business,rounds,rounds.length+1)
      if(!step.done){
        rounds.push({questions:step.questions,answers:null,reflection:step.reflection})
        await db.from('interviews').update({rounds,coverage:step.coverage}).eq('id',iv.id)
        return NextResponse.json({done:false,round:{no:rounds.length,questions:step.questions,coverage:step.coverage,reflection:step.reflection}})
      }
      const profile=await buildProfile(iv.business,rounds)
      await db.from('interviews').update({rounds,profile,status:'profiled'}).eq('id',iv.id)
      return NextResponse.json({done:true,profile})
    }
    return fail('Unknown request.',400)
  }catch(e:any){console.error('[interview]',e);return fail(AGAIN,500,me.role==='admin'?String(e?.message||e).slice(0,400):undefined)}
}
