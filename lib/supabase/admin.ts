import { createClient } from '@supabase/supabase-js'
// Server only. Bypasses database rules, so call it only after you have checked the user yourself.
export const adminClient=():any=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
