import { chatJSON } from './openai'
import { cleanColors } from './colors'
import { runTextPipeline } from './pipeline'
import { AREAS, interviewPrompt, profilePrompt, strategyPrompt, strategyAuditPrompt, strategyFixPrompt } from './prompts'
export const MAX_ROUNDS=3
const ROUND_CAP=[5,6,4]
const S={type:'string'},I={type:'integer'},SA={type:'array',items:S}
const obj=(props)=>({type:'object',additionalProperties:false,required:Object.keys(props),properties:props})
const clean=(v,n)=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,n)
export function cleanBiz(b){
  const o={business_name:clean(b?.business_name,80),industry:clean(b?.industry,80),description:clean(b?.description,1500),
    market:clean(b?.market,60)||'Qatar',language:b?.language==='Arabic'?'Arabic':'English',brand_colors:cleanColors(b?.brand_colors)}
  return o.business_name&&o.industry&&o.description.length>=20?o:null
}
export const cleanAnswers=(round,a)=>{const out={};for(const q of round.questions){const v=Array.isArray(a?.[q.id])?a[q.id].join(' | '):a?.[q.id];const t=clean(v,800);if(t)out[q.id]=t};return out}

// ---------- interview ----------
const INTERVIEW=obj({done:{type:'boolean'},reflection:S,coverage:obj(Object.fromEntries(AREAS.map(k=>[k,I]))),
  questions:{type:'array',items:obj({question:S,why:S,type:{type:'string',enum:['text','long','choice','multi']},options:SA})}})
export async function interviewStep(biz,rounds,no){
  if(no>MAX_ROUNDS)return {done:true,coverage:null,questions:[]}
  const r=await chatJSON({...interviewPrompt(biz,rounds,no),schema:INTERVIEW,name:'interview_round'})
  const cov={};for(const k of AREAS)cov[k]=Math.max(0,Math.min(100,Number(r.coverage?.[k])||0))
  const done=no>1&&(r.done||!r.questions.length)
  const questions=done?[]:r.questions.slice(0,ROUND_CAP[no-1]).map((q,i)=>({id:`r${no}q${i+1}`,question:clean(q.question,300),why:clean(q.why,200),
    type:q.type,options:q.type==='choice'||q.type==='multi'?q.options.map(o=>clean(o,80)).filter(Boolean).slice(0,7):[]}))
    .filter(q=>q.question&&(q.options.length>=2||(q.type!=='choice'&&q.type!=='multi')))
  if(!done&&!questions.length)throw new Error('no questions')
  return {done,coverage:cov,reflection:clean(r.reflection,400),questions}
}

// ---------- profile ----------
const PROFILE=obj({business_summary:S,
  offer:obj({core:S,hero_items:SA,priorities:S,capacity:S}),
  economics:obj({avg_spend:S,best_earners:S,volume_now:S,repeat_rate:S}),baseline:SA,proof_assets:SA,customer_language:SA,
  bottleneck:obj({type:{type:'string',enum:['awareness','trust','conversion','retention','capacity','unclear']},evidence:S}),
  customers:obj({primary:S,secondary:S,buying_reasons:SA,objections:SA,discovery_channels:SA}),
  competitors:{type:'array',items:obj({name_or_type:S,how_we_differ:S})},differentiators:SA,
  goal:obj({statement:S,metric:S,timeframe:S,lead_path:S}),
  history:obj({worked:SA,didnt_work:SA}),
  brand:obj({voice_words:SA,avoid:SA,on_camera:S,assets:S}),
  constraints:obj({posting_capacity:S,budget:S,approvals:S,compliance:SA}),
  timing:obj({seasonal_moments:SA,upcoming:SA}),
  facts_allowed:obj({prices:SA,promotions:SA,contact:SA}),
  unknowns:SA})
