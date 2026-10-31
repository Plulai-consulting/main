const sleep=ms=>new Promise(r=>setTimeout(r,ms))
// Works with OpenAI (default) or any OpenAI-compatible provider, e.g. OpenRouter or Google Gemini.
// AI_BASE_URL, AI_API_KEY (falls back to OPENAI_API_KEY), OPENAI_MODEL. See .env.example.
export const aiBase=()=>(process.env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')
export const aiKey=()=>process.env.AI_API_KEY||process.env.OPENAI_API_KEY
const mode=()=>process.env.AI_JSON_MODE||(aiBase().includes('api.openai.com')?'schema':'prompt')
function check(v,sc,path){ // small JSON-schema check, used when the provider cannot enforce the schema itself
  const t=sc.type,bad=m=>{throw Object.assign(new Error('JSON did not match the schema at '+(path||'root')+': '+m),{fatal:false})}
  if(t==='object'){if(!v||typeof v!=='object'||Array.isArray(v))bad('expected object');for(const k of sc.required||[]){if(!(k in v))bad('missing '+k);check(v[k],sc.properties[k],path+'.'+k)}}
  else if(t==='array'){if(!Array.isArray(v))bad('expected array');v.forEach((x,i)=>check(x,sc.items,path+'['+i+']'))}
  else if(t==='string'){if(typeof v!=='string')bad('expected string');if(sc.enum&&!sc.enum.includes(v))bad('value not allowed')}
  else if(t==='integer'||t==='number'){if(typeof v!=='number')bad('expected number')}
  else if(t==='boolean'){if(typeof v!=='boolean')bad('expected true/false')}
}
const extract=t=>{const s=t.indexOf('{'),e=t.lastIndexOf('}');if(s<0||e<s)throw new Error('no JSON in reply');return JSON.parse(t.slice(s,e+1))}
export async function chatJSON({system,user,schema,name,image}:{system:string;user:string;schema:any;name:string;image?:string}):Promise<any>{
  const prompt=mode()==='prompt'
  const sys=prompt?system+'\n\nReturn ONLY one valid JSON object, no markdown and no commentary, that matches this JSON Schema exactly (every listed property is required):\n'+JSON.stringify(schema):system
  const content=image?[{type:'text',text:user},{type:'image_url',image_url:{url:image}}]:user
  const tries=prompt?3:2;let last
  for(let i=0;i<tries;i++){
    try{
      const headers={Authorization:'Bearer '+aiKey(),'Content-Type':'application/json','X-Title':'PlulAI'};if(process.env.APP_URL)headers['HTTP-Referer']=process.env.APP_URL
      const body:any={model:process.env.OPENAI_MODEL||'gpt-5-mini',messages:[{role:'system',content:sys},{role:'user',content}]}
      if(!prompt)body.response_format={type:'json_schema',json_schema:{name,strict:true,schema}}
      const r=await fetch(aiBase()+'/chat/completions',{method:'POST',signal:AbortSignal.timeout(100000),headers,body:JSON.stringify(body)})
      if(!r.ok){
        const text=(await r.text().catch(()=>'')).replace(/\s+/g,' ').slice(0,300)
        const err:any=new Error('ai '+r.status+': '+text)
        err.fatal=!(r.status>=500||r.status===408||(r.status===429&&!/insufficient_quota|per-day|daily/i.test(text)))
        throw err}
      const m=(await r.json()).choices?.[0]?.message
      if(!m?.content||m.refusal)throw new Error('ai empty reply')
      const out=prompt?extract(m.content):JSON.parse(m.content)
      if(prompt)check(out,schema,'')
      return out
    }catch(e:any){last=e;if(e.fatal||i===tries-1)throw e;await sleep(1500)}
  }
  throw last
}
export async function openaiImage(prompt){
  const r=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',signal:AbortSignal.timeout(150000),
    headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',prompt,size:'1024x1024',n:1})})
  if(!r.ok)throw new Error('openai image '+r.status)
  const b=(await r.json()).data?.[0]?.b64_json
  if(!b)throw new Error('openai image empty')
  return {buf:Buffer.from(b,'base64'),type:'image/png'}
}
