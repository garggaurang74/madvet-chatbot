// SAVE TO: app/api/share-card/[id]/route.tsx
// ALSO: run "bash download-fonts.sh" once to put fonts in public/fonts/

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Node.js runtime — can read files from disk, reliable, no edge CORS issues
export const runtime = 'nodejs'

type FontOptions = {
  name: string
  data: ArrayBuffer
  weight?: 100|200|300|400|500|600|700|800|900
  style?: 'normal'|'italic'
}

const CAT_CONFIG: Record<string, {
  h:number; s:number; l:number; accent:string; bgTop:string; bgBot:string
  problem:string; solution:string; modeLabel:string; kills:string[]
}> = {
  'Anthelmintic / Antiparasitic': { h:158,s:68,l:28, accent:'#16a34a', bgTop:'#bbf7d0', bgBot:'#f0fdf4',
    problem:'पेट के कीड़ों से\nहै परेशान?', solution:'करेगा समाधान', modeLabel:'Unique Mode of Action',
    kills:['गोल कीड़े','फीताकृमि','फेफड़े के कीड़े','मांज माइट्स'] },
  'Ectoparasiticide': { h:42,s:78,l:28, accent:'#b45309', bgTop:'#fde68a', bgBot:'#fef9c3',
    problem:'किलनी / चिचड़ी से\nहै परेशान?', solution:'करेगा समाधान', modeLabel:'Unique Mode of Action',
    kills:['किलनी (Ticks)','जूँ (Lice)','माइट्स','मक्खी'] },
  'Antibiotic': { h:218,s:72,l:26, accent:'#1d4ed8', bgTop:'#bfdbfe', bgBot:'#eff6ff',
    problem:'बुखार / संक्रमण से\nहै परेशान?', solution:'करेगा समाधान', modeLabel:'Unique Mode of Action',
    kills:['बैक्टीरिया','संक्रमण','बुखार','सूजन'] },
  'Anti-inflammatory / Analgesic': { h:338,s:78,l:28, accent:'#be123c', bgTop:'#fecdd3', bgBot:'#fff1f2',
    problem:'दर्द / सूजन से\nहै परेशान?', solution:'देगा राहत', modeLabel:'Unique Mode of Action',
    kills:['दर्द','सूजन','बुखार','जकड़न'] },
  'Vitamin Supplement': { h:22,s:85,l:30, accent:'#c2410c', bgTop:'#fed7aa', bgBot:'#fff7ed',
    problem:'दूध कम / कमज़ोरी\nहै परेशान?', solution:'करेगा सुधार', modeLabel:'Unique Mode of Action',
    kills:['कमज़ोरी','दूध में कमी','भूख कम','थकान'] },
  'Vitamin Supplement / Galactogogue': { h:210,s:80,l:26, accent:'#0369a1', bgTop:'#bae6fd', bgBot:'#e0f2fe',
    problem:'दूध उत्पादन\nकम हो गया?', solution:'बढ़ाएगा दूध', modeLabel:'Unique Mode of Action',
    kills:['कम दूध','थनेला','कमज़ोरी','पोषण कमी'] },
  'Probiotic': { h:128,s:65,l:26, accent:'#15803d', bgTop:'#bbf7d0', bgBot:'#f0fdf4',
    problem:'पाचन खराब /\nभूख नहीं लगती?', solution:'करेगा सुधार', modeLabel:'Unique Mode of Action',
    kills:['दस्त','कब्ज','अफारा','खराब पाचन'] },
  'Dermatological': { h:272,s:58,l:28, accent:'#7c3aed', bgTop:'#e9d5ff', bgBot:'#faf5ff',
    problem:'चमड़ी रोग / खुजली\nसे है परेशान?', solution:'करेगा ठीक', modeLabel:'Unique Mode of Action',
    kills:['खुजली','ज़ख्म','फंगल','बैक्टीरियल'] },
  'Reproductive Hormone': { h:295,s:56,l:26, accent:'#86198f', bgTop:'#f0abfc', bgBot:'#fdf4ff',
    problem:'हीट नहीं आती /\nप्रजनन समस्या?', solution:'करेगा सुधार', modeLabel:'Unique Mode of Action',
    kills:['हीट न आना','गर्भधारण','हार्मोन असंतुलन','बांझपन'] },
  'Antihistamine': { h:200,s:68,l:24, accent:'#0e7490', bgTop:'#a5f3fc', bgBot:'#ecfeff',
    problem:'एलर्जी / सूजन से\nहै परेशान?', solution:'देगा राहत', modeLabel:'Unique Mode of Action',
    kills:['एलर्जी','सूजन','खुजली','लाली'] },
  'Antidiarrheal': { h:168,s:65,l:24, accent:'#0f766e', bgTop:'#99f6e4', bgBot:'#f0fdfa',
    problem:'दस्त / पेचिश से\nहै परेशान?', solution:'करेगा बंद', modeLabel:'Unique Mode of Action',
    kills:['दस्त','पेचिश','बैक्टीरिया','डिहाइड्रेशन'] },
  'Udder Care / Herbal Antimicrobial': { h:88,s:60,l:26, accent:'#4d7c0f', bgTop:'#d9f99d', bgBot:'#f7fee7',
    problem:'थनेला / थन रोग\nसे है परेशान?', solution:'करेगा ठीक', modeLabel:'Unique Mode of Action',
    kills:['थनेला','सूजन','बैक्टीरिया','दर्द'] },
  'Digestive / Antiflatulent': { h:33,s:78,l:28, accent:'#b45309', bgTop:'#fde68a', bgBot:'#fffbeb',
    problem:'अफारा / गैस से\nहै परेशान?', solution:'देगा राहत', modeLabel:'Unique Mode of Action',
    kills:['अफारा','गैस','कब्ज','पेट दर्द'] },
}

