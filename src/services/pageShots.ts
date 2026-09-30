// Real screenshots for the Customer Leak Audit's "What we saw" panel.
//
// Uses @sparticuz/chromium (a compact Chrome that ships inside npm, built for small
// servers) driven by puppeteer. Everything here is best-effort: any failure returns
// nothing and the report falls back to the text quote, so a screenshot problem can
// never break a paid report.
import puppeteer, { type Browser, type Page } from 'puppeteer';

export type ShotRequest = { id: string; url: string; quote?: string };
export type Shot = { image: string; url: string; highlighted: boolean };

const VIEW = { width: 1280, height: 800 };
const CLIP_H = 720;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// One browser at a time: the free Render instance has ~512MB, so runs are queued.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function launch(): Promise<Browser> {
  const chromium = (await import('@sparticuz/chromium')).default as any;
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      ...(chromium.args || []),
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--hide-scrollbars', '--mute-audio', `--window-size=${VIEW.width},${VIEW.height}`,
    ],
    defaultViewport: VIEW,
  });
}

const normUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

async function openPage(browser: Browser, url: string): Promise<Page | null> {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport(VIEW);
  await page.setRequestInterception(true);
  page.on('request', req => {
    const t = req.resourceType();
    if (t === 'media' || t === 'websocket' || t === 'eventsource') req.abort().catch(() => {});
    else req.continue().catch(() => {});
  });
  try {
    const resp = await page.goto(normUrl(url), { waitUntil: 'networkidle2', timeout: 20000 });
    if (resp && resp.status() >= 400) { await page.close().catch(() => {}); return null; }
  } catch (e: any) {
    // Unreachable site: no screenshot. Slow or chatty site: use whatever has rendered.
    if (/net::ERR_|ERR_NAME|ERR_CONNECTION/i.test(String(e?.message))) { await page.close().catch(() => {}); return null; }
    try { await page.waitForSelector('body', { timeout: 3000 }); } catch { await page.close().catch(() => {}); return null; }
  }
  await new Promise(r => setTimeout(r, 700));
  // Remove cookie/consent banners and chat bubbles so they don't cover the evidence.
  await page.evaluate(`(() => {
    var bad = /(cookie|consent|gdpr|onetrust|cmp-|truste|privacy-banner|intercom|drift|crisp|hubspot-messages|zendesk|tidio)/i;
    Array.prototype.forEach.call(document.querySelectorAll('body *'), function (el) {
      var cs = getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && (bad.test(el.id) || bad.test(String(el.className)) || (/cookie/i.test(el.innerText || '') && (el.innerText || '').length < 800))) el.remove();
    });
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
  })()`).catch(() => {});
  return page;
}

// Find the smallest visible element containing the quote (or a 5-word piece of it),
// draw TitanLeap's pen mark around it, and return where it is on the page.
// In-page code is kept as a plain string: TS runners (tsx/esbuild) inject helper
// calls into compiled functions, and those helpers don't exist inside the page.
const MARK_QUOTE_JS = `(q) => {
  var norm = function (s) { return String(s).toLowerCase().replace(/[‘’“”'"\x60]/g, '').replace(/[–—]/g, '-').replace(/\\s+/g, ' ').trim(); };
  var words = norm(q).split(' ').filter(Boolean);
  var needles = [norm(q)];
  if (words.length > 6) {
    var mid = Math.floor(words.length / 2);
    needles.push(words.slice(0, 5).join(' '), words.slice(-5).join(' '), words.slice(mid - 2, mid + 3).join(' '));
  }
  var els = Array.prototype.filter.call(document.querySelectorAll('body *'), function (el) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|svg)$/.test(el.tagName)) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  for (var n = 0; n < needles.length; n++) {
    var needle = needles[n];
    if (needle.length < 8) continue;
    var best = null, bestLen = Infinity;
    for (var i = 0; i < els.length; i++) {
      var t = norm(els[i].innerText || '');
      if (t.length < bestLen && t.indexOf(needle) !== -1) { best = els[i]; bestLen = t.length; }
    }
    if (best) {
      var r = best.getBoundingClientRect();
      var top = r.top + window.scrollY, left = r.left + window.scrollX, pad = 10;
      var mark = document.createElement('div');
      mark.setAttribute('data-titanleap-mark', '1');
      var st = mark.style;
      st.position = 'absolute'; st.left = Math.max(2, left - pad) + 'px'; st.top = Math.max(2, top - pad) + 'px';
      st.width = Math.min(r.width + pad * 2, document.documentElement.scrollWidth - 4) + 'px'; st.height = (r.height + pad * 2) + 'px';
      st.border = '4px solid #6B21E8'; st.borderRadius = '14px'; st.background = 'rgba(245,197,24,.16)';
      st.boxShadow = '0 0 0 4px rgba(255,255,255,.85), 0 8px 30px rgba(107,33,232,.35)'; st.zIndex = '2147483647'; st.pointerEvents = 'none';
      document.body.appendChild(mark);
      return { top: top, height: r.height, left: left, width: r.width };
    }
  }
  return null;
}`;

