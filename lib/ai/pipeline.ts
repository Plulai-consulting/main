import { chatJSON, openaiImage } from './openai'
import { higgsImage } from './higgsfield'
import { generatePrompt, auditPrompt, fixPrompt, visionPrompt, imageStyle } from './prompts'
const S={type:'string'}
const OUTPUT={type:'object',additionalProperties:false,required:['strategy','posts'],properties:{
  strategy:{type:'object',additionalProperties:false,required:['summary','audience','pillars','cadence','tone_notes'],properties:{summary:S,audience:S,cadence:S,tone_notes:S,
    pillars:{type:'array',items:{type:'object',additionalProperties:false,required:['name','why'],properties:{name:S,why:S}}}}},
  posts:{type:'array',items:{type:'object',additionalProperties:false,required:['platform','pillar','objective','format','why','hook','caption','hashtags','cta','overlay_text','image_prompt'],
    properties:{platform:S,pillar:S,objective:{type:'string',enum:['awareness','consideration','conversion']},format:S,why:S,hook:S,caption:S,cta:S,overlay_text:S,image_prompt:S,hashtags:{type:'array',items:S}}}}}}
const OUTPUT_POSTS={type:'object',additionalProperties:false,required:['posts'],properties:{posts:OUTPUT.properties.posts}}
const AUDIT={type:'object',additionalProperties:false,required:['passed','issues'],properties:{passed:{type:'boolean'},
  issues:{type:'array',items:{type:'object',additionalProperties:false,required:['post_index','category','problem','fix'],properties:{post_index:{type:'integer'},category:S,problem:S,fix:S}}}}}
const VISION={type:'object',additionalProperties:false,required:['ok','problem'],properties:{ok:{type:'boolean'},problem:S}}
const LIMIT={x:280,twitter:280,linkedin:3000,facebook:5000,instagram:2200,tiktok:2200}
export function normalize(o){
  const t=v=>String(v??'').replace(/\s+\n/g,'\n').trim()
  for(const p of o.posts||[]){for(const k of ['platform','pillar','format','why','hook','caption','cta','overlay_text','image_prompt'])p[k]=t(p[k])
    p.hashtags=[...new Set((p.hashtags||[]).map(h=>'#'+String(h).replace(/[#\s]+/g,'')).filter(h=>h.length>1))].slice(0,12)}
  return o
}
// Deterministic checks: cheap and never "forgetful" like a model can be.
export function rulesCheck(b:any,o:any,ctx?:any){
  const issues:any[]=[],add=(i,category,problem,fix)=>issues.push({post_index:i,category,problem,fix})
  const posts=o.posts||[]
  if(posts.length!==b.post_count)add(-1,'count',`Expected ${b.post_count} posts but got ${posts.length}`,`Return exactly ${b.post_count} posts`)
  const allowed=(b.contact+' '+b.promo+' '+b.offer).toLowerCase()
  const avoid=b.avoid.split(/[,\n]/).map(s=>s.trim().toLowerCase()).filter(Boolean)
  const seen=new Set()
  posts.forEach((p,i)=>{
    const text=[p.hook,p.caption,p.cta,p.overlay_text,...p.hashtags].join(' ')
    if(ctx&&!ctx.strategy.pillars.some(x=>x.name.trim().toLowerCase()===p.pillar.toLowerCase()))add(i,'pillar',`Pillar "${p.pillar}" is not in the strategy`,`Use exactly one of: ${ctx.strategy.pillars.map(x=>x.name).join(' | ')}`)
    if(!p.caption||!p.hook||!p.cta)add(i,'missing','Hook, caption or call to action is empty','Fill every field')
    if(!b.platforms.map(x=>x.toLowerCase()).includes(p.platform.toLowerCase()))add(i,'platform',`Platform "${p.platform}" was not requested`,`Use one of: ${b.platforms.join(', ')}`)
    const lim=LIMIT[p.platform.toLowerCase()]||2200
    if(p.caption.length>lim)add(i,'length',`Caption is ${p.caption.length} characters, limit is ${lim}`,'Shorten the caption')
    if(p.overlay_text.split(/\s+/).length>8)add(i,'length','Overlay text is too long','Use at most 6 words')
    if(/\[[^\]]*\]|lorem ipsum|\bTBD\b|\bXXX\b/i.test(text))add(i,'placeholder','Contains placeholder text','Replace with real wording')
    const hasAr=/[\u0600-\u06FF]/.test(p.caption)
    if(b.language==='Arabic'&&!hasAr)add(i,'language','Caption is not in Arabic','Write the caption in Arabic')
    if(b.language==='English'&&hasAr)add(i,'language','Caption contains Arabic but English was requested','Write the caption in English')
    for(const w of avoid)if(text.toLowerCase().includes(w))add(i,'avoid',`Contains avoided word "${w}"`,'Remove it')
    for(const m of text.match(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.\w+|\+?\d[\d\s-]{7,}\d/g)||[])
      if(!allowed.includes(m.toLowerCase().replace(/[.,;:!?)]+$/,'')))add(i,'invented contact',`Contact detail "${m}" was not provided`,'Remove it')
    const key=p.caption.toLowerCase().slice(0,60);if(seen.has(key))add(i,'duplicate','Caption repeats another post','Rewrite it');seen.add(key)
    if(/\b(text|letters|logo|watermark|typography)\b/i.test(p.image_prompt))add(i,'image prompt','Image prompt asks for text or logos','Describe only the scene, with no text')
  })
  return issues
}
export async function runTextPipeline(b:any,ctx?:any){
  const schema=ctx?OUTPUT_POSTS:OUTPUT,done=o=>ctx?{strategy:ctx.strategy,posts:o.posts}:o
  const log:any[]=[];let out=normalize(await chatJSON({...generatePrompt(b,ctx),schema,name:'social_plan'}))
  for(let attempt=1;attempt<=3;attempt++){
    let issues=rulesCheck(b,out,ctx)
    if(!issues.length){const a=await chatJSON({...auditPrompt(b,out,ctx),schema:AUDIT,name:'audit'});issues=a.passed?[]:a.issues}
    log.push({attempt,passed:!issues.length,issues,draft:issues.length?out:null})
    if(!issues.length)return {ok:true,output:done(out),log,attempts:attempt}
    if(attempt<3)out=normalize(await chatJSON({...fixPrompt(b,out,issues,ctx),schema,name:'social_plan'}))
  }
  return {ok:false,output:done(out),log,attempts:3}
}
// Makes one image that has passed an automatic visual check, or returns null (the team is then flagged).
export async function makeImage(b,post,key){
  for(let i=0;i<3;i++){
    try{
      const prompt=`${post.image_prompt}\n\n${imageStyle(b)}`
      const img=process.env.IMAGE_PROVIDER==='openai'?await openaiImage(prompt):await higgsImage(prompt,`${key}-${i}`)
      const v=await chatJSON({...visionPrompt(post),schema:VISION,name:'image_check',image:`data:${img.type};base64,${img.buf.toString('base64')}`})
      if(v.ok)return img
    }catch(e:any){if(i===2)return null}
  }
  return null
}
