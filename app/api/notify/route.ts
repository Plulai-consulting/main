import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// Called by a Supabase Database Webhook on every new row in `messages`.
export async function POST(req){
  const secret=process.env.WEBHOOK_SECRET
  if(!secret||req.headers.get('x-webhook-secret')!==secret)return NextResponse.json({error:'Unauthorized'},{status:401})
  const {record}=await req.json().catch(()=>({}))
  if(!record?.project_id||!record?.sender_id)return NextResponse.json({error:'Bad request'},{status:400})
  const sb:any=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
  const [{data:proj},{data:sender}]=await Promise.all([
    sb.from('projects').select('id,title,notified_client_at,notified_admin_at,profiles(full_name,email)').eq('id',record.project_id).single(),
    sb.from('profiles').select('role,full_name').eq('id',record.sender_id).single()])
  if(!proj||!sender)return NextResponse.json({ok:true,skipped:'unknown'})
  const fromAdmin=sender.role==='admin',col=fromAdmin?'notified_client_at':'notified_admin_at'
  if(proj[col]&&Date.now()-new Date(proj[col]).getTime()<10*60*1000)return NextResponse.json({ok:true,skipped:'throttled'}) // max one email per 10 min per direction
  const to=fromAdmin?proj.profiles?.email:(process.env.ADMIN_NOTIFY_EMAIL||'ceo@plulai.com')
  if(!to||!process.env.RESEND_API_KEY)return NextResponse.json({ok:true,skipped:'email not configured'})
  const link=(process.env.APP_URL||'')+(fromAdmin?'/portal/projects/':'/admin/projects/')+proj.id
  const clean=s=>String(s||'').replace(/[\r\n]+/g,' ').slice(0,120)
  const subject=fromAdmin?`New update on "${clean(proj.title)}"`:`New message from ${clean(sender.full_name)||'a client'}: ${clean(proj.title)}`
  const text=`${String(record.body||'').slice(0,300)}\n\nOpen the conversation: ${link}\n\nPlulAI Consulting`
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM||'PlulAI <onboarding@resend.dev>',to:[to],subject,text})})
  if(r.ok)await sb.from('projects').update({[col]:new Date().toISOString()}).eq('id',proj.id)
  return NextResponse.json({ok:r.ok})
}