function hsl(h:number,s:number,l:number){return `hsl(${h},${s}%,${l}%)`}

function getAccent(id:number,cat:string){
  const cfg=CAT_CONFIG[cat]
  if(!cfg) return '#2563eb'
  const h=((cfg.h+((id*37+13)%41)-20)+360)%360
  return hsl(h,cfg.s,cfg.l)
}

function splitBenefits(txt='',max=5){
  return txt.split(/[•\n,;|]+/).map((s:string)=>s.trim()).filter((s:string)=>s.length>5).slice(0,max)
}

function readFont(name:string):Buffer|null{
  try{
    return fs.readFileSync(path.join(process.cwd(),'public','fonts',name))
  }catch{
    return null
  }
}

async function imgToDataURI(url:string):Promise<string|null>{
  try{
    const res=await fetch(url,{signal:AbortSignal.timeout(5000)})
    if(!res.ok) return null
    const buf=Buffer.from(await res.arrayBuffer())
    const ct=res.headers.get('content-type')||'image/jpeg'
    return `data:${ct};base64,${buf.toString('base64')}`
  }catch{return null}
}

const SPECIES_MAP:Record<string,string>={
  Cattle:'🐄 गाय',Buffalo:'🐃 भैंस',Sheep:'🐑 भेड़',Goat:'🐐 बकरी',
  Dog:'🐕 कुत्ता',Cat:'🐈 बिल्ली',Horse:'🐴 घोड़ा',Poultry:'🐓 मुर्गी',Calf:'🐮 बछड़ा'
}

