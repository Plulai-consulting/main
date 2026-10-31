import { ImageResponse } from 'next/og'
export const runtime='edge'
// Social share image (1200x630). Shown when a page is shared on WhatsApp, LinkedIn, X, Facebook.
export async function GET(req){
  const ar=new URL(req.url).searchParams.get('l')==='ar'
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#0e3d32',color:'#f5f1eb',padding:72,fontFamily:'sans-serif'}}>
    <div style={{display:'flex',alignItems:'center',gap:16,fontSize:34,color:'#d4af7c',fontWeight:700}}>PlulAI Consulting</div>
    <div style={{display:'flex',flexDirection:'column',gap:18}}>
      <div style={{display:'flex',fontSize:84,fontWeight:700,lineHeight:1.05}}>Marketing &amp; AI for businesses in the GCC</div>
      <div style={{display:'flex',fontSize:34,color:'#f5f1ebb3'}}>Qatar · UAE · Saudi Arabia · Kuwait · Bahrain · Oman</div></div>
    <div style={{display:'flex',fontSize:30,color:'#d4af7c'}}>{ar?'plulai.com/ar':'plulai.com'}</div></div>,{width:1200,height:630})
}
