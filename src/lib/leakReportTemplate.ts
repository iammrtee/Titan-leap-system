// Renders a Customer Leak Audit as a standalone HTML page, in the same design as
// titanleap.co/sample-report, so what a client receives matches what they were shown.
// CSS is copied from the public site (public/home.html + sample-report.html).

export type LeakAuditReport = {
  businessName: string;
  websiteUrl: string;
  generatedAt: string;
  pagesRead: { home: boolean; pricing: boolean; signup: boolean };
  funnel: {
    visitors: number; signupRate: number; trials: number; paidRate: number; customers: number;
    targetSignupRate: number; targetPaidRate: number; targetCustomers: number; gap: number; revenuePerCustomer: number;
    payingCustomers?: number | null; cancelledLastMonth?: number | null; churnRate?: number | null; targetChurnRate?: number;
  };
  totals: { customersLow: number; customersHigh: number; revenueLow: number; revenueHigh: number; effort: string };
  verdict: string;
  leaks: Array<{
    title: string; where: string; whatWeSaw: string; whatsWrong: string; fixes: string[];
    before?: string; after?: string; effort: string; howToKnow: string;
    customersLow: number; customersHigh: number; revenueLow: number; revenueHigh: number;
    page?: string; quoteOnPage?: string; pageUrl?: string | null;
    // Screenshot of their page added by the user (JPEG data URL). `image` is what the
    // report shows (with the mark drawn in); `raw` is the untouched upload so the mark
    // can be redrawn.
    shot?: {
      image: string; url: string; highlighted: boolean;
      raw?: string; box?: { x: number; y: number; w: number; h: number } | null; note?: string; markedBy?: 'ai' | 'you' | null;
    } | null;
  }>;
  channels: Array<{ name: string; who: string; why: string; firstStep: string }>;
  uncomfortableTruth: string;
  plan: { weeks1to2?: string[]; month1?: string[]; month3?: string[]; week1?: string[]; week2?: string[]; week3?: string[]; week4?: string[] };
  contentSummary?: string | null;
  contentScore?: number | null;
  // Spec v2 (whole path to paying, one bottleneck). Absent on reports built before it.
  version?: number;
  headline?: string;
  steps?: Array<{ key: string; label: string; rate: number | null; target: number; low: number; high: number; known: boolean; revenueLow: number; revenueHigh: number }>;
  bottleneck?: { key: string; label: string; customersLow: number; customersHigh: number; revenueLow: number; revenueHigh: number; whatsHappening: string; evidence: string[] };
  checks?: Array<{ key: string; score: string; finding: string }>;
  onboarding?: { done: boolean; summary: string; timeline: Array<{ when: string; what: string; problem: string }> };
};

const shortUrl = (u: string) => String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const pageLabel = (l: { page?: string; where?: string }) =>
  ({ home: 'Home page', pricing: 'Pricing page', signup: 'Signup page' } as Record<string, string>)[String(l.page || '').toLowerCase()] || l.where || '';