// Find the smallest visible element containing the quote (or a 5-word piece of it),
// draw TitanLeap's pen mark around it, and return where it is on the page.
type Hit = { top: number; height: number; left: number; width: number };
async function markQuote(page: Page, quote: string): Promise<Hit | null> {
  return page.evaluate(`(${MARK_QUOTE_JS})(${JSON.stringify(quote)})`) as Promise<Hit | null>;
}

// With a circled element, crop to a 1000px-wide frame around it so the client's text
// reads larger in the report; otherwise show the full-width top of the page.
async function capture(page: Page, hit: Hit | null): Promise<string> {
  const w = hit ? 1000 : VIEW.width;
  const h = hit ? 640 : CLIP_H;
  const top = hit ? hit.top - Math.max(70, Math.min(200, (h - hit.height) / 3)) : 0;
  const x = hit ? Math.round(Math.max(0, Math.min(VIEW.width - w, hit.left + hit.width / 2 - w / 2))) : 0;
  const docH = Number(await page.evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)')) || h;
  const y = Math.max(0, Math.round(Math.min(top, Math.max(0, docH - h))));
  await page.evaluate(`window.scrollTo(0, ${y})`);
  await new Promise(r => setTimeout(r, 400)); // lazy-loaded images
  const buf = await page.screenshot({ type: 'jpeg', quality: 62, clip: { x, y, width: w, height: h }, captureBeyondViewport: true });
  return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
}

export function captureEvidence(requests: ShotRequest[], overallTimeoutMs = 75000): Promise<Record<string, Shot>> {
  const work = exclusive(async () => {
    const out: Record<string, Shot> = {};
    const valid = requests.filter(r => r.url && r.url.trim());
    if (!valid.length) return out;
    let browser: Browser | null = null;
    try {
      browser = await launch();
      const byUrl = new Map<string, ShotRequest[]>();
      for (const r of valid) byUrl.set(normUrl(r.url), [...(byUrl.get(normUrl(r.url)) || []), r]);
      for (const [url, reqs] of byUrl) {
        const page = await openPage(browser, url).catch(() => null);
        if (!page) continue;
        for (const r of reqs) {
          try {
            await page.evaluate(`Array.prototype.forEach.call(document.querySelectorAll('[data-titanleap-mark]'), function (e) { e.remove(); })`);
            const hit = r.quote ? await markQuote(page, r.quote) : null;
            out[r.id] = { image: await capture(page, hit), url, highlighted: !!hit };
          } catch (e: any) {
            console.warn('[PageShots] shot failed:', url, e?.message || e);
          }
        }
        await page.close().catch(() => {});
      }
    } catch (e: any) {
      console.warn('[PageShots] browser unavailable:', e?.message || e);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
    return out;
  });
  const timeout = new Promise<Record<string, Shot>>(res => setTimeout(() => res({}), overallTimeoutMs));
  return Promise.race([work, timeout]);
}

// Rendered text for pages a plain fetch can't read (JS-built sites, bot walls).
export function renderPagesText(urls: string[], limit = 7000): Promise<Record<string, string>> {
  return exclusive(async () => {
    const out: Record<string, string> = {};
    let browser: Browser | null = null;
    try {
      browser = await launch();
      for (const u of urls.filter(Boolean)) {
        const page = await openPage(browser, u).catch(() => null);
        if (!page) continue;
        try {
          const text = String(await page.evaluate(`'TITLE: ' + document.title + '\\n' + document.body.innerText.replace(/\\s+/g, ' ')`));
          if (text && text.length > 200) out[u] = text.slice(0, limit);
        } catch { /* skip */ }
        await page.close().catch(() => {});
      }
    } catch (e: any) {
      console.warn('[PageShots] render text failed:', e?.message || e);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
    return out;
  });
}
