// Verified against docs.higgsfield.ai: POST /marketing-studio/image, poll status_url until "completed".
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const auth=()=>'Key '+process.env.HIGGSFIELD_KEY_ID+':'+process.env.HIGGSFIELD_KEY_SECRET
export async function higgsImage(prompt,idempotencyKey){
  const sub=await fetch('https://api.higgsfield.ai/marketing-studio/image',{method:'POST',signal:AbortSignal.timeout(30000),
    headers:{Authorization:auth(),'Content-Type':'application/json','Idempotency-Key':idempotencyKey},
    body:JSON.stringify({prompt:prompt.slice(0,5000),resolution:'1k',aspect_ratio:'1:1',quality:'high',enhance_prompt:false})})
  if(!sub.ok)throw new Error('higgsfield submit '+sub.status)
  const {status_url}=await sub.json()
  if(new URL(status_url).hostname!=='api.higgsfield.ai')throw new Error('unexpected status url')
  const end=Date.now()+170000
  while(Date.now()<end){
    await sleep(3000)
    const s=await (await fetch(status_url,{headers:{Authorization:auth()},signal:AbortSignal.timeout(20000)})).json()
    if(s.status==='completed'&&s.images?.[0]?.url){
      const img=await fetch(s.images[0].url,{signal:AbortSignal.timeout(60000)})
      const type=img.headers.get('content-type')||'image/png'
      const buf=Buffer.from(await img.arrayBuffer())
      if(!/^image\//.test(type)||buf.length>12e6)throw new Error('bad image')
      return {buf,type}
    }
    if(['failed','nsfw','canceled','cancelled'].includes(s.status))throw new Error('higgsfield '+s.status)
  }
  throw new Error('higgsfield timeout')
}
