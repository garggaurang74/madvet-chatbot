import { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   GOOGLE FONTS — loaded inline
   ═══════════════════════════════════════════════════════════ */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap');`;

/* ═══════════════════════════════════════════════════════════
   COLOR SYSTEM
   ═══════════════════════════════════════════════════════════ */
const CAT_PALETTES = {
  "Vitamin Supplement":                { h: 22,  s: 85, l: 32, name: "Crimson Amber"   },
  "Vitamin Supplement / Galactogogue": { h: 210, s: 80, l: 28, name: "Ocean Deep"      },
  "Antibiotic":                        { h: 218, s: 72, l: 26, name: "Steel Navy"      },
  "Anti-inflammatory / Analgesic":     { h: 338, s: 78, l: 30, name: "Garnet"          },
  "Anthelmintic / Antiparasitic":      { h: 158, s: 70, l: 26, name: "Forest"          },
  "Probiotic":                         { h: 128, s: 65, l: 28, name: "Emerald"         },
  "Dermatological":                    { h: 272, s: 60, l: 30, name: "Plum"            },
  "Ectoparasiticide":                  { h: 42,  s: 80, l: 30, name: "Harvest Gold"    },
  "Reproductive Hormone":              { h: 295, s: 58, l: 28, name: "Violet"          },
  "Antihistamine":                     { h: 200, s: 68, l: 26, name: "Slate"           },
  "Antidiarrheal":                     { h: 168, s: 65, l: 26, name: "Teal"            },
  "Udder Care / Herbal Antimicrobial": { h: 88,  s: 62, l: 28, name: "Sage"            },
  "Digestive / Antiflatulent":         { h: 33,  s: 78, l: 30, name: "Copper"          },
};

function getColors(id: number, category: string) {
  const base = CAT_PALETTES[category] ?? { h: 220, s: 70, l: 28 };
  const shift = ((id * 37 + 13) % 41) - 20;
  const h = (base.h + shift + 360) % 360;
  const s = base.s;
  const l = base.l;
  return {
    h, s, l,
    primary:   `hsl(${h},${s}%,${l}%)`,
    bright:    `hsl(${h},${s}%,${l+14}%)`,
    dark:      `hsl(${h},${s}%,${l-10}%)`,
    darkest:   `hsl(${h},${s}%,${l-18}%)`,
    pale:      `hsl(${h},${s-20}%,95%)`,
    mid:       `hsl(${h},${s}%,${l+7}%)`,
    gold:      `hsl(${(h+35)%360},90%,52%)`,
    glow:      `hsla(${h},${s}%,${l+10}%,0.35)`,
  };
}

function getTemplate(category) {
  if (["Vitamin Supplement","Vitamin Supplement / Galactogogue"].includes(category)) return "vitality";
  if (["Probiotic","Digestive / Antiflatulent","Antidiarrheal"].includes(category)) return "digest";
  if (["Reproductive Hormone","Udder Care / Herbal Antimicrobial"].includes(category)) return "herbal";
  if (["Dermatological","Ectoparasiticide","Antihistamine"].includes(category)) return "shield";
  return "clinical";
}

/* ═══════════════════════════════════════════════════════════
   SHARED: Madvet Logo SVG
   ═══════════════════════════════════════════════════════════ */
function MadvetLogo({ light = false, size = 1 }) {
  const txt = light ? "#fff" : "#1a2f8a";
  const sub = light ? "rgba(255,255,255,0.72)" : "#666";
  return (
    <div style={{ display:"flex", alignItems:"center", gap: 7*size, flexShrink:0 }}>
      <svg width={42*size} height={46*size} viewBox="0 0 42 46" fill="none">
        <path d="M21 8C21 2 15 0 10 4C4 8 4 18 10 24L21 36Z" fill={light?"rgba(255,255,255,0.9)":"#111"}/>
        <path d="M21 8C21 2 27 0 32 4C38 8 38 18 32 24L21 36Z" fill={light?"rgba(255,255,255,0.55)":"#1a2f8a"}/>
        <circle cx="14" cy="9"  r="3" fill={light?"#FFE000":"white"}/>
        <circle cx="28" cy="9"  r="3" fill={light?"#FFE000":"white"}/>
        <circle cx="9"  cy="17" r="3" fill={light?"#FFE000":"white"}/>
        <circle cx="33" cy="17" r="3" fill={light?"#FFE000":"white"}/>
        <ellipse cx="21" cy="21" rx="6.5" ry="8" fill={light?"#FFE000":"white"}/>
        <rect x="19" y="17" width="4" height="9"  rx="1" fill="#d42"/>
        <rect x="17" y="19" width="8" height="4.5" rx="1" fill="#d42"/>
        <text x="21" y="43" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" fill={light?"rgba(255,255,255,0.7)":"#1a2f8a"} fontWeight="700">mma</text>
      </svg>
      <div>
        <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:20*size, fontWeight:700, color:txt, letterSpacing:2, lineHeight:1 }}>MADVET</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9*size, color:sub, letterSpacing:1.5, marginTop:1 }}>ANIMAL HEALTH CARE</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:7.5*size, color:sub, letterSpacing:0.8, opacity:0.8 }}>AN I.S.O. 9001:2013 COMPANY</div>
      </div>
    </div>
  );
}

