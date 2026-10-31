import { cleanColors } from './colors'
const LIMITS={business_name:80,industry:80,offer:400,audience:300,goal:60,tone:40,market:60,promo:500,contact:200,avoid:200}
export const PLATFORMS=['Instagram','TikTok','Facebook','LinkedIn','X']
export function cleanBrief(b){
  const o:any={}
  for(const k in LIMITS)o[k]=String(b?.[k]||'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,LIMITS[k])
  o.platforms=(Array.isArray(b?.platforms)?b.platforms:[]).filter(p=>PLATFORMS.includes(p))
  o.post_count=[3,5,7,10].includes(Number(b?.post_count))?Number(b.post_count):5
  o.language=b?.language==='Arabic'?'Arabic':'English'
  o.market=o.market||'Qatar'
  o.brand_colors=cleanColors(b?.brand_colors)
  if(!o.business_name||!o.industry||!o.offer||!o.audience||!o.platforms.length)return null
  return o
}
