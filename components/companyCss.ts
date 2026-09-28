// Shared look for the company pages (Home, About, Contact, Careers). Same
// tokens, type and hero as /videos and /schemes, so the site reads as one.
export const COMPANY_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow-x: clip; }
:root { --forest:#1a3a2a; --forest-mid:#264d39; --night:#0f2318; --cream:#f5f0e8; --cream-dark:#ede6d6; --gold:#c8a96e; --gold-light:#e8d5a8; --ink:#1c2b22; --muted:#5b6b60; }
.cp { font-family:'DM Sans','Noto Sans Devanagari',sans-serif; background:var(--cream); color:var(--ink); }
.cp a { color:inherit; }
.cp-wrap { max-width:1320px; margin:0 auto; padding:0 48px; }

.cp-hero { position:relative; overflow:hidden; background:var(--forest); color:var(--cream); }
.cp-hero::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 85% 10%, rgba(200,169,110,.16), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(15,35,24,.9), transparent 60%); }
.cp-hero::after { content:''; position:absolute; left:0; right:0; bottom:0; height:1px; background:linear-gradient(90deg,transparent,rgba(200,169,110,.5),transparent); }
.cp-hero-in { position:relative; max-width:1320px; margin:0 auto; padding:72px 48px 80px; display:grid; grid-template-columns:1.05fr 1fr; gap:56px; align-items:center; }
.cp-hero.slim .cp-hero-in { grid-template-columns:1fr; padding:64px 48px 56px; }
.cp-eyebrow { display:flex; align-items:center; gap:12px; font-size:11px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--gold); margin-bottom:22px; }
.cp-eyebrow::before { content:''; width:28px; height:1px; background:var(--gold); }
.cp-hero h1 { margin:0; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:clamp(38px,5vw,66px); line-height:1.08; letter-spacing:-.5px; }
.cp-hero h1 em { color:var(--gold-light); }
.cp-hero p.lead { margin:22px 0 0; max-width:540px; font-size:17px; line-height:1.75; color:rgba(245,240,232,.72); }
.cp-cta { display:flex; flex-wrap:wrap; gap:12px; margin-top:32px; }
.cp-btn { display:inline-flex; align-items:center; gap:8px; padding:13px 22px; border-radius:10px; font-weight:700; font-size:14.5px; text-decoration:none; border:1px solid transparent; }
.cp-btn.gold { background:var(--gold); color:var(--forest); }
.cp-btn.gold:hover { background:#d8b97e; }
.cp-btn.line { border-color:rgba(245,240,232,.3); color:var(--cream); }
.cp-btn.line:hover { border-color:var(--gold-light); color:var(--gold-light); }
.cp-btn.dark { background:var(--forest); color:var(--cream); }

.cp-photo { position:relative; border-radius:18px; overflow:hidden; box-shadow:0 30px 60px -20px rgba(0,0,0,.55); border:1px solid rgba(200,169,110,.25); }
.cp-photo img { display:block; width:100%; height:100%; object-fit:cover; }
.cp-photo figcaption { position:absolute; left:0; right:0; bottom:0; padding:28px 18px 14px; font-size:12.5px; color:rgba(245,240,232,.9); background:linear-gradient(transparent, rgba(15,35,24,.85)); }

.cp-stats { display:grid; grid-template-columns:repeat(4,1fr); background:var(--night); border-top:1px solid rgba(200,169,110,.15); }
.cp-stat { padding:28px 24px; text-align:center; border-right:1px solid rgba(245,240,232,.07); }
.cp-stat:last-child { border-right:0; }
.cp-stat b { display:block; font-family:'DM Serif Display',serif; font-weight:400; font-size:40px; color:var(--gold-light); line-height:1; }
.cp-stat span { display:block; margin-top:8px; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(245,240,232,.55); }

.cp-sec { padding:80px 0; }
.cp-sec.alt { background:var(--cream-dark); }
.cp-sec.dark { background:var(--forest); color:var(--cream); }
.cp-kicker { font-size:11px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#9a7a3e; margin-bottom:12px; }
.cp-sec.dark .cp-kicker { color:var(--gold); }
.cp-sec h2 { margin:0 0 14px; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:clamp(30px,3.4vw,44px); line-height:1.12; }
.cp-sec p.intro { margin:0 0 40px; max-width:640px; font-size:16px; line-height:1.75; color:var(--muted); }
.cp-sec.dark p.intro { color:rgba(245,240,232,.65); }

.cp-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:18px; }
.cp-card { display:flex; flex-direction:column; gap:10px; padding:26px 24px; background:#fff; border:1px solid rgba(26,58,42,.1); border-radius:16px; text-decoration:none; transition:transform .15s, box-shadow .15s, border-color .15s; }
.cp-card:hover { transform:translateY(-3px); box-shadow:0 18px 36px -18px rgba(26,58,42,.35); border-color:rgba(200,169,110,.6); }
.cp-card .ic { font-size:26px; }
.cp-card h3 { margin:0; font-family:'DM Serif Display',serif; font-weight:400; font-size:23px; color:var(--forest); }
.cp-card p { margin:0; font-size:14.5px; line-height:1.6; color:var(--muted); }
.cp-card .go { margin-top:auto; padding-top:6px; font-size:13px; font-weight:700; color:#9a7a3e; }

.cp-chips { display:flex; flex-wrap:wrap; gap:10px; }
.cp-chip { padding:10px 16px; border-radius:999px; background:#fff; border:1px solid rgba(26,58,42,.12); font-size:14px; text-decoration:none; color:var(--forest); }
.cp-chip b { color:#9a7a3e; margin-left:6px; }

.cp-films { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; }
.cp-film { position:relative; aspect-ratio:9/16; border-radius:14px; overflow:hidden; background:#0f2318; text-decoration:none; }
.cp-film img { width:100%; height:100%; object-fit:cover; opacity:.92; transition:transform .3s; }
.cp-film:hover img { transform:scale(1.04); }
.cp-film span { position:absolute; left:0; right:0; bottom:0; padding:30px 10px 10px; font-size:12.5px; font-weight:600; color:#fff; background:linear-gradient(transparent, rgba(0,0,0,.8)); }
.cp-film::after { content:'▶'; position:absolute; top:10px; right:10px; width:28px; height:28px; border-radius:50%; background:rgba(200,169,110,.92); color:var(--forest); font-size:11px; display:grid; place-items:center; }

.cp-gallery { display:grid; grid-template-columns:2fr 1fr 1fr; grid-auto-rows:220px; gap:14px; }
.cp-gallery .cp-photo:first-child { grid-row:span 2; }
.cp-gallery .cp-photo { box-shadow:none; }

.cp-quotes { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px; }
.cp-quote { margin:0; padding:26px; border-radius:16px; background:rgba(245,240,232,.05); border:1px solid rgba(200,169,110,.2); }
.cp-quote blockquote { margin:0; font-size:15.5px; line-height:1.7; color:rgba(245,240,232,.88); }
.cp-quote blockquote::before { content:'“'; display:block; font-family:'DM Serif Display',serif; font-size:44px; line-height:.6; color:var(--gold); margin-bottom:8px; }
.cp-quote figcaption { margin-top:16px; font-size:13px; color:var(--gold-light); font-weight:600; }
.cp-quote figcaption span { display:block; font-weight:400; color:rgba(245,240,232,.5); }

.cp-band { display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; padding:36px 40px; border-radius:20px; background:var(--forest); color:var(--cream); }
.cp-band h3 { margin:0; font-family:'DM Serif Display',serif; font-weight:400; font-size:28px; }
.cp-band p { margin:6px 0 0; color:rgba(245,240,232,.65); }

.cp-prose { max-width:760px; font-size:16.5px; line-height:1.85; color:#2f3d34; }
.cp-prose p { margin:0 0 18px; }
.cp-split { display:grid; grid-template-columns:1.2fr 1fr; gap:56px; align-items:start; }
.cp-people { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:18px; }
.cp-person { padding:26px; border-radius:16px; background:#fff; border:1px solid rgba(26,58,42,.1); }
.cp-person h3 { margin:0; font-family:'DM Serif Display',serif; font-weight:400; font-size:25px; color:var(--forest); }
.cp-person p { margin:6px 0 0; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:#9a7a3e; font-weight:700; }
.cp-list { margin:0; padding:0; list-style:none; display:grid; gap:12px; }
.cp-list li { padding:16px 18px; border-radius:12px; background:#fff; border:1px solid rgba(26,58,42,.1); font-size:15px; line-height:1.55; }
.cp-list li b { display:block; color:var(--forest); font-size:15.5px; }

.cp-contact { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:18px; }
.cp-contact > a, .cp-contact > div { display:block; padding:28px 26px; border-radius:16px; background:#fff; border:1px solid rgba(26,58,42,.1); text-decoration:none; }
.cp-contact .k { font-size:11px; letter-spacing:2.5px; text-transform:uppercase; font-weight:700; color:#9a7a3e; }
.cp-contact .v { margin-top:10px; font-family:'DM Serif Display',serif; font-size:24px; color:var(--forest); overflow-wrap:anywhere; }
.cp-contact .v.sm { font-size:19px; }
.cp-contact .s { margin-top:6px; font-size:13.5px; color:var(--muted); }

@media (max-width:980px) {
  .cp-hero-in { grid-template-columns:1fr; padding:48px 20px 56px; gap:36px; }
  .cp-hero.slim .cp-hero-in { padding:44px 20px 40px; }
  .cp-wrap { padding:0 20px; }
  .cp-stats { grid-template-columns:repeat(2,1fr); }
  .cp-stat:nth-child(2) { border-right:0; }
  .cp-sec { padding:56px 0; }
  .cp-films { grid-template-columns:repeat(3,1fr); }
  .cp-gallery { grid-template-columns:1fr 1fr; grid-auto-rows:160px; }
  .cp-split { grid-template-columns:1fr; gap:32px; }
  .cp-band { padding:28px 22px; }
}
@media (max-width:520px) { .cp-films { grid-template-columns:repeat(2,1fr); } .cp-stat b { font-size:32px; } }
`