const REPORT_CSS = "\n/* \u2500\u2500 Design contract \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   Subject: an editor's red pen on a founder's funnel.\n   ground  cool grey desk      paper  the page being marked up\n   ink     body text           brand  TitanLeap purple, actions only\n   pen     red markup, the one signature element\n   hl      gold highlighter, never as text colour\n   Type: Archivo (expanded width for headlines), Caveat only for pen notes.\n   Motion: one moment \u2014 the markup draws itself on the hero page.\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n:root{\n  --ground:#F7F3FF;--paper:#FFFFFF;--ink:#190D3E;--ink2:#46396B;--muted:#65598A;--rule:#E3D9F7;--tint:#EFE6FF;\n  --brand:#6B21E8;--brand-hover:#5716C8;--pen:#6B21E8;--gold:#F5C518;--gold-hover:#FFD84D;--deep:#190D3E;--deep2:#251252;\n  --on-deep:#F0EAFF;--on-deep2:#CCB6F5;--hl:rgba(245,197,24,.55);--ok:#0B7A4B;\n  --paper-shadow:0 1px 1px rgba(26,21,48,.04),0 2px 4px rgba(26,21,48,.04),0 12px 28px -8px rgba(26,21,48,.14);\n  --hand:'Caveat','Bradley Hand','Segoe Print',cursive;\n  --sans:'Archivo',system-ui,-apple-system,'Segoe UI',sans-serif;\n}\n:root[data-theme=\"dark\"]{\n  --ground:#0B0418;--paper:#160B2E;--ink:#F0EAFF;--ink2:#CBBBEE;--muted:#9E8FC7;--rule:#2B1B52;--tint:#1F1040;\n  --brand:#9B5CFF;--brand-hover:#B283FF;--pen:#B38BFF;--gold:#F5C518;--gold-hover:#FFD84D;--deep:#1A0C3D;--deep2:#26134F;\n  --on-deep:#F0EAFF;--on-deep2:#CCB6F5;--hl:rgba(245,197,24,.3);--ok:#4ED49A;\n  --paper-shadow:0 1px 1px rgba(0,0,0,.3),0 16px 36px -12px rgba(0,0,0,.6);\n}\n*{box-sizing:border-box;margin:0;padding:0}\nhtml{scroll-behavior:smooth}\nbody{background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}\na{color:inherit}\n.wrap{max-width:1180px;margin:0 auto;padding:0 24px}\nh1,h2,h3{font-weight:800;font-stretch:112%;letter-spacing:-.02em;line-height:1.04;text-wrap:balance}\nh2{font-size:clamp(30px,4vw,46px);margin-bottom:16px}\nh3{font-size:21px;font-stretch:105%;letter-spacing:-.01em}\np{text-wrap:pretty}\n.lede{font-size:19px;color:var(--ink2);max-width:60ch}\n.hl{background:linear-gradient(transparent 55%,var(--hl) 55%,var(--hl) 92%,transparent 92%)}\nsection{padding:112px 0 0}\n:focus-visible{outline:2.5px solid var(--brand);outline-offset:3px;border-radius:4px}\n\n.btn{display:inline-flex;align-items:center;justify-content:center;font:700 16px/1 var(--sans);padding:16px 22px;border-radius:8px;text-decoration:none;cursor:pointer;border:1.5px solid transparent;transition:background .15s}\n.btn-brand{background:var(--brand);color:#fff}\n.btn-brand:hover{background:var(--brand-hover)}\n:root[data-theme=\"dark\"] .btn-brand{color:#140A2E}\n.btn-gold{background:var(--gold);color:#190D3E}\n.btn-gold:hover{background:var(--gold-hover)}\n.btn-ghost-deep{border-color:rgba(240,234,255,.3);color:var(--on-deep);background:transparent}\n.btn-ghost-deep:hover{border-color:var(--on-deep)}\n.band{background:var(--deep);color:var(--on-deep);padding:104px 0;margin-top:112px}\n.band+section{padding-top:112px}\n.btn-plain{border-color:var(--rule);background:var(--paper);color:var(--ink)}\n.btn-plain:hover{border-color:var(--ink2)}\n.link{color:var(--brand);font-weight:600;text-underline-offset:4px}\n\n/* nav */\n.nav{border-bottom:1px solid var(--rule);background:var(--ground);position:sticky;top:0;z-index:40}\n.nav .wrap{display:flex;align-items:center;gap:28px;height:68px}\n.logo{font-weight:900;font-stretch:118%;font-size:20px;letter-spacing:-.02em;text-decoration:none}\n.logo span{color:var(--brand)}\nfooter .logo{color:#fff}footer .logo span{color:var(--gold)}\n.nav-links{display:flex;gap:26px;margin-left:auto;font-size:15px;color:var(--ink2)}\n.nav-links a{text-decoration:none}.nav-links a:hover{color:var(--ink)}\n.theme{width:40px;height:40px;border:1.5px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink);cursor:pointer;display:grid;place-items:center}\n.theme svg{width:18px;height:18px}\n.nav .btn{padding:11px 16px;font-size:15px}\n@media(max-width:920px){.nav-links{display:none}.theme{margin-left:auto}}\n@media(max-width:460px){.nav .btn{display:none}}\n\n/* hero */\n.hero{padding:64px 0 0}\n.hero-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:64px;align-items:start}\n.hero h1{font-size:clamp(40px,5.2vw,66px);margin:8px 0 24px}\n.hero .lede{margin-bottom:32px}\n.actions{display:flex;gap:12px;flex-wrap:wrap}\n.small{font-size:15px;color:var(--muted);margin-top:18px;max-width:52ch}\n@media(max-width:980px){.hero-grid{grid-template-columns:1fr;gap:48px}}\n\n\n.pill{display:inline-flex;align-items:center;gap:10px;background:var(--paper);border:1px solid var(--rule);padding:6px 14px 6px 6px;border-radius:99px;font-size:14px;font-weight:500;color:var(--ink2);margin-bottom:6px}\n.pill b{background:var(--tint);color:var(--brand);font-size:12px;font-weight:700;padding:3px 9px;border-radius:99px}\n.hero h1 .accent{color:var(--brand)}\n.checks{list-style:none;display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:22px;font-size:15px;color:var(--ink2);font-weight:500}\n.checks li{padding-left:24px;position:relative}\n.checks li::before{content:\"\";position:absolute;left:3px;top:6px;width:11px;height:6px;border-left:2px solid var(--ok);border-bottom:2px solid var(--ok);transform:rotate(-45deg)}\n\n\n/* offer stack */\n.stack{list-style:none;margin:6px 0 20px;border-top:1px solid var(--rule);flex:1}\n.stack li{padding:12px 0 12px 30px;border-bottom:1px solid var(--rule);position:relative;color:var(--ink2);font-size:15.5px;line-height:1.5}\n.stack li b{color:var(--ink);font-weight:700}\n.stack li::before{content:\"\";position:absolute;left:4px;top:19px;width:12px;height:6px;border-left:2px solid var(--ok);border-bottom:2px solid var(--ok);transform:rotate(-45deg)}\n.stack li.bonus::before{content:\"+\";border:0;transform:none;left:0;top:10px;width:20px;height:20px;border-radius:50%;background:var(--gold);color:#190D3E;font-weight:900;font-size:15px;display:grid;place-items:center;line-height:1}\n.gline{background:var(--tint);border-radius:8px;padding:14px 16px;font-size:15px;color:var(--ink2);margin-bottom:18px}\n.gline b{color:var(--ink)}\n.cap{font-size:14px;color:var(--muted);margin-top:10px;text-align:center}\n.offer .step-l{font-size:14px;color:var(--muted)}\n/* mobile sticky CTA */\n.mcta{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;display:none;align-items:center;gap:12px;background:var(--deep);color:var(--on-deep);border-radius:12px;padding:10px 10px 10px 16px;box-shadow:0 12px 32px -8px rgba(25,13,62,.5);transform:translateY(140%);transition:transform .3s ease}\n.mcta.show{transform:none}\n.mcta span{font-size:14px;font-weight:600;flex:1;line-height:1.3}\n.mcta .btn{padding:12px 16px;font-size:15px}\n@media(max-width:760px){.mcta{display:flex}footer{padding-bottom:96px}}\n@media(prefers-reduced-motion:reduce){.mcta{transition:none}}\n\n/* the marked-up page */\n.desk{position:relative;padding:28px 200px 32px 28px;background:var(--deep);border-radius:12px;background-image:radial-gradient(rgba(240,234,255,.07) 1px,transparent 1.2px);background-size:18px 18px}\n.page{background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);position:relative;overflow:visible}\n.urlbar{display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid var(--rule);font-size:13px;color:var(--muted)}\n.urlbar b{font-weight:500;color:var(--ink2)}\n.lock{width:12px;height:12px}\n.site{padding:26px 28px 30px;font-size:14px;color:#2B2640}\n:root[data-theme=\"dark\"] .site{color:var(--ink2)}\n.site-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;font-size:12.5px;color:var(--muted)}\n.site-nav strong{font-size:15px;color:var(--ink);font-weight:800}\n.site h4{font-size:24px;font-weight:800;font-stretch:100%;letter-spacing:-.02em;color:var(--ink);position:relative;display:inline-block}\n.site .sub{color:var(--muted);margin:6px 0 22px}\n.plan{border:1px solid var(--rule);border-radius:6px;padding:20px;max-width:300px;position:relative}\n.plan .name{font-weight:700;color:var(--ink)}\n.plan .amount{font-size:38px;font-weight:800;color:var(--ink);letter-spacing:-.03em;margin:4px 0 2px;display:inline-block;position:relative}\n.plan .amount small{font-size:13px;color:var(--muted);font-weight:500;letter-spacing:0}\n.plan ul{list-style:none;margin:12px 0 16px;color:var(--ink2)}\n.plan li{padding:3px 0 3px 18px;position:relative}\n.plan li::before{content:\"\";position:absolute;left:2px;top:11px;width:7px;height:7px;border-radius:50%;background:var(--rule)}\n.fake-btn{display:inline-block;background:#1F7AE0;color:#fff;font-weight:700;padding:10px 16px;border-radius:5px;position:relative}\n.next{margin-top:10px;font-size:12px;color:var(--muted)}\n\n/* pen markup */\n.mk{position:absolute;pointer-events:none;overflow:visible}\n.mk path.con{stroke:var(--gold);stroke-width:2;opacity:.9}\n.mk path{fill:none;stroke:var(--pen);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}\n.note{position:absolute;font-family:var(--hand);color:var(--gold);font-size:21px;line-height:1.1;font-weight:600;width:160px;right:18px}\n.note b{display:block;font-weight:700;font-size:23px}\n.note .num{display:inline-grid;place-items:center;width:24px;height:24px;border:2px solid var(--gold);border-radius:50%;font-size:16px;margin-right:4px;font-weight:700}\n.n1{top:210px}\n.n2{top:368px}\n.n3{top:72px}\n.draw path{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:draw .7s ease-out forwards}\n.draw .note{opacity:0;animation:ink .4s ease-out forwards}\n@keyframes draw{to{stroke-dashoffset:0}}\n@keyframes ink{to{opacity:1}}\n@media(prefers-reduced-motion:reduce){.draw path{animation:none;stroke-dashoffset:0}.draw .note{animation:none;opacity:1}html{scroll-behavior:auto}}\n@media(max-width:640px){\n  .desk{padding:16px 16px 18px}\n  .note{position:static;width:auto;display:block;margin:10px 0 0;font-size:20px}\n  .notes-m{padding:10px 4px 0}\n  .notes-m{padding:14px 4px 0}\n  .mk.side{display:none}\n}\n\n/* the ledger (report table) */\n.ledger{margin-top:56px;background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow)}\n.ledger-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:18px 22px;border-bottom:1px solid var(--rule);flex-wrap:wrap}\n.ledger-head h3{font-size:18px}\n.ledger-head p{font-size:14px;color:var(--muted)}\n.lt{width:100%;border-collapse:collapse;font-size:15px}\n.lt th{font-size:13px;font-weight:600;color:var(--muted);text-align:left;padding:12px 22px;border-bottom:1px solid var(--rule)}\n.lt td{padding:16px 22px;border-bottom:1px solid var(--rule);vertical-align:top;color:var(--ink2)}\n.lt td:first-child{font-family:var(--hand);color:var(--pen);font-size:22px;font-weight:700;width:40px;padding-top:12px}\n.lt td strong{color:var(--ink);font-weight:700;display:block}\n.lt td[data-l=\"Effort\"]{white-space:nowrap}\n.lt .num{text-align:right;white-space:nowrap;color:var(--ink);font-weight:600}\n.lt tfoot td{border-bottom:none;font-weight:800;color:var(--ink);font-family:var(--sans);font-size:16px}\n.lt tfoot td:first-child{font-family:var(--sans)}\n@media(max-width:720px){\n  .lt thead{display:none}\n  .lt tr{display:grid;grid-template-columns:36px 1fr;padding:14px 18px;border-bottom:1px solid var(--rule)}\n  .lt td{border:none;padding:2px 0}\n  .lt td:first-child{grid-row:span 4;padding-top:0}\n  .lt .num{text-align:left}\n  .lt td[data-l]::before{content:attr(data-l) \": \";color:var(--muted);font-weight:500}\n  .lt tfoot tr{border:none}\n}\n\n/* strip */\n.honest{margin-top:88px;background:var(--tint);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:28px 0}\n.honest p{max-width:78ch;color:var(--ink2)}\n.honest strong{color:var(--ink)}\n\n/* calculator */\n.calc{display:grid;grid-template-columns:1fr 1fr;margin-top:40px;background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow)}\n.calc-in{padding:36px;border-right:1px solid var(--rule)}\n.field+.field{margin-top:28px}\n.fl{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px}\n.fl label{font-weight:600;font-size:16px}\n.fl output{font-weight:700;color:var(--brand);font-size:17px}\n.hint{font-size:14px;color:var(--muted);margin-top:6px}\ninput[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:var(--rule);outline-offset:6px}\ninput[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--brand);border:3px solid var(--paper);box-shadow:0 0 0 1px var(--brand);cursor:pointer}\ninput[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--brand);border:3px solid var(--paper);cursor:pointer}\n.calc-out{padding:36px;display:flex;flex-direction:column;background:var(--deep);color:var(--on-deep);border-radius:0 4px 4px 0}\n.calc-out .lbl,.calc-out .small{color:var(--on-deep2)}\n.calc-out .per{color:var(--on-deep)!important}\n.calc-out .rows{border-top-color:rgba(240,234,255,.16)!important}\n.calc-out .rows div{color:var(--on-deep2)!important;border-bottom-color:rgba(240,234,255,.16)!important}\n.calc-out .rows b{color:#fff!important}\n.leak-n{color:var(--gold)}\n.leak-n .unit{font-size:.36em;font-weight:700;letter-spacing:-.01em;margin-left:.2em;color:var(--on-deep)}\n.calc-out .lbl{font-size:15px;color:var(--on-deep2)}\n.leak-n{font-size:clamp(48px,6vw,72px);font-weight:900;font-stretch:112%;letter-spacing:-.035em;line-height:1;margin:10px 0 4px;position:relative;display:inline-block;align-self:flex-start}\n.leak-n svg{position:absolute;left:-2%;bottom:-12px;width:104%;height:16px;overflow:visible}\n.leak-n svg path{fill:none;stroke:var(--gold);opacity:.7;stroke-width:3;stroke-linecap:round}\n.calc-out .per{color:var(--ink2);margin-top:14px}\n.rows{margin:26px 0 28px;border-top:1px solid var(--rule)}\n.rows div{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--rule);font-size:15px;color:var(--ink2)}\n.rows b{color:var(--ink);font-weight:700}\n.calc-out .btn{margin-top:auto}\n.calc-out .small{margin-top:12px;font-size:14px}\n@media(max-width:860px){.calc{grid-template-columns:1fr}.calc-in{border-right:none;border-bottom:1px solid var(--rule)}.calc-out{border-radius:0 0 4px 4px}}\n\n\n/* free snapshot */\n.snap{margin-top:20px;background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);border-top:4px solid var(--gold);display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:40px;padding:34px 36px;scroll-margin-top:90px}\n.snap h3{font-size:24px;margin-bottom:10px}\n.snap p{color:var(--ink2);font-size:16px}\n.snap .free{display:inline-block;background:var(--gold);color:#190D3E;font-weight:800;font-size:13px;padding:4px 10px;border-radius:4px;margin-bottom:12px}\n.sf{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:start}\n.sf label{display:block;font-size:14px;font-weight:600;margin-bottom:6px}\n.sf input,.sf select{width:100%;font:500 16px var(--sans);color:var(--ink);background:var(--ground);border:1.5px solid var(--rule);border-radius:8px;padding:13px 14px}\n.sf input:focus,.sf select:focus{outline:none;border-color:var(--brand);background:var(--paper)}\n.sf .full{grid-column:1/-1}\n.sf .btn{width:100%}\n.sf .fine{font-size:13.5px;color:var(--muted);grid-column:1/-1}\n.sent{display:none;grid-column:1/-1;background:var(--tint);border-radius:8px;padding:18px 20px;color:var(--ink2)}\n.sent strong{display:block;font-size:17px;margin-bottom:4px;color:var(--ink)}\n.snap.done .sf>*:not(.sent){display:none}.snap.done .sent{display:block}\n@media(max-width:860px){.snap{grid-template-columns:1fr;gap:22px;padding:26px 22px}.sf{grid-template-columns:1fr}}\n\n/* steps */\n.steps{display:grid;grid-template-columns:repeat(3,1fr);margin-top:40px;border-top:3px solid var(--brand)}\n.step{padding:24px 28px 0 0}\n.step+.step{padding-left:28px;border-left:1px solid var(--rule)}\n.step .when{font-size:14px;color:var(--muted);margin-bottom:10px}\n.step .when b{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--gold);color:#190D3E;font-weight:800;font-size:14px;margin-right:8px}\n.step p{color:var(--ink2);margin-top:10px;font-size:16px}\n@media(max-width:860px){.steps{grid-template-columns:1fr}.step,.step+.step{padding:22px 0;border-left:none;border-bottom:1px solid var(--rule)}}\n\n/* two-col text + list */\n.split{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:64px}\n.dl{border-top:1px solid var(--rule)}\n.dl div{display:grid;grid-template-columns:200px 1fr;gap:24px;padding:20px 0;border-bottom:1px solid var(--rule)}\n.dl dt{font-weight:700}\n.dl dd{color:var(--ink2)}\n@media(max-width:900px){.split{grid-template-columns:1fr;gap:28px}.dl div{grid-template-columns:1fr;gap:4px}}\n\n/* compare */\n.tbl-wrap{margin-top:36px;overflow-x:auto;background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow)}\n.cmp{width:100%;min-width:760px;border-collapse:collapse;font-size:15.5px}\n.cmp th,.cmp td{text-align:left;padding:16px 20px;border-bottom:1px solid var(--rule);vertical-align:top}\n.cmp thead th{font-size:14px;font-weight:600;color:var(--muted)}\n.cmp tbody th{font-weight:600;color:var(--ink);width:170px}\n.cmp td{color:var(--ink2)}\n.cmp tr:last-child>*{border-bottom:none}\n.cmp .us{color:var(--ink);font-weight:700;background:var(--tint);border-left:3px solid var(--brand)}\n.cmp thead .us{color:var(--brand)}\n.foot{font-size:14px;color:var(--muted);margin-top:12px}\n\n/* guarantee note */\n.gnote{color:var(--ink);background:var(--paper);box-shadow:var(--paper-shadow);border-radius:4px;padding:48px 56px;max-width:860px;transform:rotate(-.4deg);position:relative;margin-top:8px}\n.gnote h2{font-size:clamp(28px,3.4vw,40px)}\n.gnote p{color:var(--ink2);max-width:62ch}\n.gnote p+p{margin-top:12px}\n.sig{font-family:var(--hand);color:var(--brand);font-size:34px;margin-top:22px;font-weight:600}\n.sig small{display:block;font-family:var(--sans);font-size:14px;color:var(--muted);margin-top:0}\n@media(max-width:640px){.gnote{padding:32px 24px;transform:none}}\n\n/* pricing */\n.offers{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;margin-top:40px;align-items:start}\n.offer{background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);padding:32px;display:flex;flex-direction:column}\n.offer.first{outline:2px solid var(--brand);outline-offset:-2px}\n.offer .step-l{font-size:14px;color:var(--muted)}\n.offer .step-l b{color:var(--brand)}\n.offer h3{font-size:26px;margin:6px 0 10px}\n.price{font-size:44px;font-weight:900;font-stretch:108%;letter-spacing:-.03em;line-height:1.1}\n.price small{font-size:16px;font-weight:500;color:var(--muted);letter-spacing:0;font-stretch:100%}\n.offer .d{color:var(--ink2);margin:10px 0 18px}\n.ticks{list-style:none;margin-bottom:26px;flex:1}\n.ticks li{padding:6px 0 6px 26px;position:relative;color:var(--ink2);font-size:16px}\n.ticks li::before{content:\"\";position:absolute;left:2px;top:14px;width:12px;height:6px;border-left:2px solid var(--ok);border-bottom:2px solid var(--ok);transform:rotate(-45deg)}\n.plans{margin-top:72px}\n.plans-h{display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap;margin-bottom:18px}\n.plans-h p{color:var(--ink2);max-width:60ch;margin-top:6px}\n.prow{display:grid;grid-template-columns:1.1fr 1.7fr .8fr .8fr auto;gap:24px;align-items:center;padding:22px 0;border-bottom:1px solid var(--rule)}\n.prow.head{padding:10px 0;font-size:14px;color:var(--muted);font-weight:600;border-bottom:3px solid var(--brand)}\n.prow h4{font-size:19px;font-weight:800;font-stretch:105%}\n.prow .for{font-size:14.5px;color:var(--muted)}\n.prow .inc{font-size:15px;color:var(--ink2)}\n.prow .m{font-size:22px;font-weight:800;color:var(--ink)}\n.prow .y{font-size:16px;font-weight:600;color:var(--ink2)}\n.prow.pop{background:var(--tint);margin:0 -16px;padding-left:16px;padding-right:16px;border-radius:6px;border-bottom-color:transparent}\n.prow .tag{display:inline-block;font-size:12.5px;font-weight:700;color:var(--brand);margin-left:8px;font-stretch:100%}\n.prow .btn{padding:11px 16px;font-size:14.5px}\n.pnote{font-size:15px;color:var(--ink2);margin-top:18px}\n@media(max-width:960px){\n  .offers{grid-template-columns:1fr}\n  .prow.head{display:none}\n  .prow{grid-template-columns:1fr 1fr;gap:6px 20px}\n  .prow>div:nth-child(1),.prow>div:nth-child(2){grid-column:1/-1}\n  .prow .m::after{content:\" monthly\";font-size:14px;font-weight:500;color:var(--muted)}\n  .prow .y::after{content:\" yearly rate\";font-size:14px;font-weight:500;color:var(--muted)}\n  .prow .btn{grid-column:1/-1;margin-top:8px}\n}\n\n/* founder */\n.founder{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:64px;align-items:start}\n.founder blockquote{font-size:clamp(21px,2.3vw,26px);line-height:1.45;font-weight:500;letter-spacing:-.01em}\n.founder blockquote p+p{margin-top:18px}\n.who{margin-top:22px;color:var(--muted);font-size:15px}\n.who b{color:var(--ink)}\n.cohort{border-top:3px solid var(--gold);padding-top:22px}\n.cohort h3{font-size:20px;margin-bottom:10px}\n.cohort p{color:var(--ink2);font-size:16px;margin-bottom:18px}\n@media(max-width:900px){.founder{grid-template-columns:1fr;gap:40px}}\n\n/* faq */\n.faq{max-width:840px;margin-top:28px;border-top:1px solid var(--rule)}\ndetails{border-bottom:1px solid var(--rule)}\nsummary{list-style:none;cursor:pointer;padding:22px 40px 22px 0;font-size:19px;font-weight:700;position:relative}\nsummary::-webkit-details-marker{display:none}\nsummary::after{content:\"\";position:absolute;right:6px;top:30px;width:10px;height:10px;border-right:2px solid var(--ink2);border-bottom:2px solid var(--ink2);transform:rotate(45deg);transition:transform .2s}\ndetails[open] summary::after{transform:rotate(-135deg);top:34px}\ndetails p{color:var(--ink2);padding:0 0 24px;max-width:66ch}\n\n.final{padding:120px 0;background:var(--deep);color:var(--on-deep);margin-top:112px}\n.final .lede{color:var(--on-deep2)}\n.final h2{color:#fff}\n.final h2{font-size:clamp(34px,5vw,60px);max-width:18ch}\n.final .lede{margin-bottom:30px}\n\nfooter{background:var(--deep);border-top:1px solid rgba(240,234,255,.12);padding:32px 0;font-size:15px;color:var(--on-deep2)}\nfooter .wrap{display:flex;gap:26px;align-items:center;flex-wrap:wrap}\nfooter .logo{font-size:17px;color:#fff;margin-right:auto}\nfooter a{text-decoration:none}footer a:hover{color:#fff}\n\n@media(max-width:600px){body{font-size:16px}section{padding-top:84px}.wrap{padding:0 16px}.calc-in,.calc-out,.offer{padding:24px}.site{padding:20px 18px 24px}}\n\n/* \u2500\u2500 Sample report page \u2500\u2500 */\n.example-bar{background:var(--gold);color:#190D3E;font-weight:700;font-size:14.5px;padding:10px 0;text-align:center}\n.r-cover{padding:64px 0 24px}\n.r-meta{display:flex;flex-wrap:wrap;gap:8px}\n.r-meta span{background:var(--paper);border:1px solid var(--rule);border-radius:99px;padding:5px 12px;font-size:13.5px;color:var(--ink2);font-weight:500}\n.r-meta span:first-child{background:var(--tint);color:var(--brand);font-weight:700;border-color:transparent}\n.r-cover h1{font-size:clamp(34px,4.6vw,58px);margin:22px 0 20px;max-width:20ch}\n.r-cover .lede{font-size:20px;max-width:62ch}\n.funnel{margin-top:40px;display:flex;align-items:stretch;background:var(--deep);border-radius:12px;padding:26px;gap:8px;color:var(--on-deep);background-image:radial-gradient(rgba(240,234,255,.07) 1px,transparent 1.2px);background-size:18px 18px}\n.f-step{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(240,234,255,.14);border-radius:8px;padding:18px 20px}\n.f-step.hot{background:var(--gold);color:#190D3E;border-color:transparent}\n.f-n{font-size:clamp(28px,3.4vw,40px);font-weight:900;font-stretch:110%;letter-spacing:-.03em;line-height:1}\n.f-l{font-size:14.5px;margin-top:6px;opacity:.85}\n.f-arrow{display:flex;flex-direction:column;justify-content:center;align-items:center;min-width:104px;text-align:center;font-family:var(--hand);color:var(--gold);font-size:21px;line-height:1.1}\n.f-arrow::before{content:\"\";width:34px;height:2px;background:var(--gold);margin-bottom:8px;position:relative}\n.f-arrow small{font-family:var(--sans);font-size:12.5px;color:var(--on-deep2);margin-top:4px}\n.f-note{font-size:14px;color:var(--muted);margin-top:12px}\n@media(max-width:760px){.funnel{flex-direction:column}.f-arrow{flex-direction:row;gap:10px;min-width:0;padding:4px 0}.f-arrow::before{width:2px;height:22px;margin:0 6px 0 0}}\n\n.r-sec{padding-top:88px}\n.sum-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px}\n.sum{background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);padding:24px;border-top:4px solid var(--brand)}\n.sum-n{font-size:clamp(30px,3.6vw,44px);font-weight:900;font-stretch:110%;letter-spacing:-.03em;line-height:1.05}\n.sum-l{color:var(--ink2);margin-top:8px;font-size:15.5px}\n.verdict{margin-top:20px;background:var(--tint);border-left:4px solid var(--brand);border-radius:4px;padding:20px 24px;max-width:860px}\n.verdict p{color:var(--ink2);font-size:17px}\n.verdict strong{color:var(--ink)}\n@media(max-width:760px){.sum-grid{grid-template-columns:1fr}}\n\n.leak-card{margin-top:36px;background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);overflow:hidden}\n.lk-head{display:flex;gap:18px;align-items:flex-start;padding:26px 28px;border-bottom:1px solid var(--rule)}\n.lk-n{flex:none;width:44px;height:44px;border-radius:50%;border:2.5px solid var(--pen);color:var(--pen);font-family:var(--hand);font-size:28px;font-weight:700;display:grid;place-items:center;line-height:1}\n.lk-head h3{font-size:clamp(20px,2.2vw,25px)}\n.lk-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}\n.lk-tags span{font-size:13px;font-weight:600;background:var(--ground);border:1px solid var(--rule);border-radius:99px;padding:4px 11px;color:var(--ink2)}\n.lk-tags span:first-child{background:var(--gold);border-color:transparent;color:#190D3E;font-weight:800}\n.lk-body{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr)}\n.lk-text{padding:26px 28px}\n.lk-text h4{font-size:14px;font-weight:700;color:var(--brand);margin:18px 0 6px}\n.lk-text h4:first-child{margin-top:0}\n.lk-text p{color:var(--ink2)}\n.fixlist{list-style:none}\n.fixlist li{position:relative;padding:5px 0 5px 24px;color:var(--ink2)}\n.fixlist li::before{content:\"\";position:absolute;left:3px;top:13px;width:11px;height:6px;border-left:2px solid var(--ok);border-bottom:2px solid var(--ok);transform:rotate(-45deg)}\n.beforeafter{display:grid;gap:8px}\n.beforeafter div{border-radius:6px;padding:12px 14px;font-weight:600;color:var(--ink)}\n.beforeafter div:first-child{background:var(--ground);text-decoration:line-through;text-decoration-color:var(--pen);color:var(--muted)}\n.beforeafter div:last-child{background:var(--tint)}\n.beforeafter span{display:block;font-size:12.5px;font-weight:700;color:var(--muted);text-decoration:none;margin-bottom:2px}\n@media(max-width:860px){.lk-body{grid-template-columns:1fr}}\n\n/* mini page mock with CSS pen marks */\n.mini{background:var(--deep);padding:22px;background-image:radial-gradient(rgba(240,234,255,.07) 1px,transparent 1.2px);background-size:18px 18px}\n.mini-url{background:#fff;border-radius:4px 4px 0 0;padding:8px 12px;font-size:12px;color:#65598A;border-bottom:1px solid #E3D9F7}\n.mini-site{background:#fff;border-radius:0 0 4px 4px;padding:18px;color:#190D3E;font-size:13.5px}\n.mini-h{font-size:19px;font-weight:800;letter-spacing:-.02em;margin-bottom:10px}\n.mini-h.small{font-size:16px}\n.mini-sub{color:#65598A}\n.mini-plan{border:1px solid #E3D9F7;border-radius:6px;padding:14px;max-width:240px}\n.mini-name{font-weight:700}\n.mini-price{font-size:26px;font-weight:800;margin:6px 0}\n.mini-price small{font-size:12px;color:#65598A;font-weight:500}\n.mini-li{color:#46396B;font-size:12.5px;margin-bottom:10px}\n.mini-btn{display:inline-block;background:#1F7AE0;color:#fff;font-weight:700;border-radius:4px;padding:8px 12px;font-size:12.5px;margin-top:6px}\n.mini-field{border:1px solid #E3D9F7;border-radius:4px;padding:8px 10px;color:#65598A;margin-bottom:6px;font-size:12.5px}\n.circled{position:relative;display:inline-block;padding:0 4px;margin-right:10px}\n.circled::after{content:\"\";position:absolute;inset:-8px -10px;border:2.4px solid var(--brand);border-radius:50%;transform:rotate(-4deg)}\n.struck{text-decoration:line-through;text-decoration-color:var(--brand);text-decoration-thickness:2.5px}\n.pen-note{font-family:var(--hand);color:var(--brand);font-size:20px;line-height:1.15;margin-top:14px;font-weight:600}\n\n.ch-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:30px}\n.ch{background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);padding:26px 28px}\n.ch-n{font-size:13.5px;font-weight:700;color:var(--brand);margin-bottom:6px}\n.ch h3{font-size:22px;margin-bottom:10px}\n.ch p{color:var(--ink2)}\n.ch-first{margin-top:16px;background:var(--tint);border-radius:6px;padding:14px 16px;color:var(--ink2);font-size:15.5px}\n.ch-first b{color:var(--ink)}\n@media(max-width:860px){.ch-grid{grid-template-columns:1fr}}\n\n.content-row{display:grid;grid-template-columns:auto 1fr;gap:40px;align-items:center;margin-top:24px;background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);padding:28px}\n.c-n{font-size:64px;font-weight:900;font-stretch:112%;line-height:1;letter-spacing:-.04em}\n.c-l{color:var(--muted);font-size:14.5px;max-width:12ch}\n.c-bars{display:grid;gap:12px}\n.c-bar{display:grid;grid-template-columns:170px 1fr 40px;gap:14px;align-items:center;font-size:15px;color:var(--ink2)}\n.c-bar i{height:8px;border-radius:99px;background:var(--rule);position:relative;overflow:hidden}\n.c-bar i::after{content:\"\";position:absolute;inset:0 auto 0 0;width:var(--w);background:var(--ok);border-radius:99px}\n.c-bar i.mid::after{background:var(--gold)}\n.c-bar.low i::after{background:#E0445A}\n.c-bar b{color:var(--ink);text-align:right}\n@media(max-width:760px){.content-row{grid-template-columns:1fr;gap:20px}.c-bar{grid-template-columns:1fr 40px}.c-bar i{grid-column:1/-1;grid-row:2}}\n\n.truth{background:var(--deep);color:var(--on-deep);border-radius:12px;padding:40px 44px}\n.truth-l{font-family:var(--hand);color:var(--gold);font-size:30px;font-weight:700;margin-bottom:10px}\n.truth p{font-size:clamp(18px,2vw,22px);line-height:1.5;max-width:62ch;color:#fff}\n@media(max-width:600px){.truth{padding:28px 22px}}\n\n.plan90{display:grid;grid-template-columns:repeat(3,1fr);margin-top:30px;border-top:3px solid var(--brand)}\n.p-col{padding:22px 26px 0 0}\n.p-col+.p-col{padding-left:26px;border-left:1px solid var(--rule)}\n.p-when{display:inline-block;background:var(--gold);color:#190D3E;font-weight:800;font-size:13.5px;border-radius:4px;padding:3px 10px;margin-bottom:10px}\n.p-col h3{margin-bottom:8px}\n@media(max-width:860px){.plan90{grid-template-columns:1fr}.p-col,.p-col+.p-col{padding:20px 0;border-left:0;border-bottom:1px solid var(--rule)}}\n@media print{.nav,.example-bar,.final,footer{display:none}.leak-card,.ch,.sum{box-shadow:none;border:1px solid #ddd}body{background:#fff}}\n\n.saw{margin-top:0;background:var(--deep);color:var(--on-deep);border-radius:0;padding:24px;background-image:radial-gradient(rgba(240,234,255,.07) 1px,transparent 1.2px);background-size:18px 18px}\n.saw-l{font-size:13px;font-weight:700;color:var(--on-deep2);margin-bottom:10px}\n.saw-q{background:#fff;color:#190D3E;border-radius:4px;padding:16px 18px;font-size:16px;line-height:1.5;position:relative}\n.saw-q .struck{text-decoration:line-through;text-decoration-color:var(--brand);text-decoration-thickness:2.5px}\n.saw-where{font-family:var(--hand);color:var(--gold);font-size:22px;margin-top:12px;font-weight:700}\n.prepared{font-size:14px;color:var(--muted);margin-top:14px}\n.lk-body.has-shot{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}\n.saw-page{font-weight:600;color:var(--gold);margin-left:6px}\n.shot{margin:0;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 14px 34px -12px rgba(0,0,0,.6),0 0 0 1px rgba(240,234,255,.12)}\n.shot-bar{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#F1ECFA;border-bottom:1px solid #E3D9F7;font-size:12px;color:#65598A;min-width:0}\n.shot-bar i{flex:none;width:9px;height:9px;border-radius:50%;background:#D6CAEE}\n.shot-bar span{margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.shot img{display:block;width:100%;height:auto}\n.saw-cap{margin-top:14px;font-size:15px;line-height:1.5;color:var(--on-deep);border-left:3px solid var(--gold);padding:4px 0 4px 12px}\n.saw-cap b{color:var(--gold);font-weight:700}\n@media(max-width:860px){.lk-body.has-shot{grid-template-columns:1fr}}\n@media print{.shot{box-shadow:none;border:1px solid #ddd}}\n.next{margin-top:88px}\n";