/* ── ALL PRODUCTS LINK STRIP ───────────────────────────────── */
function AllProductsTag({ c }) {
  return (
    <div style={{
      margin: "8px 0 0",
      background: `linear-gradient(90deg, ${c.darkest}, ${c.primary})`,
      padding: "9px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      {/* Left: link */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{
          width:30, height:30, borderRadius:"50%",
          background:"rgba(255,255,255,0.15)",
          border:"1.5px solid rgba(255,255,255,0.35)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14,
        }}>🔗</div>
        <div>
          <div style={{ fontSize:8, color:"rgba(255,255,255,0.55)", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:2, textTransform:"uppercase" }}>View all products · सभी उत्पाद</div>
          <div style={{ fontSize:14, color:"#fff", fontWeight:700, fontFamily:"'Oswald',sans-serif", letterSpacing:1, lineHeight:1.2 }}>madvet.in/products</div>
        </div>
      </div>
      {/* Right: ai link */}
      <div style={{
        background:"rgba(255,255,255,0.12)",
        border:"1px solid rgba(255,255,255,0.25)",
        borderRadius:6, padding:"4px 12px", textAlign:"center",
      }}>
        <div style={{ fontSize:8, color:"rgba(255,255,255,0.55)", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 }}>AI ASSISTANT</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.9)", fontFamily:"'Oswald',sans-serif", letterSpacing:0.5 }}>ai.madvet.in</div>
      </div>
    </div>
  );
}

/* ── PREMIUM FOOTER ────────────────────────────────────────── */
function Footer({ c }) {
  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      {/* Top accent line — product color */}
      <div style={{ height:4, background:`linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest})` }} />

      {/* Main footer — yellow, exactly like the physical flyers */}
      <div style={{
        background: "linear-gradient(135deg, #FFE600 0%, #FFD000 50%, #FFE600 100%)",
        padding: "14px 20px",
        position: "relative", overflow:"hidden",
      }}>
        {/* Subtle warm shimmer overlay */}
        <div style={{ position:"absolute", top:-30, right:-30, width:130, height:130,
          borderRadius:"50%", background:"rgba(255,255,255,0.18)" }} />
        <div style={{ position:"absolute", bottom:-20, left:-20, width:80, height:80,
          borderRadius:"50%", background:"rgba(255,255,255,0.10)" }} />

        <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {/* LEFT: Madvet logo — same as physical flyer */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <svg width="44" height="48" viewBox="0 0 42 46" fill="none">
              <path d="M21 8C21 2 15 0 10 4C4 8 4 18 10 24L21 36Z" fill="#111"/>
              <path d="M21 8C21 2 27 0 32 4C38 8 38 18 32 24L21 36Z" fill="#1a2f8a"/>
              <circle cx="14" cy="9"  r="3" fill="white"/>
              <circle cx="28" cy="9"  r="3" fill="white"/>
              <circle cx="9"  cy="17" r="3" fill="white"/>
              <circle cx="33" cy="17" r="3" fill="white"/>
              <ellipse cx="21" cy="21" rx="6.5" ry="8" fill="white"/>
              <rect x="19" y="17" width="4" height="9"  rx="1" fill="#d42"/>
              <rect x="17" y="19" width="8" height="4.5" rx="1" fill="#d42"/>
              <text x="21" y="43" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" fill="#1a2f8a" fontWeight="700">mma</text>
            </svg>
            <div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:26, fontWeight:700,
                color:"#1a2f8a", letterSpacing:3, lineHeight:1 }}>MADVET</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9.5,
                color:"#1a2f8a", letterSpacing:1.5, marginTop:1, fontWeight:600 }}>ANIMAL HEALTH CARE</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8,
                color:"#555", letterSpacing:0.8, marginTop:1 }}>Ghaziabad (U.P.)</div>
            </div>
          </div>

          {/* RIGHT: Contact info — dark text on yellow */}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:8.5,
              color:"#333", lineHeight:1.75, letterSpacing:0.3 }}>
              <div style={{ fontWeight:700, color:"#111" }}>AN I.S.O. 9001:2013 COMPANY</div>
              <div>Email: madvet.animal@gmail.com</div>
              <div>web: www.madvet.in | support@madvet.in</div>
              <div style={{ fontWeight:800, color:"#1a2f8a", fontSize:10, marginTop:1 }}>
                Toll Free No. 9935257750, 8400347331
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function splitBenefits(txt="") {
  return txt.split(/[•\n,;|]+/).map(s=>s.trim()).filter(s=>s.length>3).slice(0,8);
}

function ImgBox({ url, w, h, c, emoji="🧴", round=false }) {
  const [err,setErr] = useState(false);
  const style = {
    width:w, height:h, flexShrink:0, overflow:"hidden",
    borderRadius: round ? "50%" : 12,
    background:`linear-gradient(145deg,${c.pale},white)`,
    border:`2px solid ${c.primary}30`,
    display:"flex", alignItems:"center", justifyContent:"center",
    boxShadow:`0 6px 24px ${c.glow}, 0 2px 8px rgba(0,0,0,0.12)`,
  };
  if (url && !err) return (
    <div style={style}>
      <img src={url} onError={()=>setErr(true)}
        style={{ width:"100%", height:"100%", objectFit:round?"cover":"contain",
          filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }} />
    </div>
  );
  return (
    <div style={style}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize: w*0.32 }}>{emoji}</div>
        <div style={{ fontSize:8, color:c.primary, opacity:0.5, marginTop:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:0.5 }}>IMAGE COMING SOON</div>
      </div>
    </div>
  );
}

