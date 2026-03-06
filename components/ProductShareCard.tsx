// @ts-nocheck
import { useState, useMemo, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   GOOGLE FONTS
   ═══════════════════════════════════════════════════════════ */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Noto+Sans+Devanagari:wght@400;600;700;800;900&display=swap');`;

/* ═══════════════════════════════════════════════════════════
   COLOR SYSTEM
   ═══════════════════════════════════════════════════════════ */
const CAT_PALETTES = {
  "Vitamin Supplement":                { h: 22,  s: 90, l: 30 },
  "Vitamin Supplement / Galactogogue": { h: 210, s: 85, l: 25 },
  "Antibiotic":                        { h: 218, s: 80, l: 22 },
  "Anti-inflammatory / Analgesic":     { h: 338, s: 82, l: 28 },
  "Anthelmintic / Antiparasitic":      { h: 158, s: 75, l: 24 },
  "Probiotic":                         { h: 128, s: 70, l: 26 },
  "Dermatological":                    { h: 272, s: 65, l: 28 },
  "Ectoparasiticide":                  { h: 42,  s: 85, l: 28 },
  "Reproductive Hormone":              { h: 295, s: 62, l: 26 },
  "Antihistamine":                     { h: 200, s: 72, l: 24 },
  "Antidiarrheal":                     { h: 168, s: 70, l: 24 },
  "Udder Care / Herbal Antimicrobial": { h: 88,  s: 68, l: 26 },
  "Digestive / Antiflatulent":         { h: 33,  s: 82, l: 28 },
};

function getColors(id, category) {
  const base = CAT_PALETTES[category] ?? { h: 220, s: 75, l: 26 };
  const shift = ((id * 37 + 13) % 41) - 20;
  const h = (base.h + shift + 360) % 360;
  const { s, l } = base;
  return {
    h, s, l,
    primary:  `hsl(${h},${s}%,${l}%)`,
    bright:   `hsl(${h},${s}%,${l + 18}%)`,
    dark:     `hsl(${h},${s}%,${l - 8}%)`,
    darkest:  `hsl(${h},${s}%,${l - 16}%)`,
    pale:     `hsl(${h},${Math.max(s - 30, 20)}%,95%)`,
    mid:      `hsl(${h},${s}%,${l + 9}%)`,
    gold:     `hsl(${(h + 35) % 360},90%,52%)`,
    glow:     `hsla(${h},${s}%,${l + 12}%,0.40)`,
  };
}

function splitBenefits(txt = "") {
  return txt.split(/[•\n,;|]+/).map(s => s.trim()).filter(s => s.length > 3).slice(0, 7);
}

// Get first sentence of description (the marketing hook)
function getDescExcerpt(desc = "", maxLen = 145) {
  if (!desc) return "";
  const first = desc.split(/\.\s+/)[0];
  const t = first.length <= maxLen ? first : first.slice(0, maxLen).replace(/\s\S+$/, "") + "…";
  return t.endsWith(".") ? t : t + ".";
}

// Get first 4 English indication terms (skip Hindi)
function getIndicationTags(indication = "") {
  return indication
    .split(/[,،]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 28 && /^[a-zA-Z\s\/\-]+$/.test(s))
    .slice(0, 4);
}

// Description + indication strip
function DescBar({ p, c }: { p: any; c: any }) {
  const desc = getDescExcerpt(p.description);
  const tags = getIndicationTags(p.indication);
  if (!desc && tags.length === 0) return null;
  return (
    <div style={{ margin: "0", padding: "10px 18px 8px", background: c.pale, borderBottom: `1.5px solid ${c.primary}18` }}>
      {desc && (
        <p style={{ margin: "0 0 6px", fontSize: 10.5, color: "#2a2a2a", lineHeight: 1.5, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 500, fontStyle: "italic" }}>
          {desc}
        </p>
      )}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 8.5, color: c.primary, fontWeight: 800, letterSpacing: 1, fontFamily: "'Oswald',sans-serif" }}>TREATS:</span>
          {tags.map((t, i) => (
            <span key={i} style={{ fontSize: 9, color: c.dark, background: `${c.primary}14`, border: `1px solid ${c.primary}25`, borderRadius: 20, padding: "2px 8px", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, letterSpacing: 0.3 }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════ */
function MadvetLogo({ light = false, size = 1 }) {
  const txt = light ? "#fff" : "#1a2f8a";
  const sub = light ? "rgba(255,255,255,0.70)" : "#555";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 * size, flexShrink: 0 }}>
      <svg width={40 * size} height={44 * size} viewBox="0 0 42 46" fill="none">
        <path d="M21 8C21 2 15 0 10 4C4 8 4 18 10 24L21 36Z" fill={light ? "rgba(255,255,255,0.92)" : "#111"} />
        <path d="M21 8C21 2 27 0 32 4C38 8 38 18 32 24L21 36Z" fill={light ? "rgba(255,255,255,0.52)" : "#1a2f8a"} />
        <circle cx="14" cy="9"  r="3" fill={light ? "#FFE000" : "white"} />
        <circle cx="28" cy="9"  r="3" fill={light ? "#FFE000" : "white"} />
        <circle cx="9"  cy="17" r="3" fill={light ? "#FFE000" : "white"} />
        <circle cx="33" cy="17" r="3" fill={light ? "#FFE000" : "white"} />
        <ellipse cx="21" cy="21" rx="6.5" ry="8" fill={light ? "#FFE000" : "white"} />
        <rect x="19" y="17" width="4"  height="9"   rx="1" fill="#d42" />
        <rect x="17" y="19" width="8"  height="4.5" rx="1" fill="#d42" />
        <text x="21" y="43" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" fill={light ? "rgba(255,255,255,0.65)" : "#1a2f8a"} fontWeight="700">mma</text>
      </svg>
      <div>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 20 * size, fontWeight: 700, color: txt, letterSpacing: 2.5, lineHeight: 1 }}>MADVET</div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9 * size, color: sub, letterSpacing: 1.8, marginTop: 1, fontWeight: 600 }}>ANIMAL HEALTH CARE</div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7.5 * size, color: sub, letterSpacing: 0.8, marginTop: 1, opacity: 0.75 }}>AN I.S.O. 9001:2013 COMPANY</div>
      </div>
    </div>
  );
}