export async function buildProfile(biz:any,rounds:any,corrections?:string){
  const p=await chatJSON({...profilePrompt(biz,rounds,corrections),schema:PROFILE,name:'client_profile'})
  if(corrections)p.owner_corrections=corrections
  return p
}
// Turns the interview profile into the settings the post pipeline already understands.
export function briefFromProfile(biz,p,o){
  const j=a=>(a||[]).filter(Boolean).join(', ')
  return {business_name:biz.business_name,industry:biz.industry,
    offer:[p.offer.core,j(p.offer.hero_items)].filter(Boolean).join('. '),audience:p.customers.primary,
    goal:p.goal.metric||p.goal.statement,tone:j(p.brand.voice_words),market:biz.market,
    promo:j(p.facts_allowed.promotions.concat(p.facts_allowed.prices)),contact:j(p.facts_allowed.contact),avoid:j(p.brand.avoid),
    platforms:o.platforms,post_count:o.post_count,language:biz.language,brand_colors:biz.brand_colors||[]}
}

// ---------- strategy ----------
const STRATEGY=obj({summary:S,audience:S,cadence:S,tone_notes:S,
  diagnosis:obj({main_problem:S,evidence:S,opportunity:S}),
  offer:obj({name:S,headline:S,dream_outcome:S,promise:S,for_whom:S,value_levers:obj({certainty:S,speed:S,effort:S}),includes:SA,proof:SA,risk_reducer:S,honest_urgency:S,call_to_action:S,
    upgrades:obj({bonuses:{type:'array',items:obj({idea:S,why_it_sells:S,cost_to_you:S})},guarantee_options:{type:'array',items:obj({type:S,wording:S,risk_to_you:S})},scarcity_options:{type:'array',items:obj({idea:S,honest_condition:S})},price_framing:S}),
    needs_from_owner:SA}),
  campaign:obj({name:S,big_idea:S,category_conventions:SA,our_unfair_angle:S,why_competitors_cant_copy:S,mechanic:S,
    phases:{type:'array',items:obj({week:I,name:S,what_happens:S,content:SA,offline_touchpoint:S})},launch_line:S,proof_moment:S,test_first:S,success_signals:SA,originality_note:S}),
  visual_direction:obj({style:S,palette_use:S,avoid:S}),
  quick_wins:{type:'array',items:obj({action:S,why:S,effort:{type:'string',enum:['low','medium','high']},time_needed:S})},
  lead_handling:obj({first_reply:S,follow_up:S,tracking:SA}),
  positioning:obj({statement:S,proof_points:SA,not_for:S}),
  pillars:{type:'array',items:obj({name:S,why:S,based_on:S,share_percent:I})},
  personas:{type:'array',items:obj({name:S,who:S,wants:S,objection:S,how_we_answer:S})},
  messages:{type:'array',items:obj({message:S,for_persona:S,based_on:S})},
  platform_roles:{type:'array',items:obj({platform:S,role:S,why:S})},
  funnel:obj({awareness:I,consideration:I,conversion:I}),
  calendar:{type:'array',items:obj({week:I,focus:S,goal:S,content_types:SA})},
  kpis:{type:'array',items:obj({metric:S,how_to_measure:S,target:S})},
  assumptions:SA,risks:SA,will_not_do:SA})
