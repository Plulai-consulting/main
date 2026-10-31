import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'} // blocks spreadsheet formula injection
export async function GET(req,{params}){
  const sb=createClient();const {data:{user}}=await sb.auth.getUser()
  if(!user)return NextResponse.redirect(new URL('/login',req.url))
  const {data:me}=await sb.from('profiles').select('role').eq('id',user.id).single()
  if(me?.role!=='admin')return new NextResponse('Forbidden',{status:403})
  let head,rows
  if(params.type==='waitlist'){head=['name','email','business','joined'];rows=((await sb.from('waitlist').select('name,email,business,created_at').order('created_at',{ascending:false}).limit(10000)).data||[]).map(r=>[r.name,r.email,r.business,r.created_at])}
  else if(params.type==='clients'){head=['name','email','joined'];rows=((await sb.from('profiles').select('full_name,email,created_at').eq('role','client').order('created_at',{ascending:false}).limit(10000)).data||[]).map(r=>[r.full_name,r.email,r.created_at])}
  else if(params.type==='projects'){head=['title','client','client_email','service','phase','created'];rows=((await sb.from('projects').select('title,service,phase,created_at,profiles(full_name,email)').order('created_at',{ascending:false}).limit(10000)).data||[]).map(r=>[r.title,r.profiles?.full_name,r.profiles?.email,r.service,r.phase,r.created_at])}
  else return new NextResponse('Not found',{status:404})
  const csv='\ufeff'+[head,...rows].map(r=>r.map(cell).join(',')).join('\r\n')
  return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="plulai-${params.type}.csv"`}})
}
