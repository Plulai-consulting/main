import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
// Keeps the login session fresh and sends signed-out visitors to /login.
// Role checks (admin vs client) are enforced again inside each page and by database rules.
export async function middleware(request){
  let response=NextResponse.next({request})
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{
    getAll(){return request.cookies.getAll()},
    setAll(list){
      list.forEach(({name,value})=>request.cookies.set(name,value))
      response=NextResponse.next({request})
      list.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}})
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){const url=request.nextUrl.clone();url.pathname='/login';url.search='?next='+encodeURIComponent(request.nextUrl.pathname);return NextResponse.redirect(url)}
  return response
}
export const config={matcher:['/portal/:path*','/admin/:path*']}