export async function GET(
  _req:Request,
  {params}:{params:Promise<{id:string}>}
){
  try{
    const {id:rawId}=await params
    const id=parseInt(rawId,10)
    if(isNaN(id)) return new Response('Bad ID',{status:400})

    const APP_URL=(process.env.NEXT_PUBLIC_APP_URL??'https://ai.madvet.in').replace(/\/$/,'')

    // ── 1. Read fonts from disk ──────────────────────────────────────────────
    const oswaldBuf  = readFont('oswald-bold.woff')
    const notoBuf    = readFont('noto-devanagari.woff')
    const barlowBuf  = readFont('barlow-condensed.woff')

    // ── 2. Fetch product + icon in parallel ─────────────────────────────────
    const supabase=createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const table=(process.env.NEXT_PUBLIC_SUPABASE_TABLE??'products_enriched').trim()
    const [{data,error}, iconURI] = await Promise.all([
      supabase.from(table).select('*').eq('id',id).single(),
      imgToDataURI(`${APP_URL}/madvet-icon.png`),
    ])

    if(error||!data) return new Response('Not found',{status:404})

    const p=data
    const name      =(p.product_name??p.name??'') as string
    const category  =(p.category??'') as string
    const salt      =(p.salt_ingredient??p.salt??'') as string
    const packaging =(p.packaging??'') as string
    const form      =(p.formulation??'') as string
    const rawImgUrl =(p.image_url??'') as string
    const bHi       =splitBenefits(p.usp_benefits_hi??p.usp_benefits??'',5)
    const bEn       =splitBenefits(p.usp_benefits??'',5)
    const speciesArr=(p.species??'').split(/[,/]/).map((s:string)=>s.trim()).filter(Boolean).slice(0,6)

    // ── 3. Fetch product image as base64 ────────────────────────────────────
    const productURI = rawImgUrl ? await imgToDataURI(rawImgUrl) : null

    const cfg=CAT_CONFIG[category]
    const accent=getAccent(id,category)
    const problemLines=(cfg?.problem??'पशु की बीमारी\nसे है परेशान?').split('\n')
    const killItems=cfg?.kills??bEn.slice(0,4)
    const modeLabel=cfg?.modeLabel??'Unique Mode of Action'
    const nfs=name.length>18?30:name.length>13?38:name.length>9?46:54

    // ── 4. Build font list with explicit types ───────────────────────────────
    const fonts: FontOptions[] = []
    if(oswaldBuf) fonts.push({name:'Oswald',    data: oswaldBuf.buffer  as ArrayBuffer, weight:700, style:'normal'})
    if(notoBuf)   fonts.push({name:'NotoHindi', data: notoBuf.buffer    as ArrayBuffer, weight:600, style:'normal'})
    if(barlowBuf) fonts.push({name:'Barlow',    data: barlowBuf.buffer  as ArrayBuffer, weight:400, style:'normal'})

    const OW =oswaldBuf ?'"Oswald"'   :'sans-serif'
    const HI =notoBuf   ?'"NotoHindi"':'sans-serif'
    const BAR=barlowBuf ?'"Barlow"'   :'sans-serif'
    const bgTop=cfg?.bgTop??'#bfdbfe'
    const bgBot=cfg?.bgBot??'#eff6ff'

    // ── 5. Render card ───────────────────────────────────────────────────────
    return new ImageResponse(
      <div style={{display:'flex',flexDirection:'column',width:500,backgroundColor:bgBot}}>

        {/* TOP HEADER — sky blue gradient */}
        <div style={{display:'flex',flexDirection:'column',background:`linear-gradient(180deg,${bgTop},${bgBot})`,padding:'14px 18px 12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{background:'#fff',borderRadius:50,width:58,height:58,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #cbd5e1'}}>
              {iconURI?<img src={iconURI} width={48} height={48} style={{objectFit:'contain'}}/>:<span style={{fontSize:32}}>🐾</span>}
            </div>
            <div style={{background:'#991b1b',borderRadius:24,padding:'7px 18px',display:'flex'}}>
              <span style={{fontFamily:OW,fontSize:15,fontWeight:700,color:'#fff'}}>{packaging}</span>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:8}}>
            <span style={{fontFamily:BAR,fontSize:12,color:'#1e3a5f',fontWeight:700}}>{salt}</span>
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:2}}>
            <span style={{fontFamily:OW,fontSize:nfs,fontWeight:700,color:'#7f1d1d',letterSpacing:1}}>{name}</span>
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:4}}>
            <span style={{fontFamily:BAR,fontSize:11,color:'#1e3a5f',fontWeight:700}}>
              {form} · For {speciesArr.join(', ')}
            </span>
          </div>
        </div>

        {/* MAIN BODY */}
        <div style={{display:'flex',background:`linear-gradient(180deg,${bgBot},#f8fafc)`,padding:'14px 16px',gap:14}}>

          {/* LEFT — Hindi problem + solution + product image */}
          <div style={{display:'flex',flexDirection:'column',width:180,gap:2}}>
            {problemLines.map((line:string,i:number)=>(
              <span key={i} style={{fontFamily:HI,fontSize:22,color:'#dc2626',fontWeight:800,lineHeight:1.2}}>{line}</span>
            ))}
            <span style={{fontFamily:HI,fontSize:20,color:'#dc2626',fontWeight:800,lineHeight:1.3,marginTop:8}}>{name}</span>
            <span style={{fontFamily:HI,fontSize:20,color:'#dc2626',fontWeight:800,lineHeight:1.3}}>{cfg?.solution??'करेगा समाधान'}</span>
            <div style={{width:172,height:172,display:'flex',alignItems:'center',justifyContent:'center',marginTop:10}}>
              {productURI
                ?<img src={productURI} width={164} height={164} style={{objectFit:'contain'}}/>
                :<span style={{fontSize:72}}>{form==='Injection'?'💉':form==='Bolus'?'💊':'🧴'}</span>
              }
            </div>
          </div>

          {/* RIGHT — Mode of action */}
          <div style={{display:'flex',flexDirection:'column',flex:1,gap:7}}>
            <div style={{background:'#1e3a8a',borderRadius:8,padding:'8px 12px',display:'flex'}}>
              <span style={{fontFamily:BAR,fontSize:13,color:'#fff',fontWeight:700,lineHeight:1.3}}>{modeLabel} :</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {bEn.slice(0,5).map((b:string,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:5}}>
                  <span style={{color:'#dc2626',fontSize:14,flexShrink:0,marginTop:1}}>◆</span>
                  <span style={{fontFamily:BAR,fontSize:11.5,color:'#1e293b',lineHeight:1.35,fontWeight:600}}>{b}</span>
                </div>
              ))}
            </div>
            {/* Kill badges */}
            <div style={{display:'flex',gap:5,marginTop:4}}>
              {killItems.slice(0,4).map((k:string,i:number)=>(
                <div key={i} style={{display:'flex',background:'#fee2e2',borderRadius:20,padding:'3px 7px',border:'1.5px solid #fca5a5',alignItems:'center',gap:3}}>
                  <span style={{fontSize:10,color:'#dc2626'}}>✕</span>
                  <span style={{fontFamily:HI,fontSize:8.5,color:'#991b1b',fontWeight:700}}>{k}</span>
                </div>
              ))}
            </div>
            {/* Hindi benefits */}
            <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:2}}>
              {bHi.slice(0,3).map((b:string,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',background:'rgba(255,255,255,0.8)',borderRadius:6,padding:'5px 8px'}}>
                  <span style={{fontFamily:HI,fontSize:10.5,color:'#1e3a8a',fontWeight:700,lineHeight:1.4}}>✓ {b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SPECIES STRIP */}
        <div style={{display:'flex',alignItems:'center',background:'#1e3a8a',padding:'8px 18px',gap:10}}>
          <span style={{fontFamily:HI,fontSize:10,color:'rgba(255,255,255,0.6)',flexShrink:0}}>उपयोग :</span>
          <div style={{display:'flex',gap:10,flex:1}}>
            {speciesArr.map((sp:string,i:number)=>(
              <span key={i} style={{fontFamily:HI,fontSize:11,color:'#fff',fontWeight:700}}>{SPECIES_MAP[sp]??sp}</span>
            ))}
          </div>
          <div style={{background:'rgba(255,255,255,0.18)',borderRadius:20,padding:'3px 10px',display:'flex'}}>
            <span style={{fontFamily:OW,fontSize:9,color:'#fff',letterSpacing:1}}>{form.toUpperCase()}</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#111827',padding:'10px 18px'}}>
          <div style={{display:'flex',flexDirection:'column'}}>
            <span style={{fontFamily:HI,fontSize:10,color:'rgba(255,255,255,0.4)'}}>सभी उत्पाद देखें</span>
            <span style={{fontFamily:OW,fontSize:15,color:'#fff',fontWeight:700}}>madvet.in/products</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',background:accent,borderRadius:8,padding:'7px 16px'}}>
            <span style={{fontFamily:HI,fontSize:12,color:'#fff',fontWeight:700}}>अभी ऑर्डर करें</span>
            <span style={{fontFamily:BAR,fontSize:9,color:'rgba(255,255,255,0.85)'}}>📞 9935257750</span>
          </div>
        </div>

        {/* YELLOW FOOTER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#FFD700',padding:'12px 18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{background:'#fff',borderRadius:8,width:46,height:46,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {iconURI?<img src={iconURI} width={40} height={40} style={{objectFit:'contain'}}/>:<span style={{fontSize:24}}>🐾</span>}
            </div>
            <div style={{display:'flex',flexDirection:'column'}}>
              <span style={{fontFamily:OW,fontSize:26,fontWeight:900,color:'#1a2f8a',letterSpacing:2.5,lineHeight:1}}>MADVET</span>
              <span style={{fontFamily:BAR,fontSize:9,color:'#1a2f8a',letterSpacing:1.2,fontWeight:700}}>Animal Healthcare</span>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
            <span style={{fontFamily:BAR,fontSize:8,color:'#111'}}>Ghaziabad (U.P.) | I.S.O. 9001:2013 COMPANY</span>
            <span style={{fontFamily:BAR,fontSize:8,color:'#333'}}>Email: madvet.animal@gmail.com</span>
            <span style={{fontFamily:BAR,fontSize:8,color:'#333'}}>web: www.madvet.in | support@madvet.in</span>
            <span style={{fontFamily:OW,fontSize:10,fontWeight:800,color:'#1a2f8a',marginTop:2}}>Customer Care: 9935257750</span>
          </div>
        </div>

      </div>,
      {width:500,height:830,fonts}
    )

  }catch(err){
    const msg=err instanceof Error?err.message:String(err)
    console.error('share-card error:',msg)
    return new ImageResponse(
      <div style={{display:'flex',width:500,height:160,background:'#fee2e2',alignItems:'center',justifyContent:'center',padding:20}}>
        <span style={{fontSize:13,color:'#991b1b',fontFamily:'sans-serif',lineHeight:1.5}}>
          Card error: {msg.slice(0,200)}
        </span>
      </div>,
      {width:500,height:160}
    )
  }
}
