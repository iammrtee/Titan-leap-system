// Money-path maths for the audit. Pure functions, no I/O.
// Inputs are the prospect's own numbers (price, conversion rate) and measured market data.
// Anything we had to assume is returned in `assumptions` so the report can show it.

export interface MarketData {
  skipped?: boolean;
  reason?: string;
  demand?: { keyword: string; monthlySearches: number | null; cpc: number | null; trend?: { monthly?: number; quarterly?: number; yearly?: number } | null } | null;
  visibility?: { ranksOnPage1: boolean; position: number | null; topResults: { position: number; title: string; link: string }[] } | null;
  trust?: { competitors: { name: string; domain: string; rating: number | null; reviews: number | null }[]; own: { name: string; rating: number | null; reviews: number | null } | null } | null;
}

// Rough share of searches that click each organic position. Deliberately conservative.
const CTR_BY_POSITION = (pos: number | null) =>
  pos == null ? 0 : pos === 1 ? 0.28 : pos === 2 ? 0.15 : pos === 3 ? 0.1 : pos <= 10 ? 0.03 : 0;

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export interface Opportunity {
  low: number;
  high: number;
  assumptions: string[];
}

/** Monthly revenue they are not capturing from Google demand, from their own price + conversion. */
export function marketOpportunity(
  market: MarketData | null | undefined,
  form: { pricePoint?: string; conversionRate?: string },
): Opportunity | null {
  const searches = market?.demand?.monthlySearches;
  const price = num(form.pricePoint);
  if (!searches || !price) return null;

  const assumptions: string[] = [];
  let conv = num(form.conversionRate) / 100;
  if (!conv) {
    conv = 0.02;
    assumptions.push('No conversion rate given, so 2% of visitors buying is assumed.');
  } else {
    assumptions.push(`Uses your stated ${(conv * 100).toFixed(1)}% conversion rate.`);
  }
  assumptions.push(`Uses your price of ${price.toLocaleString()}.`);

  const current = CTR_BY_POSITION(market?.visibility?.position ?? null);
  const targetLow = 0.1; // roughly a steady top-3 organic presence
  const targetHigh = 0.2;
  assumptions.push(
    `Reaching top-3 on Google is assumed to win ${targetLow * 100}–${targetHigh * 100}% of ${searches.toLocaleString()} monthly searches.`,
  );
  if (current > 0) assumptions.push(`They already rank #${market!.visibility!.position}, worth about ${Math.round(current * 100)}% today, so that is subtracted.`);

  const gap = (t: number) => Math.max(0, t - current) * searches * conv * price;
  const low = Math.round(gap(targetLow));
  const high = Math.round(gap(targetHigh));
  if (high <= 0) return null; // already capturing the demand: no measured gap to report
  return { low, high, assumptions };
}

export type SpeedVerdict = 'fast' | 'slow' | 'very-slow' | 'no-reply' | 'unknown';

export interface SpeedToLead {
  verdict: SpeedVerdict;
  minutes: number | null;
  label: string;
  followUps: number | null;
  followUpNote: string;
}

const fmtDuration = (m: number) => {
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 60 * 48) return `${(m / 60).toFixed(1).replace(/\.0$/, '')} hours`;
  return `${Math.round(m / 60 / 24)} days`;
};

/** Mystery-shop result from the three form fields. Returns null when nothing was logged. */
export function speedToLead(f: { shopEnquiredAt?: string; shopRepliedAt?: string; shopFollowUps?: string }): SpeedToLead | null {
  if (!f.shopEnquiredAt) return null;
  const sent = new Date(f.shopEnquiredAt).getTime();
  if (!Number.isFinite(sent)) return null;
  const fu = f.shopFollowUps === '' || f.shopFollowUps == null ? null : Math.max(0, Math.round(num(f.shopFollowUps)));
  const followUpNote =
    fu == null ? '' : fu === 0 ? 'No follow-up arrived after the first reply.' : `${fu} follow-up${fu > 1 ? 's' : ''} in 7 days.`;

  if (!f.shopRepliedAt) {
    const waited = (Date.now() - sent) / 60000;
    return {
      verdict: 'no-reply',
      minutes: null,
      label: waited > 0 ? `No reply after ${fmtDuration(waited)}` : 'No reply yet',
      followUps: fu,
      followUpNote,
    };
  }
  const replied = new Date(f.shopRepliedAt).getTime();
  if (!Number.isFinite(replied) || replied < sent) return null;
  const minutes = (replied - sent) / 60000;
  return {
    verdict: minutes <= 15 ? 'fast' : minutes <= 24 * 60 ? 'slow' : 'very-slow',
    minutes,
    label: `Replied in ${fmtDuration(minutes)}`,
    followUps: fu,
    followUpNote,
  };
}