function ImgBox({ url, w, h, c, emoji = "🧴", round = false }) {
  const [err, setErr] = useState(false);
  const style = {
    width: w, height: h, flexShrink: 0, overflow: "hidden",
    borderRadius: round ? "50%" : 14,
    background: `radial-gradient(circle at 30% 30%, white, ${c.pale})`,
    border: `2.5px solid ${c.primary}28`,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `0 8px 32px ${c.glow}, 0 2px 8px rgba(0,0,0,0.15)`,
  };
  if (url && !err) return (
    <div style={style}>
      <img src={url} onError={() => setErr(true)}
        style={{ width: "100%", height: "100%", objectFit: round ? "cover" : "contain", filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.22))" }} />
    </div>
  );
  return (
    <div style={style}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: w * 0.36 }}>{emoji}</div>
        <div style={{ fontSize: 7.5, color: c.primary, opacity: 0.45, marginTop: 3, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5 }}>IMAGE COMING SOON</div>
      </div>
    </div>
  );
}

function SpeciesRow({ sp = "", c }) {
  const M = { Cattle: "🐄", Buffalo: "🐃", Sheep: "🐑", Goat: "🐐", Dog: "🐕", Cat: "🐈", Horse: "🐴", Poultry: "🐓", Calf: "🐮" };
  const arr = sp.split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 6);
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {arr.map(s => (
        <div key={s} title={s} style={{
          width: 28, height: 28, borderRadius: "50%",
          background: `radial-gradient(circle, ${c.pale}, white)`,
          border: `1.5px solid ${c.primary}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, boxShadow: `0 2px 6px ${c.glow}`,
        }}>{M[s] || "🐾"}</div>
      ))}
    </div>
  );
}

function Divider({ c }) {
  return <div style={{ height: 3, background: `linear-gradient(90deg, ${c.darkest}, ${c.bright}, ${c.darkest}30)` }} />;
}

function FooterStrip({ c }) {
  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* URL strip */}
      <div style={{ background: `linear-gradient(90deg, ${c.darkest}, ${c.primary})`, padding: "9px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🔗</div>
          <div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.50)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>सभी उत्पाद · View all products</div>
            <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, fontFamily: "'Oswald',sans-serif", letterSpacing: 0.5, lineHeight: 1.2 }}>madvet.in/products</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 6, padding: "4px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>AI ASSISTANT</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.88)", fontFamily: "'Oswald',sans-serif", letterSpacing: 0.5 }}>ai.madvet.in</div>
        </div>
      </div>
      {/* Yellow footer */}
      <div style={{ background: "linear-gradient(135deg, #FFE600 0%, #FFCF00 60%, #FFE600 100%)", padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -24, right: -24, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="42" height="46" viewBox="0 0 42 46" fill="none">
            <path d="M21 8C21 2 15 0 10 4C4 8 4 18 10 24L21 36Z" fill="#111" />
            <path d="M21 8C21 2 27 0 32 4C38 8 38 18 32 24L21 36Z" fill="#1a2f8a" />
            <circle cx="14" cy="9"  r="3" fill="white" />
            <circle cx="28" cy="9"  r="3" fill="white" />
            <circle cx="9"  cy="17" r="3" fill="white" />
            <circle cx="33" cy="17" r="3" fill="white" />
            <ellipse cx="21" cy="21" rx="6.5" ry="8" fill="white" />
            <rect x="19" y="17" width="4"  height="9"   rx="1" fill="#d42" />
            <rect x="17" y="19" width="8"  height="4.5" rx="1" fill="#d42" />
            <text x="21" y="43" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" fill="#1a2f8a" fontWeight="700">mma</text>
          </svg>
          <div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 26, fontWeight: 700, color: "#1a2f8a", letterSpacing: 3, lineHeight: 1 }}>MADVET</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: "#1a2f8a", letterSpacing: 1.5, fontWeight: 700, marginTop: 1 }}>ANIMAL HEALTH CARE</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, color: "#555", marginTop: 1 }}>Ghaziabad (U.P.)</div>
          </div>
        </div>
        <div style={{ position: "relative", textAlign: "right" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8.5, color: "#111", lineHeight: 1.8, letterSpacing: 0.2 }}>
            <div style={{ fontWeight: 800, fontSize: 9 }}>I.S.O. 9001:2013 COMPANY</div>
            <div>madvet.animal@gmail.com</div>
            <div>www.madvet.in · support@madvet.in</div>
            <div style={{ fontWeight: 800, color: "#1a2f8a", fontSize: 10.5, marginTop: 1 }}>📞 9935257750 · 8400347331</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 1 — VITALITY (Vitamin Supplements)
   ═══════════════════════════════════════════════════════════ */
function TemplateVitality({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi || p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  const nameSz = p.name.length > 15 ? 38 : p.name.length > 11 ? 50 : p.name.length > 8 ? 60 : 72;

  return (
    <div style={{ width: 1200, background: "#fff", overflow: "hidden", fontFamily: "'Barlow Condensed',sans-serif", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
      {/* HERO */}
      <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(140deg, ${c.darkest} 0%, ${c.primary} 50%, ${c.mid} 100%)`, padding: "18px 20px 0" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "180px" }} />
        <div style={{ position: "absolute", right: -70, top: -70, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <div style={{ position: "absolute", left: -30, bottom: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <MadvetLogo light size={0.88} />
          <div style={{ textAlign: "right" }}>
            <div style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 5, padding: "3px 11px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.88)", fontWeight: 700, letterSpacing: 1, fontFamily: "'Oswald',sans-serif" }}>{p.packaging}</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.55)", letterSpacing: 0.8 }}>{p.formulation}</div>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 32, background: "#FFE000", borderRadius: 2 }} />
          <div style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)", lineHeight: 1.3 }}>
            {hi[0] || "जानवरों के लिए सर्वश्रेष्ठ उत्पाद"}
          </div>
        </div>
        {/* Full-width name band */}
        <div style={{ position: "relative", marginTop: 10, marginLeft: -20, marginRight: -20, background: "rgba(0,0,0,0.28)", borderTop: `3px solid ${c.bright}`, borderBottom: `3px solid ${c.bright}`, padding: "10px 20px" }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: nameSz, color: "#fff", letterSpacing: 2, lineHeight: 0.95, textShadow: `0 4px 24px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)` }}>{p.name}</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)", marginTop: 3, fontStyle: "italic", letterSpacing: 0.3 }}>{p.salt}</div>
        </div>
      </div>

      {/* Gold strip — always shows hi[1], since hi[0] is already shown in the hero band above */}
      {hi[1] && (
        <div style={{ margin: "-1px 0 0", padding: "8px 18px", background: `linear-gradient(90deg, #FFE000, #FFD000)` }}>
          <div style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontWeight: 800, fontSize: 13.5, color: c.darkest }}>
            {hi[1]}
          </div>
        </div>
      )}

      <DescBar p={p} c={c} />

      {/* Body */}
      <div style={{ display: "flex", padding: "14px 14px 8px", gap: 12 }}>
        <div style={{ flex: 1 }}>
          {hi.slice(0, 6).map((b, i) => {
            const isPrimary = i % 3 === 0;
            const bg = isPrimary ? `linear-gradient(90deg, ${c.darkest}, ${c.primary})` : i % 3 === 1 ? `linear-gradient(90deg, ${c.primary}, ${c.mid})` : `linear-gradient(90deg, ${c.mid}, ${c.bright})`;
            const pad = isPrimary ? "10px 44px 10px 13px" : "7px 38px 7px 11px";
            const arrowH = isPrimary ? 24 : 19;
            const arrowColor = isPrimary ? c.primary : i % 3 === 1 ? c.mid : c.bright;
            return (
              <div key={i} style={{ position: "relative", marginBottom: isPrimary ? 8 : 5, display: "flex" }}>
                <div style={{ flex: 1, background: bg, borderRadius: "6px 0 0 6px", padding: pad, boxShadow: isPrimary ? `2px 3px 16px ${c.glow}` : "none" }}>
                  <div style={{ position: "absolute", right: -16, top: 0, bottom: 0, width: 0, borderTop: `${arrowH}px solid transparent`, borderBottom: `${arrowH}px solid transparent`, borderLeft: `16px solid ${arrowColor}` }} />
                  <p style={{ margin: 0, fontSize: isPrimary ? 13.5 : 12, fontFamily: "'Noto Sans Devanagari',sans-serif", color: "#fff", fontWeight: isPrimary ? 800 : 600, lineHeight: 1.3 }}>{b}</p>
                  {en[i] && <p style={{ margin: "1px 0 0", fontSize: 8.5, color: "rgba(255,255,255,0.55)", fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ width: 118, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <ImgBox url={p.image_url} w={114} h={164} c={c} emoji={p.formulation === "Bolus" ? "💊" : "🧴"} />
          <SpeciesRow sp={p.species} c={c} />
          <div style={{ background: c.pale, border: `1px solid ${c.primary}30`, borderRadius: 20, padding: "3px 10px" }}>
            <div style={{ fontSize: 8.5, color: c.primary, fontWeight: 700, fontFamily: "'Oswald',sans-serif", letterSpacing: 1 }}>{p.category?.split("/")[0]?.trim()}</div>
          </div>
        </div>
      </div>

      <Divider c={c} />
      <FooterStrip c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 2 — DIGEST (Probiotics / Digestive)
   ═══════════════════════════════════════════════════════════ */
function TemplateDigest({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi || p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  return (
    <div style={{ width: 480, background: "#fff", overflow: "hidden", fontFamily: "'Barlow Condensed',sans-serif", boxShadow: "0 24px 80px rgba(0,0,0,0.28)" }}>
      <div style={{ position: "relative", padding: "18px 20px 0", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, paddingRight: 138 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#c8220a", fontFamily: "'Noto Sans Devanagari',sans-serif", lineHeight: 1.3, marginBottom: 5 }}>{hi[0] || "असरदार पाचन सुधारक"}</div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 12 ? 36 : p.name.length > 8 ? 48 : 58, color: c.primary, letterSpacing: 1.5, lineHeight: 1, textShadow: `3px 3px 0 ${c.dark}44` }}>{p.name}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 7 }}>
              <div style={{ background: c.pale, border: `1.5px solid ${c.primary}40`, borderRadius: 5, padding: "3px 10px" }}>
                <span style={{ fontSize: 11, color: c.primary, fontWeight: 700, letterSpacing: 1.5 }}>{p.formulation?.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 9.5, color: "#888" }}>{p.packaging}</div>
            </div>
            <div style={{ marginTop: 9, background: c.primary, borderRadius: 5, padding: "6px 14px", display: "inline-block", boxShadow: `0 4px 16px ${c.glow}` }}>
              <span style={{ fontSize: 13, color: "#fff", fontFamily: "'Noto Sans Devanagari',sans-serif", fontWeight: 700 }}>{hi[0] || "तुरंत असर, लंबे समय तक फायदा"}</span>
            </div>
          </div>
          <div style={{ position: "absolute", top: 14, right: 14 }}>
            <ImgBox url={p.image_url} w={130} h={130} c={c} emoji="💊" />
          </div>
        </div>
      </div>
      <div style={{ height: 4, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}22)`, margin: "14px 0 0" }} />
      <DescBar p={p} c={c} />
      <div style={{ padding: "12px 18px", display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, fontWeight: 800, color: c.primary }}>प्रयोग एवं लक्षण :</div>
            <div style={{ flex: 1, height: 1.5, background: `${c.primary}25` }} />
          </div>
          {hi.slice(0, 7).map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 7, padding: "7px 11px", borderRadius: 7, background: i % 2 === 0 ? c.pale : "transparent", borderLeft: `3.5px solid ${i % 2 === 0 ? c.primary : c.bright}`, boxShadow: i === 0 ? `2px 2px 10px ${c.glow}` : "none" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: i % 2 === 0 ? c.primary : c.bright, flexShrink: 0, marginTop: 5 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontFamily: "'Noto Sans Devanagari',sans-serif", color: "#181818", fontWeight: 600, lineHeight: 1.35 }}>{b}</p>
                {en[i] && <p style={{ margin: "1px 0 0", fontSize: 9, color: "#999", fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: 108, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <div style={{ background: `linear-gradient(155deg,${c.darkest},${c.primary})`, borderRadius: 10, padding: "14px 8px", textAlign: "center", width: "100%", boxShadow: `0 6px 20px ${c.glow}` }}>
            <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.55)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1.5, marginBottom: 4 }}>{p.formulation?.toUpperCase()}</div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2, letterSpacing: 0.8 }}>{p.name}</div>
            <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>{p.packaging}</div>
          </div>
          <div style={{ background: c.pale, borderRadius: 8, padding: "8px", textAlign: "center", border: `1px solid ${c.primary}22`, width: "100%" }}>
            <div style={{ fontSize: 8.5, color: c.primary, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginBottom: 5 }}>SPECIES</div>
            <SpeciesRow sp={p.species} c={c} />
          </div>
        </div>
      </div>
      <div style={{ height: 4, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}55)`, margin: "4px 0" }} />
      <FooterStrip c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 3 — HERBAL (Reproductive / Udder Care)
   ═══════════════════════════════════════════════════════════ */
function TemplateHerbal({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi || p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  const c2h = (c.h + 40) % 360;
  const c2 = `hsl(${c2h},72%,34%)`;
  return (
    <div style={{ width: 480, background: "#fff", overflow: "hidden", fontFamily: "'Barlow Condensed',sans-serif", boxShadow: "0 24px 80px rgba(0,0,0,0.28)" }}>
      <div style={{ background: `linear-gradient(155deg, ${c.darkest} 0%, ${c.primary} 55%, ${c2} 100%)`, padding: "18px 20px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0L40 40M40 0L0 40' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: "40px" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <MadvetLogo light size={0.88} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.65)", letterSpacing: 1, fontStyle: "italic" }}>{p.category}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>{p.packaging}</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 14 ? 32 : p.name.length > 10 ? 44 : 52, lineHeight: 1, letterSpacing: 2, textShadow: "0 3px 16px rgba(0,0,0,0.35)" }}>
              {p.name.split(/\s+/).filter(Boolean).map((w, i) => (<span key={i} style={{ color: i % 2 === 0 ? "#fff" : "#FFE000", marginRight: 4 }}>{w}</span>))}
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", marginTop: 5, letterSpacing: 0.3 }}>{p.salt?.split(",")[0]?.trim()}</div>
          </div>
          <ImgBox url={p.image_url} w={100} h={100} c={c} emoji="🌿" />
        </div>
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.13)", borderRadius: 7, padding: "7px 15px", border: "1px solid rgba(255,255,255,0.22)", display: "inline-flex", gap: 9, alignItems: "center" }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>🌱</span>
          <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13.5, color: "#FFE000", fontWeight: 800 }}>{hi[0]}</span>
        </div>
      </div>
      <DescBar p={p} c={c} />
      <div style={{ padding: "14px 18px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 4, height: 16, background: c.primary, borderRadius: 2 }} />
          <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, fontWeight: 800, color: c.primary }}>प्रमुख लाभ एवं उपयोग :</span>
          <div style={{ flex: 1, height: 1, background: `${c.primary}20` }} />
        </div>
        {/* flexbox wrap instead of CSS Grid — display:grid crashes Satori/next/og */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {hi.slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "8px 11px", background: i < 2 ? c.pale : "#fafafa", borderRadius: 8, border: `1px solid ${i < 2 ? c.primary + "30" : "#eeeeee"}`, alignItems: "flex-start", boxShadow: i === 0 ? `2px 2px 10px ${c.glow}` : "none", width: "46%", flexShrink: 0 }}>
              <span style={{ color: c.primary, fontSize: 14, fontWeight: 900, flexShrink: 0, lineHeight: 1.2 }}>►</span>
              <div>
                <p style={{ margin: 0, fontSize: 11.5, fontFamily: "'Noto Sans Devanagari',sans-serif", color: "#1e1e1e", lineHeight: 1.35, fontWeight: 600 }}>{b}</p>
                {en[i] && <p style={{ margin: "1px 0 0", fontSize: 8.5, color: "#aaa", fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "4px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SpeciesRow sp={p.species} c={c} />
        <div style={{ background: c.pale, border: `1px solid ${c.primary}25`, borderRadius: 6, padding: "4px 12px", textAlign: "right" }}>
          <div style={{ fontSize: 8, color: "#aaa", letterSpacing: 0.5 }}>FORMULATION</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.primary }}>{p.formulation}</div>
        </div>
      </div>
      <Divider c={c} />
      <FooterStrip c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 4 — SHIELD (Dermatological / Ectoparasiticide)
   ═══════════════════════════════════════════════════════════ */
function TemplateShield({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi || p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  return (
    <div style={{ width: 1200, background: "#fff", overflow: "hidden", fontFamily: "'Barlow Condensed',sans-serif", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
      <div style={{ background: `linear-gradient(125deg,${c.darkest} 0%,${c.primary} 100%)`, padding: "18px 20px 22px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "45%", background: `linear-gradient(135deg,transparent 35%,rgba(255,255,255,0.06) 100%)` }} />
        <div style={{ position: "absolute", bottom: -35, right: -35, width: 160, height: 160, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.10)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <MadvetLogo light size={0.88} />
            <div style={{ background: "rgba(255,255,255,0.16)", borderRadius: 6, padding: "4px 13px", border: "1px solid rgba(255,255,255,0.28)" }}>
              <div style={{ fontSize: 11, color: "#FFE000", fontWeight: 700, letterSpacing: 2 }}>{p.formulation?.toUpperCase()}</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.60)", textAlign: "center" }}>{p.packaging}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 14 ? 34 : p.name.length > 10 ? 46 : 56, color: "#fff", letterSpacing: 2, lineHeight: 1, textShadow: "0 3px 22px rgba(0,0,0,0.42)" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.68)", marginTop: 5, letterSpacing: 0.4 }}>{p.salt}</div>
              <div style={{ marginTop: 11, background: "#FFE000", borderRadius: 6, padding: "6px 15px", display: "inline-block", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
                <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13.5, fontWeight: 800, color: c.darkest }}>{hi[0]}</span>
              </div>
            </div>
            <ImgBox url={p.image_url} w={108} h={108} c={c} emoji={p.formulation === "Spray" ? "🫧" : "🧼"} />
          </div>
        </div>
      </div>
      <div style={{ padding: "14px 18px 6px" }}>
        <DescBar p={p} c={c} />
        <div style={{ fontSize: 13, fontWeight: 800, color: c.primary, fontFamily: "'Noto Sans Devanagari',sans-serif", marginBottom: 10, marginTop: 8 }}>लाभ एवं उपयोग :</div>
        {hi.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 8, padding: "9px 13px", borderRadius: 8, background: `linear-gradient(90deg,${c.pale},white)`, border: `1px solid ${c.primary}22`, borderLeft: `4.5px solid ${i === 0 ? c.primary : c.bright}`, boxShadow: i === 0 ? `2px 3px 14px ${c.glow}` : "none" }}>
            <div style={{ width: 23, height: 23, borderRadius: "50%", background: i === 0 ? c.primary : c.mid, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 8px ${c.glow}` }}>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 900 }}>✓</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontFamily: "'Noto Sans Devanagari',sans-serif", color: "#111", fontWeight: 600, lineHeight: 1.35 }}>{b}</p>
              {en[i] && <p style={{ margin: "1px 0 0", fontSize: 9.5, color: "#999", fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "4px 18px 8px" }}><SpeciesRow sp={p.species} c={c} /></div>
      <Divider c={c} />
      <FooterStrip c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE 5 — CLINICAL (Antibiotics / Anti-inflammatory)
   ═══════════════════════════════════════════════════════════ */
function TemplateClinical({ p, c }) {
  const hi = splitBenefits(p.usp_benefits_hi || p.usp_benefits);
  const en = splitBenefits(p.usp_benefits);
  const isInj = p.formulation === "Injection";
  return (
    <div style={{ width: 480, background: "#fff", overflow: "hidden", fontFamily: "'Barlow Condensed',sans-serif", boxShadow: "0 24px 80px rgba(0,0,0,0.30)" }}>
      <div style={{ background: `linear-gradient(135deg,${c.darkest} 0%,${c.dark} 45%,${c.primary} 100%)`, padding: "16px 20px 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px)` }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <MadvetLogo light size={0.88} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
              <div style={{ background: c.bright, borderRadius: 5, padding: "3px 11px" }}>
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, letterSpacing: 1 }}>{p.category?.split("/")[0]?.trim()}</span>
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.50)", letterSpacing: 0.5 }}>{p.packaging}</div>
            </div>
          </div>
          {/* Full-width name band */}
          <div style={{ background: "rgba(0,0,0,0.22)", margin: "0 -20px", padding: "10px 20px", borderTop: `2px solid ${c.bright}` }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 14 ? 32 : p.name.length > 10 ? 42 : 52, color: "#fff", letterSpacing: 1.5, lineHeight: 0.95, textShadow: "0 3px 18px rgba(0,0,0,0.38)" }}>{p.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 4, fontStyle: "italic", letterSpacing: 0.3 }}>{p.salt}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 5, padding: "3px 11px", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: 1 }}>{p.formulation} · {p.packaging}</span>
                </div>
              </div>
              <div style={{ marginTop: 9 }}>
                <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, color: "#FFE000", fontWeight: 700 }}>{hi[0]}</span>
              </div>
            </div>
            <ImgBox url={p.image_url} w={100} h={106} c={c} emoji={isInj ? "💉" : "💊"} />
          </div>
        </div>
      </div>
      <div style={{ height: 4, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.gold})` }} />
      <DescBar p={p} c={c} />
      <div style={{ padding: "14px 18px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, fontWeight: 800, color: c.primary }}>प्रमुख लाभ</div>
          <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg,${c.primary}55,transparent)` }} />
          <div style={{ fontSize: 9.5, color: "#bbb", fontStyle: "italic" }}>Key Benefits</div>
        </div>
        {hi.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 11, marginBottom: 8, padding: "9px 13px", borderRadius: 8, background: i === 0 ? c.pale : i === 1 ? `${c.pale}88` : "#fafafa", border: `1px solid ${i < 2 ? c.primary + "28" : "#ededed"}`, boxShadow: i === 0 ? `2px 3px 14px ${c.glow}` : "none" }}>
            <div style={{ width: 25, height: 25, borderRadius: "50%", background: i === 0 ? c.primary : i === 1 ? c.mid : c.bright, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800, flexShrink: 0, boxShadow: `0 2px 7px ${c.glow}` }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontFamily: "'Noto Sans Devanagari',sans-serif", color: "#111", lineHeight: 1.35, fontWeight: 600 }}>{b}</p>
              {en[i] && <p style={{ margin: "1px 0 0", fontSize: 9.5, color: "#999", fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</p>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "4px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SpeciesRow sp={p.species} c={c} />
      </div>
      <Divider c={c} />
      <FooterStrip c={c} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE MAP
   ═══════════════════════════════════════════════════════════ */
export function getTemplate(category: string) {
  if (["Vitamin Supplement", "Vitamin Supplement / Galactogogue"].includes(category)) return "vitality";
  if (["Probiotic", "Digestive / Antiflatulent", "Antidiarrheal"].includes(category)) return "digest";
  if (["Reproductive Hormone", "Udder Care / Herbal Antimicrobial"].includes(category)) return "herbal";
  if (["Dermatological", "Ectoparasiticide", "Antihistamine"].includes(category)) return "shield";
  return "clinical";
}

export const SHARE_CARD_TEMPLATES = { vitality: TemplateVitality, digest: TemplateDigest, herbal: TemplateHerbal, shield: TemplateShield, clinical: TemplateClinical };
export { getColors as getShareColors };

const TEMPLATE_LABELS = { vitality: "Vitamin / Tonic", digest: "Probiotic / Digestive", herbal: "Herbal / Reproductive", shield: "Topical / Skin", clinical: "Clinical / Rx" };

/* ═══════════════════════════════════════════════════════════
   SAMPLE PRODUCTS
   ═══════════════════════════════════════════════════════════ */
const PRODUCTS = [
  { id: 78, name: "MADCOMIN", packaging: "Vet 200ml, 500ml", formulation: "Liquid", salt: "Mecobalamin, Vitamins & Mineral Syrup", category: "Vitamin Supplement", species: "Cattle, Buffalo, Horse, Sheep, Goat", tagline_hi: "जानवरों में कमज़ोरी दूर करता है।", usp_benefits_hi: "कीटोसिस को रोकने में सहायक।,दुधारू पशुओ में ऊर्जा का पूर्ण स्रोत।,क्षतिग्रस्त कोशिकाओ की पुनः वृद्धि में सहायक।,नरवाइन डिसआर्डर में अधिक उपयोगी।,जानवरों में कमज़ोरी दूर करता है।,जनवर की सुस्ती व खून कमी दूर करता है।", usp_benefits: "Prevents ketosis,Complete energy source,Nerve regeneration,Corrects weakness,Boosts immunity,Treats blood deficiency", image_url: null, dosage: "Cattle & Buffalo: 50-100ml | Sheep & Goat: 20ml daily" },
  { id: 85, name: "BHUK OK", packaging: "10 Bolus Strip", formulation: "Bolus", salt: "Probiotics, Enzymes, Amino Acids & Nutritional Supplement", category: "Probiotic", species: "Cattle, Buffalo, Sheep, Goat", tagline_hi: "भूख को खोले तुरंत, पाचक एवं शक्तिवर्धक", usp_benefits_hi: "भूख न लगना,कसाव / बंधा लगना,एंटीबायोटिक के बाद रूमेन सुधारे,रूमेन की एसिडिटी बढ़ना ठीक करे,लीवर में फैट जमा होने से बचाए,कमज़ोर पशुओं की ग्रोथ में सहायक", usp_benefits: "Loss of appetite,Constipation relief,Rumen restoration,Rumen acidosis correction,Liver fat prevention,Weak animal growth", image_url: null, dosage: "Large animals: 2 bolus twice daily" },
  { id: 62, name: "UTRO OK", packaging: "1 Litre", formulation: "Liquid", salt: "Herbal Uterotonic Tonic for Post-Calving Care", category: "Reproductive Hormone", species: "Cattle, Buffalo", tagline_hi: "प्रसव के बाद गर्भाशय की सफाई", usp_benefits_hi: "गर्भाशय की सफाई करता है,जेर न गिरने पर तुरंत असर,बार-बार गाभिन न होने की समस्या,हीट साइकल नियमित करे,प्रसव के बाद जल्दी रिकवरी,दूध उत्पादन फिर से बढ़ाता है", usp_benefits: "Uterine cleansing,Retained placenta removal,Repeat breeding correction,Heat cycle regularisation,Post-calving recovery,Restores milk production", image_url: null, dosage: "100ml twice daily for 5 days" },
  { id: 3, name: "SKIN TOP", packaging: "200ml Spray", formulation: "Spray", salt: "Herbal Antiseptic & Wound Healing Spray", category: "Dermatological", species: "Cattle, Buffalo, Dog, Cat", tagline_hi: "त्वचा रोगों का असरदार उपचार", usp_benefits_hi: "घाव भरने में असरदार,एंटीसेप्टिक सुरक्षा,फंगल इन्फेक्शन से बचाए,त्वचा की मरम्मत करे,मक्खियों को दूर रखे", usp_benefits: "Rapid wound healing,Antiseptic protection,Anti-fungal action,Skin repair & regeneration,Fly repellent effect", image_url: null, dosage: "Spray on affected area 2-3 times daily" },
  { id: 9, name: "X-FUR-ONE Inj", packaging: "30ml Injection", formulation: "Injection", salt: "Cefuroxime Sodium 1.5g — Third Generation Cephalosporin", category: "Antibiotic", species: "Cattle, Buffalo, Sheep, Goat, Dog", tagline_hi: "असरदार एंटीबायोटिक इंजेक्शन", usp_benefits_hi: "ब्रॉड स्पेक्ट्रम एंटीबायोटिक,तेज़ बैक्टीरियल एक्शन,सांस के रोगों में असरदार,थनैला रोग में उपयोगी,ऑपरेशन के बाद संक्रमण से बचाव", usp_benefits: "Broad spectrum antibiotic coverage,Rapid bactericidal action,Effective in respiratory infections,Treats mastitis effectively,Post-surgical infection prophylaxis", image_url: null, dosage: "10-20mg/kg body weight, once daily IM for 3-5 days" },
];

/* ═══════════════════════════════════════════════════════════
   APP SHELL — Demo preview page
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [sel, setSel] = useState(0);
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const p = PRODUCTS[sel];
  const tmpl = getTemplate(p.category);
  const c = useMemo(() => getColors(p.id, p.category), [p.id, p.category]);
  const Card = SHARE_CARD_TEMPLATES[tmpl];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Requires html2canvas: npm install html2canvas
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${p.name.replace(/\s+/g, "-")}-madvet.png`;
      a.click();
    } catch {
      // Fallback: open server API
      window.open(`/api/share-card/${p.id}`, "_blank");
    }
    setDownloading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#12151f 0%,#1c2030 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px", gap: 22 }}>
      <style>{FONTS}{`
        *{box-sizing:border-box;}
        button{transition:all 0.14s ease;cursor:pointer;}
        button:hover{transform:translateY(-2px);filter:brightness(1.08);}
        button:active{transform:translateY(0);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
      `}</style>

      <div style={{ textAlign: "center" }}>
        <MadvetLogo light size={1.1} />
        <p style={{ color: "rgba(255,255,255,0.40)", fontSize: 11, margin: "8px 0 0", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1.5 }}>5 TEMPLATES · 91 PRODUCTS · UNIQUE COLOR PER PRODUCT</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {PRODUCTS.map((prod, i) => {
          const col = getColors(prod.id, prod.category);
          const t = getTemplate(prod.category);
          const active = sel === i;
          return (
            <button key={prod.id} onClick={() => setSel(i)} style={{ padding: "8px 16px", borderRadius: 10, border: `2px solid ${active ? col.bright : "rgba(255,255,255,0.13)"}`, background: active ? `${col.darkest}ee` : "rgba(255,255,255,0.06)", color: active ? "#fff" : "rgba(255,255,255,0.50)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, boxShadow: active ? `0 4px 20px ${col.glow}` : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{prod.name}</div>
              <div style={{ fontSize: 9, opacity: 0.65, marginTop: 1 }}>{TEMPLATE_LABELS[t]}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ background: c.primary, borderRadius: 20, padding: "4px 16px", fontSize: 11, color: "#fff", fontFamily: "'Oswald',sans-serif", fontWeight: 600, letterSpacing: 1.5 }}>{TEMPLATE_LABELS[tmpl].toUpperCase()}</div>
        <div style={{ background: `${c.primary}28`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: c.bright, fontFamily: "'Barlow Condensed',sans-serif", border: `1px solid ${c.bright}35`, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: c.primary }} />
          Product #{p.id}
        </div>
      </div>

      {/* Card wrapped in ref for download */}
      <div ref={cardRef} key={sel} style={{ animation: "fadeUp 0.26s cubic-bezier(0.16,1,0.3,1) both" }}>
        <Card p={p} c={c} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleDownload} disabled={downloading} style={{ padding: "12px 32px", borderRadius: 10, background: downloading ? "#555" : `linear-gradient(135deg,${c.primary},${c.bright})`, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, fontFamily: "'Oswald',sans-serif", letterSpacing: 1.5, boxShadow: downloading ? "none" : `0 8px 28px ${c.glow}`, opacity: downloading ? 0.7 : 1 }}>
          {downloading ? "⏳ PREPARING…" : "↓ DOWNLOAD PNG"}
        </button>
        <button onClick={() => window.open("https://madvet.in/products", "_blank")} style={{ padding: "12px 28px", borderRadius: 10, background: "#FFE000", color: "#1a2f8a", border: "none", fontSize: 14, fontWeight: 700, fontFamily: "'Oswald',sans-serif", letterSpacing: 1.5 }}>🔗 ALL PRODUCTS</button>
      </div>

      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'Barlow Condensed',sans-serif" }}>
        For PNG download: npm install html2canvas · Or use /api/share-card/[id] server route
      </div>
    </div>
  );
}