function Species({ sp="", c }) {
  const M={Cattle:"🐄",Buffalo:"🐃",Sheep:"🐑",Goat:"🐐",Dog:"🐕",Cat:"🐈",Horse:"🐴",Poultry:"🐓",Calf:"🐮"};
  const arr = sp.split(/[,/]/).map(s=>s.trim()).filter(Boolean).slice(0,5);
  return (
    <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"center" }}>
      {arr.map(s=>(
        <div key={s} title={s} style={{
          width:28,height:28,borderRadius:"50%",
          background:`radial-gradient(circle,${c.pale},white)`,
          border:`1.5px solid ${c.primary}50`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:15, boxShadow:`0 2px 6px ${c.glow}`,
        }}>{M[s]||"🐾"}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 1 — VITALITY
   For: Vitamin Supplements
   Aesthetic: BOLD maximalist poster — thick diagonal color
   band, massive product name stamped across it, benefit slabs
   with strong contrast and real depth
   ═══════════════════════════════════════════════════════════ */
function TemplateVitality({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi||p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  const nameFontSize = p.name.length>12 ? 44 : p.name.length>9 ? 54 : 66;

  return (
    <div style={{ width:480, background:"#fff", overflow:"hidden", fontFamily:"'Barlow Condensed',sans-serif",
      boxShadow:`0 20px 70px rgba(0,0,0,0.28), 0 4px 20px rgba(0,0,0,0.1)` }}>

      {/* ── TOP HERO BAND ── */}
      <div style={{ position:"relative", overflow:"hidden",
        background:`linear-gradient(135deg, ${c.darkest} 0%, ${c.primary} 55%, ${c.bright} 100%)`,
        padding:"18px 20px 60px",
      }}>
        {/* Grain texture overlay */}
        <div style={{ position:"absolute", inset:0, opacity:0.06,
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize:"180px" }} />
        {/* Big decorative circle */}
        <div style={{ position:"absolute", right:-60, top:-60, width:220, height:220,
          borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }} />
        <div style={{ position:"absolute", right:20, bottom:-30, width:120, height:120,
          borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />

        <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <MadvetLogo light size={0.9} />
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", letterSpacing:1 }}>{p.packaging}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", letterSpacing:0.5 }}>{p.formulation}</div>
          </div>
        </div>

        {/* MASSIVE product name */}
        <div style={{ marginTop:10, position:"relative" }}>
          <div style={{
            fontFamily:"'Oswald',sans-serif", fontWeight:700,
            fontSize: nameFontSize,
            color:"#fff",
            letterSpacing:3, lineHeight:0.95,
            textShadow:`0 4px 20px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)`,
          }}>{p.name}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:5, letterSpacing:0.5, fontWeight:400 }}>{p.salt}</div>
        </div>
      </div>

      {/* ── DIAGONAL CUT + TAGLINE ── */}
      <div style={{ position:"relative", marginTop:-28, zIndex:2 }}>
        <div style={{
          background:"#FFE000", margin:"0 24px",
          borderRadius:6, padding:"7px 16px",
          boxShadow:`0 4px 16px rgba(0,0,0,0.18)`,
          display:"inline-block",
        }}>
          <span style={{
            fontFamily:"'Noto Sans Devanagari',sans-serif", fontWeight:800,
            fontSize:14, color:c.darkest,
          }}>{p.tagline_hi || hi[0]}</span>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ display:"flex", padding:"16px 16px 6px", gap:14 }}>
        {/* LEFT: benefit slabs */}
        <div style={{ flex:1 }}>
          {hi.slice(0,7).map((b,i) => {
            const big = i===0||i===1||i===3||i===5;
            return (
              <div key={i} style={{
                position:"relative", marginBottom: big?8:5,
                display:"flex",
              }}>
                <div style={{
                  flex:1,
                  background: big
                    ? `linear-gradient(90deg, ${c.darkest}, ${c.primary})`
                    : `linear-gradient(90deg, ${c.primary}, ${c.mid})`,
                  borderRadius:"6px 0 0 6px",
                  padding: big?"9px 40px 9px 14px":"6px 36px 6px 12px",
                  boxShadow: big ? `2px 3px 14px ${c.glow}` : "none",
                }}>
                  {/* Arrow tip */}
                  <div style={{ position:"absolute", right:-15, top:0, bottom:0, width:0,
                    borderTop:`${big?22:17}px solid transparent`,
                    borderBottom:`${big?22:17}px solid transparent`,
                    borderLeft:`15px solid ${big?c.primary:c.mid}`,
                  }}/>
                  <p style={{ margin:0, fontSize:big?13.5:12,
                    fontFamily:"'Noto Sans Devanagari',sans-serif",
                    color:"#fff", fontWeight:big?800:600, lineHeight:1.3 }}>{b}</p>
                  {en[i] && <p style={{ margin:"2px 0 0", fontSize:9, color:"rgba(255,255,255,0.58)", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:0.3 }}>{en[i]}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: image + species */}
        <div style={{ width:118, display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
          <ImgBox url={p.image_url} w={114} h={160} c={c} emoji={p.formulation==="Bolus"?"💊":"🧴"} />
          <Species sp={p.species} c={c} />
          {/* Category pill */}
          <div style={{ background:c.pale, border:`1px solid ${c.primary}33`, borderRadius:20,
            padding:"3px 10px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:c.primary, fontWeight:700, fontFamily:"'Oswald',sans-serif", letterSpacing:1 }}>
              {p.category?.split("/")[0]?.trim()}
            </div>
          </div>
        </div>
      </div>

      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 2 — DIGEST
   For: Probiotics / Digestive
   Aesthetic: Organic warmth — white card with big circular
   image dominating top-right, soft green tones, friendly
   bullet-point layout, rounded language
   ═══════════════════════════════════════════════════════════ */
function TemplateDigest({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi||p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);

  return (
    <div style={{ width:480, background:"#fff", overflow:"hidden", fontFamily:"'Barlow Condensed',sans-serif",
      boxShadow:`0 20px 70px rgba(0,0,0,0.26)` }}>

      {/* ── HEADER with circle image overlapping ── */}
      <div style={{ position:"relative", padding:"16px 20px 0", background:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, paddingRight:140 }}>
            {/* Red Hindi tagline above name */}
            <div style={{ fontSize:13, fontWeight:700, color:"#c8220a",
              fontFamily:"'Noto Sans Devanagari',sans-serif", lineHeight:1.3, marginBottom:6 }}>
              {p.tagline_hi || p.indication || "असरदार और तुरंत राहत"}
            </div>
            {/* Name with 3D effect */}
            <div style={{
              fontFamily:"'Oswald',sans-serif", fontWeight:700,
              fontSize: p.name.length>12?36:p.name.length>8?46:56,
              color:c.primary,
              textShadow:`3px 3px 0 ${c.dark}55, 5px 5px 0 rgba(0,0,0,0.08)`,
              letterSpacing:2, lineHeight:1,
            }}>{p.name}</div>
            {/* Formulation badge */}
            <div style={{ display:"inline-block", marginTop:6, background:c.pale,
              border:`1.5px solid ${c.primary}40`, borderRadius:4, padding:"3px 10px" }}>
              <span style={{ fontSize:11, color:c.primary, fontWeight:700, letterSpacing:2 }}>{p.formulation?.toUpperCase()}</span>
            </div>
            {/* Tagline banner */}
            <div style={{ marginTop:8, background:c.primary, borderRadius:4, padding:"6px 14px", display:"inline-block" }}>
              <span style={{ fontSize:13, color:"#fff", fontFamily:"'Noto Sans Devanagari',sans-serif", fontWeight:700 }}>{p.tagline_hi||"तुरंत असर, लंबे समय तक फायदा"}</span>
            </div>
          </div>
          {/* Circular image — floating top right */}
          <div style={{ position:"absolute", top:12, right:16 }}>
            <ImgBox url={p.image_url} w={128} h={128} c={c} emoji="💊" round />
          </div>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ height:3, background:`linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}20)`, margin:"12px 0 0" }} />

      {/* ── BENEFITS ── */}
      <div style={{ padding:"12px 20px", display:"flex", gap:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", fontSize:13, fontWeight:800, color:c.primary }}>प्रयोग एवं लक्षण :</div>
            <div style={{ flex:1, height:1.5, background:`${c.primary}30` }} />
          </div>
          {hi.slice(0,7).map((b,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8,
              padding:"6px 10px", borderRadius:6,
              background: i%2===0 ? c.pale : "transparent",
              borderLeft: `3px solid ${i%2===0?c.primary:c.bright}`,
            }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:c.primary,flexShrink:0,marginTop:5 }}/>
              <div>
                <p style={{ margin:0, fontSize:13, fontFamily:"'Noto Sans Devanagari',sans-serif",
                  color:"#1a1a1a", fontWeight:600, lineHeight:1.35 }}>{b}</p>
                {en[i]&&<p style={{ margin:"1px 0 0", fontSize:9.5, color:"#888", fontFamily:"'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
              </div>
            </div>
          ))}
        </div>
        {/* Right: product name card + species — no duplicate image */}
        <div style={{ width:108, flexShrink:0, display:"flex", flexDirection:"column", gap:8, alignItems:"center", paddingTop:4 }}>
          <div style={{ background:`linear-gradient(160deg,${c.darkest},${c.primary})`,
            borderRadius:10, padding:"14px 8px", textAlign:"center", width:"100%",
            boxShadow:`0 4px 16px ${c.glow}` }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1.5, marginBottom:4 }}>{p.formulation?.toUpperCase()}</div>
            <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:15, fontWeight:700, color:"#fff", lineHeight:1.15, letterSpacing:1 }}>{p.name}</div>
            <div style={{ fontSize:8.5, color:"rgba(255,255,255,0.65)", marginTop:4 }}>{p.packaging}</div>
          </div>
          <div style={{ background:c.pale, borderRadius:8, padding:"8px", textAlign:"center",
            border:`1px solid ${c.primary}25`, width:"100%" }}>
            <div style={{ fontSize:8.5, color:c.primary, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1, marginBottom:5 }}>SPECIES</div>
            <Species sp={p.species} c={c} />
          </div>
        </div>
      </div>

      {/* Accent stripe */}
      <div style={{ height:5, background:`linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}60)`, marginBottom:6 }} />

      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 3 — HERBAL
   For: Reproductive / Udder Care
   Aesthetic: Magazine editorial — asymmetric two-column,
   large image on left bleeding to edge, rich warm tones,
   serif display font for name, elegant arrow markers
   ═══════════════════════════════════════════════════════════ */
function TemplateHerbal({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi||p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  const c2h = (c.h+40)%360;
  const c2 = `hsl(${c2h},75%,36%)`;

  return (
    <div style={{ width:480, background:"#fff", overflow:"hidden", fontFamily:"'Barlow Condensed',sans-serif",
      boxShadow:`0 20px 70px rgba(0,0,0,0.26)` }}>

      {/* ── EDITORIAL HEADER ── */}
      <div style={{ background:`linear-gradient(160deg, ${c.darkest} 0%, ${c.primary} 60%, ${c2} 100%)`,
        padding:"16px 20px 18px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.05,
          backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize:"60px" }} />
        <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <MadvetLogo light size={0.88} />
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", letterSpacing:1, fontStyle:"italic" }}>{p.category}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)" }}>{p.packaging}</div>
          </div>
        </div>

        <div style={{ marginTop:10, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div style={{ flex:1 }}>
            {/* Split-color name */}
            <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700,
              fontSize:p.name.length>14?32:p.name.length>10?42:50,
              lineHeight:1, letterSpacing:2, color:"#fff",
              textShadow:"0 3px 14px rgba(0,0,0,0.35)",
            }}>
              {p.name.split(/[-\s]/).map((w,i)=>(
                <span key={i} style={{ color:i%2===0?"#fff":"#FFE000", marginRight:4 }}>{w}{p.name.includes("-")&&i<p.name.split(/[-\s]/).length-1?"-":""}</span>
              ))}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.78)", marginTop:5, letterSpacing:0.5 }}>{p.salt?.split(",")[0]?.trim()}</div>
          </div>
          <ImgBox url={p.image_url} w={100} h={100} c={c} emoji="🌿" />
        </div>

        {/* Tagline ribbon at bottom of header */}
        <div style={{ marginTop:10,
          background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)",
          borderRadius:6, padding:"6px 14px",
          border:"1px solid rgba(255,255,255,0.25)",
          display:"inline-flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:16, lineHeight:1 }}>🌱</span>
          <span style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", fontSize:13, color:"#FFE000", fontWeight:700 }}>{p.tagline_hi||hi[0]}</span>
        </div>
      </div>

      {/* ── BENEFITS with elegant markers ── */}
      <div style={{ padding:"14px 18px 8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:4, height:16, background:c.primary, borderRadius:2 }} />
          <span style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", fontSize:13, fontWeight:800, color:c.primary }}>प्रमुख लाभ एवं उपयोग :</span>
          <div style={{ flex:1, height:1, background:`${c.primary}20` }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          {hi.slice(0,6).map((b,i)=>(
            <div key={i} style={{ display:"flex", gap:8, padding:"7px 10px",
              background:i<2?c.pale:"#fafafa",
              borderRadius:7, border:`1px solid ${i<2?c.primary+"33":"#eeeeee"}`,
              alignItems:"flex-start",
            }}>
              <span style={{ color:c.primary, fontSize:15, fontWeight:900, flexShrink:0, lineHeight:1.2 }}>►</span>
              <div>
                <p style={{ margin:0, fontSize:11.5, fontFamily:"'Noto Sans Devanagari',sans-serif",
                  color:"#222", lineHeight:1.35, fontWeight:500 }}>{b}</p>
                {en[i]&&<p style={{ margin:"1px 0 0", fontSize:8.5, color:"#999", fontFamily:"'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"0 18px 6px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Species sp={p.species} c={c} />
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9, color:"#aaa", letterSpacing:0.5 }}>FORMULATION</div>
          <div style={{ fontSize:12, fontWeight:700, color:c.primary }}>{p.formulation}</div>
        </div>
      </div>

      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 4 — SHIELD
   For: Dermatological / Ectoparasiticide
   Aesthetic: Bold graphic — dark full-bleed header with name
   reversed out in white, colored "shield" benefit badges,
   very punchy and protective feeling
   ═══════════════════════════════════════════════════════════ */
function TemplateShield({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi||p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);

  return (
    <div style={{ width:480, background:"#fff", overflow:"hidden", fontFamily:"'Barlow Condensed',sans-serif",
      boxShadow:`0 20px 70px rgba(0,0,0,0.28)` }}>

      {/* ── FULL-BLEED DARK HEADER ── */}
      <div style={{ background:`linear-gradient(125deg,${c.darkest} 0%,${c.primary} 100%)`,
        padding:"18px 20px 22px", position:"relative", overflow:"hidden" }}>
        {/* diagonal stripe decoration */}
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"45%",
          background:`linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.07) 100%)` }} />
        <div style={{ position:"absolute", bottom:-30, right:-30, width:150, height:150,
          borderRadius:"50%", border:"2px solid rgba(255,255,255,0.12)" }} />
        <div style={{ position:"absolute", bottom:-10, right:-10, width:80, height:80,
          borderRadius:"50%", border:"2px solid rgba(255,255,255,0.08)" }} />

        <div style={{ position:"relative" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <MadvetLogo light size={0.88} />
            {/* Formulation badge */}
            <div style={{ background:"rgba(255,255,255,0.18)", borderRadius:5, padding:"4px 12px",
              border:"1px solid rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize:11, color:"#FFE000", fontWeight:700, letterSpacing:2 }}>{p.formulation?.toUpperCase()}</div>
              <div style={{ fontSize:8.5, color:"rgba(255,255,255,0.65)", textAlign:"center" }}>{p.packaging}</div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"flex-end", gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{
                fontFamily:"'Oswald',sans-serif", fontWeight:700,
                fontSize:p.name.length>14?34:p.name.length>10?44:54,
                color:"#fff", letterSpacing:2, lineHeight:1,
                textShadow:"0 3px 20px rgba(0,0,0,0.4)",
              }}>{p.name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.72)", marginTop:6, letterSpacing:0.5 }}>{p.salt}</div>
              <div style={{ marginTop:10, background:"#FFE000", borderRadius:5, padding:"5px 14px", display:"inline-block" }}>
                <span style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", fontSize:13, fontWeight:800, color:c.darkest }}>{p.tagline_hi||hi[0]}</span>
              </div>
            </div>
            <ImgBox url={p.image_url} w={108} h={108} c={c} emoji={p.formulation==="Spray"?"🫧":"🧼"} />
          </div>
        </div>
      </div>

      {/* ── CHECK-BADGE BENEFITS ── */}
      <div style={{ padding:"14px 18px 6px" }}>
        <div style={{ fontSize:13, fontWeight:800, color:c.primary,
          fontFamily:"'Noto Sans Devanagari',sans-serif", marginBottom:10 }}>लाभ एवं उपयोग :</div>
        {hi.slice(0,5).map((b,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10,
            marginBottom:7, padding:"8px 12px", borderRadius:7,
            background:`linear-gradient(90deg,${c.pale},white)`,
            border:`1px solid ${c.primary}25`,
            borderLeft:`4px solid ${i===0?c.primary:c.bright}`,
            boxShadow:i===0?`2px 2px 12px ${c.glow}`:"none",
          }}>
            <div style={{ width:22,height:22,borderRadius:"50%",
              background:c.primary, display:"flex",alignItems:"center",
              justifyContent:"center", flexShrink:0,
              boxShadow:`0 2px 8px ${c.glow}` }}>
              <span style={{ fontSize:13,color:"#fff",fontWeight:900 }}>✓</span>
            </div>
            <div>
              <p style={{ margin:0, fontSize:13, fontFamily:"'Noto Sans Devanagari',sans-serif",
                color:"#111", fontWeight:600, lineHeight:1.35 }}>{b}</p>
              {en[i]&&<p style={{ margin:"1px 0 0", fontSize:9.5, color:"#888", fontFamily:"'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:"4px 18px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Species sp={p.species} c={c} />
      </div>

      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 5 — CLINICAL
   For: Antibiotics / Anti-inflammatory / Anthelmintic (40 products)
   Aesthetic: Premium pharma — dark navy header, white body,
   numbered benefits, Rx badge, injection vial imagery,
   authoritative and trustworthy
   ═══════════════════════════════════════════════════════════ */
function TemplateClinical({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi||p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  const isInj = p.formulation==="Injection";

  return (
    <div style={{ width:480, background:"#fff", overflow:"hidden", fontFamily:"'Barlow Condensed',sans-serif",
      boxShadow:`0 20px 70px rgba(0,0,0,0.28)` }}>

      {/* ── DARK CLINICAL HEADER ── */}
      <div style={{ background:`linear-gradient(135deg,${c.darkest} 0%,${c.dark} 50%,${c.primary} 100%)`,
        padding:"16px 20px 20px", position:"relative", overflow:"hidden" }}>
        {/* Subtle grid pattern */}
        <div style={{ position:"absolute", inset:0, opacity:0.04,
          backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px)` }} />
        <div style={{ position:"relative" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <MadvetLogo light size={0.88} />
            <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>

              <div style={{ background:c.primary, borderRadius:4, padding:"3px 10px" }}>
                <span style={{ fontSize:10, color:"#fff", fontWeight:700, letterSpacing:1 }}>{p.category?.split("/")[0]?.trim()}</span>
              </div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"flex-end", gap:14 }}>
            <div style={{ flex:1 }}>
              <div style={{
                fontFamily:"'Oswald',sans-serif", fontWeight:700,
                fontSize:p.name.length>14?32:p.name.length>10?42:52,
                color:"#fff", letterSpacing:1.5, lineHeight:1,
                textShadow:"0 3px 16px rgba(0,0,0,0.35)",
              }}>{p.name}</div>
              <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.72)", marginTop:5, letterSpacing:0.3, fontStyle:"italic" }}>{p.salt}</div>
              <div style={{ display:"flex", gap:8, marginTop:8, alignItems:"center" }}>
                <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:4, padding:"3px 10px",
                  border:"1px solid rgba(255,255,255,0.2)" }}>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.85)", letterSpacing:1 }}>{p.formulation} · {p.packaging}</span>
                </div>
              </div>
            </div>
            <ImgBox url={p.image_url} w={104} h={110} c={c} emoji={isInj?"💉":"💊"} />
          </div>
        </div>
      </div>

      {/* ── ACCENT BAND ── */}
      <div style={{ height:4, background:`linear-gradient(90deg,${c.darkest},${c.bright},${c.gold})` }} />

      {/* ── NUMBERED BENEFITS ── */}
      <div style={{ padding:"14px 18px 6px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ fontFamily:"'Noto Sans Devanagari',sans-serif", fontSize:13, fontWeight:800, color:c.primary }}>प्रमुख लाभ</div>
          <div style={{ flex:1, height:2, background:`linear-gradient(90deg,${c.primary}50,transparent)` }} />
          <div style={{ fontSize:9.5, color:"#aaa", fontStyle:"italic" }}>Key Benefits</div>
        </div>
        {hi.slice(0,5).map((b,i)=>(
          <div key={i} style={{ display:"flex", gap:10, marginBottom:7,
            padding:"8px 12px", borderRadius:8,
            background:i===0?c.pale:i===1?`${c.pale}88`:"#fafafa",
            border:`1px solid ${i<2?c.primary+"30":"#eeeeee"}`,
            boxShadow:i===0?`2px 3px 12px ${c.glow}`:"none",
          }}>
            <div style={{ width:24,height:24,borderRadius:"50%",
              background:i===0?c.primary:i===1?c.mid:c.bright,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,color:"#fff",fontWeight:800,flexShrink:0,
              boxShadow:`0 2px 6px ${c.glow}` }}>{i+1}</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:13, fontFamily:"'Noto Sans Devanagari',sans-serif",
                color:"#111", lineHeight:1.35, fontWeight:600 }}>{b}</p>
              {en[i]&&<p style={{ margin:"1px 0 0", fontSize:9.5, color:"#888", fontFamily:"'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:"4px 18px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Species sp={p.species} c={c} />
        {p.dosage && (
          <div style={{ maxWidth:160, textAlign:"right" }}>
            <div style={{ fontSize:8.5, color:"#aaa", letterSpacing:0.5, fontFamily:"'Barlow Condensed',sans-serif" }}>DOSAGE</div>
            <div style={{ fontSize:9.5, color:"#444", lineHeight:1.4 }}>{p.dosage.slice(0,80)}</div>
          </div>
        )}
      </div>

      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE MAP
   ═══════════════════════════════════════════════════════════ */
const TEMPLATES = { vitality:TemplateVitality, digest:TemplateDigest, herbal:TemplateHerbal, shield:TemplateShield, clinical:TemplateClinical };
const TEMPLATE_LABELS = { vitality:"Vitamin / Tonic", digest:"Probiotic / Digestive", herbal:"Herbal / Reproductive", shield:"Topical / Skin", clinical:"Clinical / Rx" };

/* ═══════════════════════════════════════════════════════════
   SAMPLE PRODUCTS (one per template)
   ═══════════════════════════════════════════════════════════ */
const PRODUCTS = [
  { id:78, name:"MADCOMIN", packaging:"Vet 200ml, 500ml", formulation:"Liquid",
    salt:"Mecobalamin, Vitamins & Mineral Syrup",
    category:"Vitamin Supplement", species:"Cattle, Buffalo, Horse, Sheep, Goat",
    tagline_hi:"जानवरों में कमज़ोरी दूर करता है।",
    usp_benefits_hi:"कीटोसिस को रोकने में सहायक।,दुधारू पशुओ में ऊर्जा का पूर्ण स्रोत।,क्षतिग्रस्त कोशिकाओ की पुनः वृद्धि में सहायक।,नरवाइन डिसआर्डर में अधिक उपयोगी।,जानवरों में कमज़ोरी दूर करता है।,जनवर की सुस्ती व खून कमी दूर करता है।",
    usp_benefits:"Prevents ketosis,Complete energy source,Nerve regeneration,Corrects weakness,Boosts immunity,Treats blood deficiency",
    image_url:null, dosage:"Cattle & Buffalo: 50-100ml | Sheep & Goat: 20ml daily" },

  { id:85, name:"BHUK OK", packaging:"10 Bolus Strip", formulation:"Bolus",
    salt:"Probiotics, Enzymes, Amino Acids & Nutritional Supplement",
    category:"Probiotic", species:"Cattle, Buffalo, Sheep, Goat",
    tagline_hi:"भूख को खोले तुरंत, पाचक एवं शक्तिवर्धक",
    usp_benefits_hi:"भूख न लगना,कसाव / बंधा लगना,एंटीबायोटिक के बाद रूमेन सुधारे,रूमेन की एसिडिटी बढ़ना ठीक करे,लीवर में फैट जमा होने से बचाए,कमज़ोर पशुओं की ग्रोथ में सहायक",
    usp_benefits:"Loss of appetite,Constipation relief,Rumen restoration,Rumen acidosis correction,Liver fat prevention,Weak animal growth",
    image_url:null, dosage:"Large animals: 2 bolus twice daily" },

  { id:62, name:"UTRO OK", packaging:"1 Litre", formulation:"Liquid",
    salt:"Herbal Uterotonic Tonic for Post-Calving Care",
    category:"Reproductive Hormone", species:"Cattle, Buffalo",
    tagline_hi:"प्रसव के बाद गर्भाशय की सफाई",
    usp_benefits_hi:"गर्भाशय की सफाई करता है,जेर न गिरने पर तुरंत असर,बार-बार गाभिन न होने की समस्या,हीट साइकल नियमित करे,प्रसव के बाद जल्दी रिकवरी,दूध उत्पादन फिर से बढ़ाता है",
    usp_benefits:"Uterine cleansing,Retained placenta removal,Repeat breeding correction,Heat cycle regularisation,Post-calving recovery,Restores milk production",
    image_url:null, dosage:"100ml twice daily for 5 days" },

  { id:3, name:"SKIN TOP", packaging:"200ml Spray", formulation:"Spray",
    salt:"Herbal Antiseptic & Wound Healing Spray",
    category:"Dermatological", species:"Cattle, Buffalo, Dog, Cat",
    tagline_hi:"त्वचा रोगों का असरदार उपचार",
    usp_benefits_hi:"घाव भरने में असरदार,एंटीसेप्टिक सुरक्षा,फंगल इन्फेक्शन से बचाए,त्वचा की मरम्मत करे,मक्खियों को दूर रखे",
    usp_benefits:"Rapid wound healing,Antiseptic protection,Anti-fungal action,Skin repair & regeneration,Fly repellent effect",
    image_url:null, dosage:"Spray on affected area 2-3 times daily" },

  { id:9, name:"X-FUR-ONE Inj", packaging:"30ml Injection", formulation:"Injection",
    salt:"Cefuroxime Sodium 1.5g — Third Generation Cephalosporin",
    category:"Antibiotic", species:"Cattle, Buffalo, Sheep, Goat, Dog",
    tagline_hi:"असरदार एंटीबायोटिक इंजेक्शन",
    usp_benefits_hi:"ब्रॉड स्पेक्ट्रम एंटीबायोटिक,तेज़ बैक्टीरियल एक्शन,सांस के रोगों में असरदार,थनैला रोग में उपयोगी,ऑपरेशन के बाद संक्रमण से बचाव",
    usp_benefits:"Broad spectrum antibiotic coverage,Rapid bactericidal action,Effective in respiratory infections,Treats mastitis effectively,Post-surgical infection prophylaxis",
    image_url:null, dosage:"10-20mg/kg body weight, once daily IM for 3-5 days" },
];

/* ═══════════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [sel, setSel] = useState(0);
  const p = PRODUCTS[sel];
  const tmpl = getTemplate(p.category);
  const c = useMemo(()=>getColors(p.id,p.category),[p.id,p.category]);
  const Card = TEMPLATES[tmpl];

  return (
    <div style={{ minHeight:"100vh",
      background:"linear-gradient(145deg,#1a1e2a 0%,#232838 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",
      padding:"28px 16px", gap:20,
    }}>
      <style>{FONTS}{`
        *{box-sizing:border-box;}
        button{transition:all 0.15s ease;cursor:pointer;}
        button:hover{transform:translateY(-2px);}
      `}</style>

      {/* Header */}
      <div style={{ textAlign:"center" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:4 }}>
          <MadvetLogo light size={1} />
        </div>
        <p style={{ color:"rgba(255,255,255,0.45)", fontSize:11, margin:"6px 0 0",
          fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 }}>
          5 TEMPLATES · 91 PRODUCTS · UNIQUE COLOR PER PRODUCT
        </p>
      </div>

      {/* Selectors */}
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center" }}>
        {PRODUCTS.map((prod,i)=>{
          const col = getColors(prod.id,prod.category);
          const t = getTemplate(prod.category);
          const active = sel===i;
          return (
            <button key={prod.id} onClick={()=>setSel(i)} style={{
              padding:"8px 16px", borderRadius:10,
              border:`2px solid ${active?col.bright:"rgba(255,255,255,0.15)"}`,
              background:active?`${col.darkest}dd`:"rgba(255,255,255,0.07)",
              color:active?"#fff":"rgba(255,255,255,0.55)",
              fontFamily:"'Barlow Condensed',sans-serif",
              letterSpacing:1,
            }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{prod.name}</div>
              <div style={{ fontSize:9, opacity:0.7, marginTop:1 }}>{TEMPLATE_LABELS[t]}</div>
            </button>
          );
        })}
      </div>

      {/* Template label */}
      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
        <div style={{ background:c.primary, borderRadius:20, padding:"4px 16px",
          fontSize:11, color:"#fff", fontFamily:"'Oswald',sans-serif",
          fontWeight:600, letterSpacing:1.5 }}>
          {TEMPLATE_LABELS[tmpl].toUpperCase()}
        </div>
        <div style={{ background:`${c.primary}30`, borderRadius:20, padding:"4px 12px",
          fontSize:11, color:c.bright, fontFamily:"'Barlow Condensed',sans-serif",
          border:`1px solid ${c.bright}40`, display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:10,height:10,borderRadius:"50%",background:c.primary }} />
          Product #{p.id} · {c.s}% saturation
        </div>
      </div>

      {/* Card */}
      <div key={sel} style={{ animation:"fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both" }}>
        <Card p={p} c={c} />
      </div>

      {/* Download button */}
      <div style={{ display:"flex",gap:10 }}>
        <button style={{ padding:"12px 32px", borderRadius:10,
          background:`linear-gradient(135deg,${c.primary},${c.bright})`,
          color:"#fff", border:"none",
          fontSize:14, fontWeight:700, fontFamily:"'Oswald',sans-serif",
          letterSpacing:1.5,
          boxShadow:`0 8px 28px ${c.glow}` }}>↓ DOWNLOAD PNG</button>
        <button onClick={()=>window.open("https://madvet.in/products","_blank")} style={{
          padding:"12px 28px", borderRadius:10,
          background:"#FFE000", color:"#1a2f8a",
          border:"none", fontSize:14, fontWeight:700,
          fontFamily:"'Oswald',sans-serif", letterSpacing:1.5,
        }}>🔗 ALL PRODUCTS</button>
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px) scale(0.98);}to{opacity:1;transform:translateY(0) scale(1);}}`}</style>
    </div>
  );
}