const AUDIT=obj({passed:{type:'boolean'},issues:{type:'array',items:obj({post_index:I,category:S,problem:S,fix:S})}})
const GENERIC=/post consistently|engage with your audience|high[- ]quality content|stay consistent|go viral|leverage|synergy|\bhustle\b/i
export function strategyRules(b,p,s){
  const issues:any[]=[],add=(category,problem,fix)=>issues.push({post_index:-1,category,problem,fix})
  const sum=a=>a.reduce((t,x)=>t+(Number(x)||0),0)
  if(s.pillars.length<3||s.pillars.length>5)add('pillars',`${s.pillars.length} pillars`,'Use 3 to 5 pillars')
  if(sum(s.pillars.map(x=>x.share_percent))!==100)add('pillars','Pillar shares do not total 100','Make share_percent total exactly 100')
  if(sum([s.funnel.awareness,s.funnel.consideration,s.funnel.conversion])!==100)add('funnel','Funnel does not total 100','Make the three values total exactly 100')
  if(s.calendar.length!==4)add('calendar','Calendar must cover exactly 4 weeks','Return weeks 1 to 4')
  for(const x of s.pillars.concat(s.messages))if(!clean(x.based_on,400))add('traceability',`"${x.name||x.message}" has no based_on`,'Tie it to something the owner said')
  const have=s.platform_roles.map(r=>r.platform.toLowerCase())
  for(const pl of b.platforms)if(!have.includes(pl.toLowerCase()))add('platforms',`No role for ${pl}`,'Add a role for every requested platform')
  if(s.quick_wins.length<3||s.quick_wins.length>5)add('quick wins',`${s.quick_wins.length} quick wins`,'Give 3 to 5 quick wins')
  if(!clean(s.diagnosis.main_problem,300)||!clean(s.diagnosis.evidence,600))add('diagnosis','Diagnosis or its evidence is empty','Name the main problem and quote the owner as evidence')
  if(!clean(s.offer.headline,200)||!clean(s.offer.promise,500)||!clean(s.offer.call_to_action,300))add('offer','Offer is incomplete','Fill the headline, promise and call to action')
  if(s.campaign.phases.length!==4)add('campaign','Campaign must have exactly 4 weekly phases','Return weeks 1 to 4')
  if(!clean(s.campaign.name,200)||!clean(s.campaign.our_unfair_angle,600)||!clean(s.campaign.mechanic,600)||!clean(s.campaign.launch_line,200))add('campaign','Campaign is incomplete','Fill the name, unfair angle, mechanic and launch line')
  if(s.campaign.category_conventions.length<2)add('campaign','Too few category conventions','Describe 3 to 5 common habits in this field')
  if(!clean(s.offer.dream_outcome,400)||!clean(s.offer.name,200))add('offer','Offer needs a name and a dream outcome','Fill them')
  if(!clean(s.lead_handling.first_reply,800))add('lead handling','first_reply is empty','Write the first reply message')
  const all=JSON.stringify(s)
  const facts=JSON.stringify(p.facts_allowed).toLowerCase().replace(/\s+/g,'')
  const money=/\d[\d.,]*\s?(?:QAR|SAR|AED|KWD|BHD|OMR|USD|EUR|ريال|درهم|دينار|ر\.ق|ر\.س|د\.إ)|(?:QAR|SAR|AED|KWD|BHD|OMR|USD|\$|€)\s?\d[\d.,]*|\d+\s?%\s?(?:off|discount|خصم)|خصم\s?\d+\s?%?/gi
  for(const m of JSON.stringify([s.offer,s.lead_handling,s.messages,s.quick_wins,s.campaign]).match(money)||[])
    if(!facts.includes(m.toLowerCase().replace(/\s+/g,'')))add('invented price',`"${m}" was not given by the owner`,'Remove it, or ask the owner in needs_from_owner')
  if(b.language==='English'&&GENERIC.test(all))add('generic','Contains filler marketing language','Replace with specifics from the profile')
  if(b.language==='Arabic'&&!/[\u0600-\u06FF]/.test(s.summary))add('language','Summary is not in Arabic','Write in Arabic')
  const allowed=JSON.stringify(p.facts_allowed).toLowerCase()
  for(const m of all.match(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.\w+|\+?\d[\d\s-]{7,}\d/g)||[])
    if(!allowed.includes(m.toLowerCase().replace(/["\\.,;:!?)]+$/,'')))add('invented contact',`"${m}" was not provided`,'Remove it')
  return issues
}
export async function runStrategyPipeline(b,p){
  const log:any[]=[];let s=await chatJSON({...strategyPrompt(b,p),schema:STRATEGY,name:'strategy'})
  for(let attempt=1;attempt<=3;attempt++){
    let issues=strategyRules(b,p,s)
    if(!issues.length){const a=await chatJSON({...strategyAuditPrompt(b,p,s),schema:AUDIT,name:'strategy_audit'});issues=a.passed?[]:a.issues}
    log.push({attempt,passed:!issues.length,issues,draft:s})
    if(!issues.length)return {ok:true,strategy:s,log,attempts:attempt}
    if(attempt<3)s=await chatJSON({...strategyFixPrompt(b,p,s,issues),schema:STRATEGY,name:'strategy'})
  }
  return {ok:false,strategy:s,log,attempts:3}
}
// Strategy first (checked), then posts that must follow it (checked).
export async function runFullPipeline(b,p){
  const s=await runStrategyPipeline(b,p)
  if(!s.ok)return {ok:false,output:null,log:s.log,attempts:s.attempts}
  const t=await runTextPipeline(b,{profile:p,strategy:s.strategy})
  return {ok:t.ok,output:t.output,log:[...s.log,...t.log.map(l=>({...l,attempt:l.attempt+10}))],attempts:t.attempts}
}