// Spec v2 additions: the bottleneck, the five checks, the walkthrough timeline, the 30-day plan.
const V2_CSS = `
.f-arrow.hot span{background:var(--gold);color:#190D3E;border-radius:6px;padding:2px 8px;font-family:var(--sans);font-weight:800;font-size:15px}
.f-arrow.hot small{color:var(--gold)}
.f-flag{display:block;font-family:var(--hand);color:var(--gold);font-size:19px;margin-top:4px}
.ev{list-style:none;margin-top:14px;display:grid;gap:8px}
.ev li{background:var(--paper);border-left:3px solid var(--pen);border-radius:4px;padding:10px 14px;color:var(--ink2);box-shadow:var(--paper-shadow)}
.sc{display:inline-block;font-size:12.5px;font-weight:800;border-radius:99px;padding:3px 10px;white-space:nowrap}
.sc-leaking{background:#FDE3E7;color:#A1122B}.sc-weak{background:#FFF1C2;color:#6B4A00}.sc-fine{background:#DDF5E9;color:#0B5E3A}.sc-unknown{background:var(--ground);color:var(--muted);border:1px solid var(--rule)}
.lt td.chk{font-family:var(--sans);font-size:15px;color:var(--ink);font-weight:700;width:auto;padding-top:16px}
.ob{margin-top:28px;background:var(--paper);border-radius:4px;box-shadow:var(--paper-shadow);padding:8px 28px}
.ob-row{display:grid;grid-template-columns:110px 1fr;gap:18px;padding:16px 0;border-bottom:1px solid var(--rule)}
.ob-row:last-child{border-bottom:0}
.ob-when{font-family:var(--hand);color:var(--pen);font-size:22px;font-weight:700;line-height:1.2}
.ob-what{color:var(--ink)}
.ob-prob{color:#A1122B;font-size:15px;margin-top:4px}
.plan90.plan30{grid-template-columns:repeat(4,1fr)}
@media(max-width:860px){.plan90.plan30{grid-template-columns:1fr}.ob-row{grid-template-columns:1fr;gap:4px}}
`;
const CHECK_NAMES: Record<string, string> = {
  positioning: 'Who it is for', channels: 'Where customers come from', signup: 'Visitor to signup',
  paying: 'Signup to paying', keeping: 'Keeping customers and pricing',
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => Math.round(v || 0).toLocaleString('en-US');
const money = (v: number) => {
  const x = Math.round(v || 0);
  return x >= 10000 ? '$' + (x / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + x.toLocaleString('en-US');
};
const range = (lo: number, hi: number, f: (x: number) => string) => (lo === hi ? f(hi) : `${f(lo)}–${f(hi)}`);
const list = (items: string[] = []) => `<ul class="fixlist">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;

export function renderLeakReportHtml(r: LeakAuditReport, opts: { preparedBy?: string } = {}): string {
  const f = r.funnel;
  const t = r.totals;
  const name = r.businessName || r.websiteUrl;
  const domain = String(r.websiteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const date = new Date(r.generatedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const after = f.customers + t.customersHigh > f.customers ? range(f.customers + t.customersLow, f.customers + t.customersHigh, n) : n(f.customers);

  const v2 = (r.version || 0) >= 2;
  const bn = r.bottleneck;
  const hot = (k: string) => (v2 && bn?.key === k ? ' hot' : '');
  const flag = (k: string) => (v2 && bn?.key === k ? '<span class="f-flag">the bottleneck</span>' : '');
  const bottleneckSec = !v2 || !bn ? '' : `
<section class="r-sec" id="bottleneck">
  <div class="wrap">
    <h2>${bn.key === 'traffic' ? 'Your bottleneck: not enough of the right visitors' : `Your bottleneck: ${esc(bn.label.toLowerCase())}`}</h2>
    <div class="sum-grid">
      <div class="sum"><div class="sum-n">${bn.customersHigh > 0 ? range(bn.customersLow, bn.customersHigh, n) : '—'}</div><div class="sum-l">paying customers lost here every month</div></div>
      <div class="sum"><div class="sum-n">${bn.customersHigh > 0 ? range(bn.revenueLow, bn.revenueHigh, money) : '—'}</div><div class="sum-l">monthly revenue that goes with them, at ${money(f.revenuePerCustomer)} per customer</div></div>
      <div class="sum"><div class="sum-n" style="font-size:clamp(22px,2.4vw,30px)">${esc(t.effort || '—')}</div><div class="sum-l">of work for the 3 fixes</div></div>
    </div>
    <div class="verdict"><p><strong>What's happening:</strong> ${esc(bn.whatsHappening || r.verdict)}</p></div>
    ${bn.evidence?.length ? `<ul class="ev">${bn.evidence.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
    <p class="f-note">Low end: you close half the gap to target. High end: all of it.</p>
  </div>
</section>`;
  const ob = r.onboarding;
  const onboardingSec = !v2 || !ob?.done || !ob.timeline?.length ? '' : `
<section class="r-sec" id="onboarding">
  <div class="wrap">
    <h2>What we saw as a new user</h2>
    <p class="lede">${esc(ob.summary || 'We signed up for your product as a real user and noted every step.')}</p>
    <div class="ob">${ob.timeline.map(s => `<div class="ob-row"><div class="ob-when">${esc(s.when)}</div><div><div class="ob-what">${esc(s.what)}</div>${s.problem ? `<div class="ob-prob">${esc(s.problem)}</div>` : ''}</div></div>`).join('')}</div>
  </div>
</section>`;
  const checksSec = !v2 || !r.checks?.length ? '' : `
<section class="r-sec" id="checks">
  <div class="wrap">
    <h2>The five checks</h2>
    <p class="lede">Every step from stranger to paying customer, scored. The report focuses on the worst one; the rest are here so nothing is hidden.</p>
    <div class="ledger"><table class="lt"><thead><tr><th>#</th><th>Check</th><th>Score</th><th>What we found</th></tr></thead><tbody>
      ${r.checks.map((c, i) => `<tr><td>${i + 1}</td><td class="chk">${esc(CHECK_NAMES[c.key] || c.key)}</td><td><span class="sc sc-${esc(c.score)}">${esc(c.score === 'unknown' ? 'not checked' : c.score)}</span></td><td>${esc(c.finding)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
</section>`;
  const p = r.plan || ({} as LeakAuditReport['plan']);
  const plan30Sec = !v2 ? '' : `
<section class="r-sec" id="plan30">
  <div class="wrap">
    <h2>Your 30-day plan</h2>
    <div class="plan90 plan30">
      <div class="p-col"><div class="p-when">Week 1</div>${list(p.week1)}</div>
      <div class="p-col"><div class="p-when">Week 2</div>${list(p.week2)}</div>
      <div class="p-col"><div class="p-when">Week 3</div>${list(p.week3)}</div>
      <div class="p-col"><div class="p-when">Week 4</div>${list(p.week4)}</div>
    </div>
  </div>
</section>`;

  const leakCards = r.leaks.map((l, i) => `
    <article class="leak-card">
      <div class="lk-head">
        <span class="lk-n">${i + 1}</span>
        <div>
          <h3>${esc(l.title)}</h3>
          <div class="lk-tags">${l.customersHigh > 0 ? `<span>+${range(l.customersLow, l.customersHigh, n)} customers a month</span>` : ''}<span>${esc(l.effort)} of work</span><span>${esc(l.where)}</span></div>
        </div>
      </div>
      <div class="lk-body${l.shot ? ' has-shot' : ''}">
        <div class="saw">
          <div class="saw-l">What we saw${l.shot ? ` <span class="saw-page">${esc(pageLabel(l))}</span>` : ''}</div>
          ${l.shot ? `<figure class="shot">
            <div class="shot-bar"><i></i><i></i><i></i><span>${esc(shortUrl(l.shot.url) || pageLabel(l))}</span></div>
            <img src="${l.shot.image}" alt="Screenshot of ${esc(shortUrl(l.shot.url))}${l.shot.highlighted ? ' with the problem circled' : ''}" />
          </figure>` : `<div class="saw-q">${esc(l.whatWeSaw)}</div>`}
          ${l.customersHigh > 0 ? `<div class="saw-where">Costing you about ${range(l.revenueLow, l.revenueHigh, money)} a month</div>` : ''}
        </div>
        <div class="lk-text">
          <h4>What's wrong</h4><p>${esc(l.whatsWrong)}</p>
          <h4>The fix</h4>${list(l.fixes)}
          ${l.before && l.after ? `<div class="beforeafter" style="margin-top:10px"><div><span>Before</span>${esc(l.before)}</div><div><span>After</span>${esc(l.after)}</div></div>` : ''}
          <h4>How you'll know it worked</h4><p>${esc(l.howToKnow)}</p>
        </div>
      </div>
    </article>`).join('');

  const channels = r.channels.map((c, i) => `
      <div class="ch">
        <div class="ch-n">Channel ${i + 1}</div>
        <h3>${esc(c.name)}</h3>
        <p><strong>Who:</strong> ${esc(c.who)}</p>
        <p style="margin-top:8px">${esc(c.why)}</p>
        <div class="ch-first"><b>First step this week:</b> ${esc(c.firstStep)}</div>
      </div>`).join('');

  const content = r.contentSummary ? `
<section class="r-sec" id="content">
  <div class="wrap">
    <h2>Content check</h2>
    ${r.contentScore != null ? `<div class="content-row"><div class="c-score"><div class="c-n">${esc(r.contentScore)}</div><div class="c-l">content score out of 100</div></div><div><p style="color:var(--ink2)">${esc(r.contentSummary)}</p></div></div>` : `<div class="verdict"><p>${esc(r.contentSummary)}</p></div>`}
  </div>
</section>` : '';

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Customer Leak Audit — ${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Caveat:wght@600;700&display=swap" rel="stylesheet">
<style>${REPORT_CSS}${V2_CSS}</style>
</head>
<body>
<header class="r-cover">
  <div class="wrap">
    <div class="r-meta">
      <span>The Customer Leak Audit</span>
      <span>${esc(domain)}</span>
      <span>Reviewed by ${esc(opts.preparedBy || 'Triumph')}</span>
    </div>
    <h1>${esc(name)} gets ${n(f.visitors)} visitors a month. ${n(f.customers)} of them become customers.</h1>
    <p class="lede">${v2 && bn ? (bn.key === 'traffic'
      ? `Your pages convert at or above our targets, so the problem isn't the website. <span class="hl">You need more of the right visitors.</span> Here's who to talk to and where.`
      : `${r.headline ? `<span class="hl">${esc(r.headline)}</span>` : `The ${esc(bn.label.toLowerCase())} step costs you <span class="hl">${range(bn.customersLow, bn.customersHigh, n)} paying customers a month</span>.`} Here's what's happening there, and the 3 fixes.`)
      : t.customersHigh > 0 ? `Three fixes could take that to <span class="hl">${after} new customers a month</span> without spending more on traffic. Here's where they're walking away, and what to change.` : `Your funnel already beats our targets. Here's what to sharpen next, and where your next customers will come from.`}</p>
    <div class="funnel">
      <div class="f-step"><div class="f-n">${n(f.visitors)}</div><div class="f-l">visitors a month</div></div>
      <div class="f-arrow${hot('signup')}"><span>${esc(f.signupRate)}% sign up</span><small>target ${esc(f.targetSignupRate)}%</small>${flag('signup')}</div>
      <div class="f-step"><div class="f-n">${n(f.trials)}</div><div class="f-l">sign-ups or trials</div></div>
      <div class="f-arrow${hot('paid')}"><span>${esc(f.paidRate)}% pay</span><small>target ${esc(f.targetPaidRate)}%</small>${flag('paid')}</div>
      <div class="f-step${v2 ? '' : ' hot'}"><div class="f-n">${n(f.customers)}</div><div class="f-l">new paying customers</div></div>
      ${v2 && f.churnRate != null ? `<div class="f-arrow${hot('churn')}"><span>${esc(f.churnRate)}% cancel</span><small>target ${esc(f.targetChurnRate)}% or less</small>${flag('churn')}</div>
      <div class="f-step"><div class="f-n">${n(f.payingCustomers || 0)}</div><div class="f-l">paying today</div></div>` : ''}
    </div>
    <p class="f-note">Numbers from your intake form. Targets are the rates we treat as realistic for a SaaS at your stage.${v2 && f.churnRate == null ? ' We had no cancellation numbers, so churn is not priced here.' : ''}</p>
  </div>
</header>

${v2 ? bottleneckSec : ''}
<section class="r-sec" id="summary"${v2 ? ' hidden' : ''}>
  <div class="wrap">
    <h2>The short version</h2>
    <div class="sum-grid">
      <div class="sum"><div class="sum-n">${t.customersHigh > 0 ? range(t.customersLow, t.customersHigh, n) : '—'}</div><div class="sum-l">more customers a month from the three fixes</div></div>
      <div class="sum"><div class="sum-n">${t.customersHigh > 0 ? range(t.revenueLow, t.revenueHigh, money) : '—'}</div><div class="sum-l">more monthly revenue, at ${money(f.revenuePerCustomer)} per customer</div></div>
      <div class="sum"><div class="sum-n" style="font-size:clamp(22px,2.4vw,30px)">${esc(t.effort || '—')}</div><div class="sum-l">of work to make all three fixes</div></div>
    </div>
    <div class="verdict"><p><strong>Our read:</strong> ${esc(r.verdict)}</p></div>
  </div>
</section>

<section class="r-sec" id="leaks">
  <div class="wrap">
    <h2>${v2 ? 'The 3 fixes' : 'Where you lose customers'}</h2>
    <p class="lede">${v2 ? (bn && bn.key !== 'traffic' ? `All three go after the ${esc(bn.label.toLowerCase())} step. Ranked by how many customers each one wins back. Start at the top.` : 'All three go after getting more of the right visitors. Start at the top.') : 'Ranked by how many customers each one costs. Start at the top.'}</p>
    ${leakCards}
  </div>
</section>
${v2 ? onboardingSec + checksSec : ''}

<section class="r-sec" id="channels">
  <div class="wrap">
    <h2>Where your next customers will come from</h2>
    <p class="lede">Once the leaks are fixed, more traffic is worth paying for. These two channels fit who buys from you.</p>
    <div class="ch-grid">${channels}</div>
  </div>
</section>
${content}
<section class="r-sec" id="truth">
  <div class="wrap">
    <div class="truth"><div class="truth-l">The uncomfortable truth</div><p>${esc(r.uncomfortableTruth)}</p></div>
  </div>
</section>

${v2 ? plan30Sec : ''}
<section class="r-sec" id="plan"${v2 ? ' hidden' : ''}>
  <div class="wrap">
    <h2>The 90-day plan</h2>
    <div class="plan90">
      <div class="p-col"><div class="p-when">Weeks 1–2</div><h3>Stop the leaks</h3>${list(r.plan?.weeks1to2)}</div>
      <div class="p-col"><div class="p-when">Month 1</div><h3>Measure and adjust</h3>${list(r.plan?.month1)}</div>
      <div class="p-col"><div class="p-when">Month 3</div><h3>Add new customers</h3>${list(r.plan?.month3)}</div>
    </div>
  </div>
</section>

<section class="final next">
  <div class="wrap">
    <h2>Want us to make these fixes for you?</h2>
    <p class="lede">Reply to this email and we'll build them with you. The $297 you paid for this audit comes off a Growth System Sprint or any monthly plan. Questions about this report are included for 7 days.</p>
    <div class="actions"><a href="mailto:hello@titanleap.co?subject=${encodeURIComponent('Fixes for ' + name)}" class="btn btn-gold">Reply to TitanLeap</a></div>
    <p class="prepared" style="color:var(--on-deep2)">Prepared by TitanLeap for ${esc(name)} on ${esc(date)}.</p>
  </div>
</section>
</body>
</html>`;
}
