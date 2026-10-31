// Brand colours: validation and a plain-words description for image models (they follow words better than hex codes).
const HEX=/^#[0-9a-f]{6}$/i
export const cleanColors=a=>[...new Set((Array.isArray(a)?a:[]).map(x=>String(x||'').trim().toLowerCase()).filter(x=>HEX.test(x)))].slice(0,4)
function hsl(hex){
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn
  if(!d)return [0,0,l]
  const s=d/(1-Math.abs(2*l-1));let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4
  return [(h*60+360)%360,s,l]
}
export function colorName(hex){
  const [h,s,l]=hsl(hex)
  if(l<.1)return 'near-black';if(l>.94)return 'off-white'
  if(s<.12)return l<.35?'charcoal grey':l<.7?'grey':'light grey'
  let hue=h<15||h>=345?'red':h<40?'orange':h<65?'gold':h<90?'lime green':h<165?'green':h<195?'teal':h<255?'blue':h<290?'purple':'pink'
  if((hue==='orange'||hue==='gold')&&l<.42)hue='brown'
  else if(hue==='orange'&&l>.55&&s<.75)return l>.8?'pale sand':'warm sand gold'
  const tone=l<.25?'very dark ':l<.4?'deep ':l>.78?'pale ':l>.62?'light ':'',sat=s<.35?'muted ':s>.75?'vivid ':''
  return (tone+sat+hue).trim()
}
export const paletteSentence=c=>{
  const cols=cleanColors(c);if(!cols.length)return ''
  const role=['dominant','secondary','accent','extra']
  return `Brand palette, follow it closely: ${cols.map((x,i)=>`${role[i]} ${colorName(x)} (${x})`).join(', ')}. Use these colours for the background, clothing, props, surfaces and graphic shapes, with white, off-white or black as support. Do not introduce other strong colours.`
}
