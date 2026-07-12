"""
checklist.py — TitanLeap 12-Point Audit Engine
================================================
Scores a prospect's site across 3 sections (12 checks total).
Input:  enrichment dict from tools/enrich_audit.py (read-only import).
Output: scored checklist + top-3 leaks ranked by money_impact × fixability.

Scoring scale per check:
  "red"    — critical blocker
  "yellow" — weak / partially present
  "green"  — solid, no action needed

Top-3 selection:
  opportunity_score = recovery_rate × (5 - fixability_hours_bucket) × weight
  Only red/yellow checks qualify as leaks. Sorted descending, top 3 selected.

Dollar math uses the same CONFIG pattern as tools/resolver.py (read-only reference).
"""

from __future__ import annotations
from datetime import date
from typing import Any

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOLLAR-MATH CONFIG (mirrors tools/resolver.py — kept here so /audit-engine
# is self-contained; do NOT modify the original)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MONEY_CONFIG: dict[str, Any] = {
    "monthly_traffic":  500,    # assumed uniques when no signal available
    "cta_intent_rate":  0.03,   # 3% of visitors with real purchase intent
    "default_price":    297,    # fallback if no pricing found on site

    # Recovery fraction per check_id — how much addressable revenue comes back if fixed.
    # Formula: addressable = traffic × intent × price
    #          mid  = addressable × recovery
    #          low  = mid × 0.60  |  high = mid × 1.40
    "recovery": {
        # Section A — Messaging
        "value_prop_clarity":      0.18,
        "headline_cta_alignment":  0.12,
        "proof_signals":           0.08,
        "mobile_integrity":        0.14,
        # Section B — Signup → Activation
        "signup_friction":         0.60,   # peak-intent intercept, matches dead_ctas
        "time_to_value":           0.10,
        "empty_state_onboarding":  0.07,
        "activation_email":        0.12,
        # Section C — Monetization / Retention
        "pricing_clarity":         0.15,   # matches no_pricing
        "free_paid_path":          0.10,
        "reengagement_catch":      0.10,   # matches missing_pixel logic
        "analytics_tracking":      0.10,
    },
}


def _detect_price(enrichment: dict) -> int:
    import re
    prices = enrichment.get("offer", {}).get("price_points_found", [])
    nums = [int(re.sub(r"[^\d]", "", p)) for p in prices if re.sub(r"[^\d]", "", p)]
    if nums:
        return min(nums)
    return MONEY_CONFIG["default_price"]


def _dollar_range(check_id: str, enrichment: dict) -> dict:
    traffic  = MONEY_CONFIG["monthly_traffic"]
    intent   = MONEY_CONFIG["cta_intent_rate"]
    recovery = MONEY_CONFIG["recovery"].get(check_id, 0.08)
    price    = _detect_price(enrichment)

    addressable = traffic * intent * price
    mid  = addressable * recovery
    low  = max(1, round(mid * 0.60))
    high = round(mid * 1.40)
    return {"low": low, "high": high, "mid": round(mid)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 12-POINT CHECK DEFINITIONS
# Each entry: id, section, name, weight (1–3), fixability (1=hard, 5=easy),
#             check_fn (enrichment → {score, evidence, finding, fix, effort, timing})
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _check_value_prop(e: dict) -> dict:
    basics = e.get("business_basics", {})
    tagline = (basics.get("tagline") or "").strip()
    desc    = (basics.get("what_they_sell") or "").strip()

    if not tagline and not desc:
        return {
            "score": "red",
            "evidence": "No H1 headline or meta description found on the homepage.",
            "finding": "No clear value proposition is visible to cold traffic.",
            "fix": "Write an H1 that answers: what do you do, for whom, and with what result — in one sentence.",
            "effort": "2–4 hrs", "timing": "This week",
        }
    if len(tagline) > 120 or not desc:
        return {
            "score": "yellow",
            "evidence": f"Headline found ({len(tagline)} chars) but either too long or missing supporting description.",
            "finding": "The value proposition exists but may not pass a 5-second read.",
            "fix": "Tighten the headline to ≤10 words. Add a single-sentence sub-headline below it.",
            "effort": "1–2 hrs", "timing": "This week",
        }
    return {
        "score": "green",
        "evidence": f"Headline present ({len(tagline)} chars) with supporting description.",
        "finding": "Value proposition is visible and reasonably clear.",
        "fix": None, "effort": None, "timing": None,
    }


def _check_headline_cta(e: dict) -> dict:
    basics   = e.get("business_basics", {})
    funnel   = e.get("funnel", {})
    headline = (basics.get("tagline") or "").lower()
    cta      = (funnel.get("primary_cta") or "").lower()

    if not headline or not cta:
        return {
            "score": "red",
            "evidence": f"Headline: {'missing' if not headline else repr(headline[:60])} | CTA: {'missing' if not cta else repr(cta[:40])}",
            "finding": "Can't evaluate alignment — one or both elements are absent.",
            "fix": "Ensure both an H1 headline and a visible primary CTA exist on the homepage.",
            "effort": "2–4 hrs", "timing": "This week",
        }
    # Simple alignment heuristic: check for shared intent words
    intent_words = {"get", "start", "try", "build", "grow", "launch", "book", "join"}
    h_words = set(headline.split())
    c_words = set(cta.split())
    overlap = h_words & c_words | (h_words & intent_words) & (c_words & intent_words)
    if not overlap:
        return {
            "score": "yellow",
            "evidence": f"Headline says '{headline[:60]}…' but CTA says '{cta[:40]}'.",
            "finding": "Headline and CTA feel disconnected — they promise different things.",
            "fix": "Make the CTA the natural next step of the headline promise. If headline = 'Grow your audience' → CTA = 'Start Growing Free'.",
            "effort": "1 hr", "timing": "This week",
        }
    return {
        "score": "green",
        "evidence": f"Headline and CTA share intent direction.",
        "finding": "Headline and CTA are reasonably aligned.",
        "fix": None, "effort": None, "timing": None,
    }


def _check_proof_signals(e: dict) -> dict:
    # enrich_audit doesn't scrape testimonials directly — infer from leaks_detected
    # and common signals. We flag absence as yellow (can't confirm from public scrape).
    leaks_raw  = e.get("leaks_detected", [])
    has_video  = e.get("content_ads", {}).get("video_on_page", False)
    has_blog   = e.get("content_ads", {}).get("blog_detected", False)
    # No direct testimonial signal in the enrichment schema → flag as yellow/needs-call
    if not has_video and not has_blog:
        return {
            "score": "yellow",
            "evidence": "No video, no blog detected — common trust carriers absent from public scrape.",
            "finding": "Trust signals (testimonials, case studies, social proof) could not be confirmed.",
            "fix": "Add 2–3 concrete client outcomes to the homepage: name, result, time-frame. Video testimonial converts 2× over text.",
            "effort": "4–8 hrs", "timing": "This week",
        }
    return {
        "score": "yellow",  # can't fully confirm from scrape
        "evidence": "Partial trust signals detected (video or blog present) — testimonials not verifiable via scrape.",
        "finding": "Some content present but social proof (client results) not confirmed.",
        "fix": "Place 3 named client outcomes on the homepage above the fold. Format: [Name] → [Outcome] in [Timeframe].",
        "effort": "2–4 hrs", "timing": "This week",
    }


def _check_mobile_integrity(e: dict) -> dict:
    # enrich_audit doesn't check mobile directly; dead CTAs are a strong proxy
    funnel   = e.get("funnel", {})
    dead     = funnel.get("dead_ctas", 0)
    cta_cnt  = funnel.get("cta_count", 0)
    if dead and cta_cnt and dead >= max(1, cta_cnt // 2):
        return {
            "score": "red",
            "evidence": f"{dead}/{cta_cnt} CTAs resolve to # — on mobile these register as taps to nowhere.",
            "finding": "Dead CTAs are a mobile-integrity failure — tap targets go nowhere.",
            "fix": "Fix all href='#' CTAs. Test on a real phone (not dev-tools). Check tap-target sizes ≥ 44×44px.",
            "effort": "1–3 hrs", "timing": "Today",
        }
    return {
        "score": "yellow",
        "evidence": "Mobile integrity not fully verifiable via scrape — manual check recommended.",
        "finding": "Viewport tag present but full mobile UX (tap targets, scroll, font sizes) not confirmed.",
        "fix": "Run the site through Google's Mobile-Friendly Test. Fix any tap-target warnings.",
        "effort": "1–2 hrs", "timing": "This week",
    }


def _check_signup_friction(e: dict) -> dict:
    funnel   = e.get("funnel", {})
    dead     = funnel.get("dead_ctas", 0)
    cta_cnt  = funnel.get("cta_count", 0)
    if dead > 0:
        return {
            "score": "red",
            "evidence": f"{dead} CTA button{'s' if dead > 1 else ''} resolve to # — visitors who decide to sign up literally cannot.",
            "finding": "Sign-up is broken at peak intent. This is the single most expensive leak on the site.",
            "fix": "Point every CTA at the live checkout or intake form. Verify each one in incognito on both desktop and mobile.",
            "effort": "~30 min", "timing": "Do this first, today",
        }
    if cta_cnt == 0:
        return {
            "score": "red",
            "evidence": "No CTAs detected on the page.",
            "finding": "No call-to-action — there's no path from interest to conversion.",
            "fix": "Add at least one primary CTA above the fold. Make the desired action unmissable.",
            "effort": "1–2 hrs", "timing": "Today",
        }
    return {
        "score": "green",
        "evidence": f"{cta_cnt} CTAs detected, none dead.",
        "finding": "Sign-up path is functional.",
        "fix": None, "effort": None, "timing": None,
    }


def _check_time_to_value(e: dict) -> dict:
    offer    = e.get("offer", {})
    has_free = offer.get("free_entry_offer", False)
    prices   = offer.get("price_points_found", [])
    tiers    = len(prices)

    if not has_free and tiers <= 1:
        return {
            "score": "yellow",
            "evidence": f"No free trial/audit detected. {tiers} price point(s) found.",
            "finding": "No low-friction entry offer — cold traffic faces full commitment on first visit.",
            "fix": "Add a free audit, trial, or low-cost entry offer ($27–$97 range) that delivers an aha moment fast.",
            "effort": "4–8 hrs", "timing": "This week",
        }
    if has_free:
        return {
            "score": "green",
            "evidence": "Free trial or free entry offer detected.",
            "finding": "Low-friction entry exists.",
            "fix": None, "effort": None, "timing": None,
        }
    return {
        "score": "yellow",
        "evidence": f"{tiers} pricing tier(s) found, no free entry.",
        "finding": "Multiple tiers but no free entry — consider a lead magnet or free audit.",
        "fix": "Add a free entry product or audit. Even a free PDF/template reduces first-contact friction.",
        "effort": "2–4 hrs", "timing": "This week",
    }


def _check_empty_state(e: dict) -> dict:
    # Public scrape can't verify empty-state UX (requires auth). Flag as yellow always.
    return {
        "score": "yellow",
        "evidence": "Empty-state onboarding not verifiable from a public scrape — requires authenticated session.",
        "finding": "New-user empty state and onboarding flow not reviewed.",
        "fix": "Map the new-user journey from sign-up to first value moment. Add tooltips or a checklist to the empty dashboard state.",
        "effort": "4–8 hrs", "timing": "This sprint",
    }


def _check_activation_email(e: dict) -> dict:
    basics  = e.get("business_basics", {})
    has_email = bool(basics.get("contact_email"))
    # Can't confirm sequence from public scrape
    if not has_email:
        return {
            "score": "yellow",
            "evidence": "No contact email detected on site.",
            "finding": "No visible email capture — activation email sequence can't be confirmed.",
            "fix": "Add email capture to key pages. Build a 3-email welcome sequence: (1) welcome + quick win, (2) proof, (3) offer.",
            "effort": "4–6 hrs", "timing": "This week",
        }
    return {
        "score": "yellow",
        "evidence": "Email present but activation sequence not verifiable via public scrape.",
        "finding": "Email exists but post-signup nurture sequence not confirmed.",
        "fix": "Verify a 3+ email welcome sequence is active. First email should deliver value within 5 minutes of sign-up.",
        "effort": "2–4 hrs", "timing": "This week",
    }


def _check_pricing_clarity(e: dict) -> dict:
    offer = e.get("offer", {})
    prices = offer.get("price_points_found", [])
    pricing_page = offer.get("pricing_page")

    if not prices and not pricing_page:
        return {
            "score": "red",
            "evidence": "No price points found anywhere on the site. No /pricing page detected.",
            "finding": "Pricing is completely invisible — warm buyers self-select out rather than book a call.",
            "fix": "Add pricing to the homepage hero or create a /pricing page. Even 'starting from $X' is enough to stop the bleed.",
            "effort": "2–4 hrs", "timing": "This week",
        }
    if prices and len(prices) >= 1:
        return {
            "score": "green",
            "evidence": f"Price point(s) found: {', '.join(prices[:3])}",
            "finding": "Pricing is visible.",
            "fix": None, "effort": None, "timing": None,
        }
    return {
        "score": "yellow",
        "evidence": "Pricing page detected but no price points scraped — may be gated or JS-rendered.",
        "finding": "Pricing page exists but visibility not confirmed.",
        "fix": "Ensure pricing is server-rendered (not JS-only) so it's visible immediately on load.",
        "effort": "1–2 hrs", "timing": "This week",
    }


def _check_free_paid_path(e: dict) -> dict:
    offer  = e.get("offer", {})
    prices = offer.get("price_points_found", [])
    import re
    nums = [int(re.sub(r"[^\d]", "", p)) for p in prices if re.sub(r"[^\d]", "", p)]
    has_free  = offer.get("free_entry_offer", False)
    has_tiers = len(nums) >= 2

    if not has_free and not has_tiers:
        return {
            "score": "yellow",
            "evidence": f"{len(nums)} price point(s) found, no free offer, no clear tier ladder.",
            "finding": "No visible free→paid path — cold traffic faces a single high-commitment option.",
            "fix": "Build an offer ladder: free entry → low-ticket → core offer → retainer. Each step should feel like a natural next move.",
            "effort": "4–8 hrs", "timing": "This sprint",
        }
    if has_free and has_tiers:
        return {
            "score": "green",
            "evidence": "Free entry + multiple pricing tiers detected.",
            "finding": "Free→paid path appears structured.",
            "fix": None, "effort": None, "timing": None,
        }
    return {
        "score": "yellow",
        "evidence": f"Partial: free={has_free}, tiers={has_tiers}.",
        "finding": "Free→paid path is incomplete.",
        "fix": "Add whichever is missing: a free entry product or a clear paid tier above the core offer.",
        "effort": "2–4 hrs", "timing": "This week",
    }


def _check_reengagement(e: dict) -> dict:
    pixels = e.get("content_ads", {}).get("tracking_pixels", [])
    if not pixels:
        return {
            "score": "red",
            "evidence": "No tracking pixel detected (Meta, GA4, etc.).",
            "finding": "No retargeting possible — every bounce is a permanent loss. Can't re-engage churned users either.",
            "fix": "Install Meta Pixel + GA4 via GTM. Fire purchase + lead events on thank-you pages. Build a retargeting audience immediately.",
            "effort": "2–4 hrs", "timing": "This week",
        }
    return {
        "score": "green",
        "evidence": f"Pixels found: {', '.join(pixels)}",
        "finding": "Retargeting/re-engagement infrastructure is in place.",
        "fix": None, "effort": None, "timing": None,
    }


def _check_analytics(e: dict) -> dict:
    pixels = e.get("content_ads", {}).get("tracking_pixels", [])
    ga_present = any("analytics" in p.lower() or "ga" in p.lower() for p in pixels)
    if not pixels:
        return {
            "score": "red",
            "evidence": "No analytics or tracking pixels detected.",
            "finding": "Flying blind — no data on what visitors do, what converts, or where they drop off.",
            "fix": "Install GA4 via GTM as a minimum. Add conversion events on all key actions. Review weekly.",
            "effort": "2–4 hrs", "timing": "This week",
        }
    if not ga_present:
        return {
            "score": "yellow",
            "evidence": f"Ad pixel found ({', '.join(pixels)}) but no Google Analytics / GA4 detected.",
            "finding": "Ad retargeting exists but no behavioural analytics — can't track funnel drop-off.",
            "fix": "Add GA4 for behavioural analytics. Pair it with the existing pixel for a full picture.",
            "effort": "1–2 hrs", "timing": "This week",
        }
    return {
        "score": "green",
        "evidence": f"Analytics + pixel in place: {', '.join(pixels)}",
        "finding": "Tracking is solid.",
        "fix": None, "effort": None, "timing": None,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECKLIST REGISTRY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHECKLIST: list[dict] = [
    # ── Section A: Messaging (highest weight)
    {"id": "value_prop_clarity",     "section": "A", "name": "Value-prop 5-sec clarity",       "weight": 3, "fixability": 4, "fn": _check_value_prop},
    {"id": "headline_cta_alignment", "section": "A", "name": "Headline ↔ CTA alignment",        "weight": 3, "fixability": 4, "fn": _check_headline_cta},
    {"id": "proof_signals",          "section": "A", "name": "Proof / trust signals",            "weight": 2, "fixability": 3, "fn": _check_proof_signals},
    {"id": "mobile_integrity",       "section": "A", "name": "Mobile-first integrity",           "weight": 2, "fixability": 4, "fn": _check_mobile_integrity},
    # ── Section B: Signup → Activation (second weight)
    {"id": "signup_friction",        "section": "B", "name": "Signup friction",                  "weight": 3, "fixability": 5, "fn": _check_signup_friction},
    {"id": "time_to_value",          "section": "B", "name": "Time-to-value / aha moment",       "weight": 2, "fixability": 3, "fn": _check_time_to_value},
    {"id": "empty_state_onboarding", "section": "B", "name": "Empty-state onboarding",           "weight": 1, "fixability": 2, "fn": _check_empty_state},
    {"id": "activation_email",       "section": "B", "name": "Activation email sequence",        "weight": 2, "fixability": 3, "fn": _check_activation_email},
    # ── Section C: Monetization / Retention (sets up retainer)
    {"id": "pricing_clarity",        "section": "C", "name": "Pricing clarity",                  "weight": 3, "fixability": 4, "fn": _check_pricing_clarity},
    {"id": "free_paid_path",         "section": "C", "name": "Free → paid path",                 "weight": 2, "fixability": 3, "fn": _check_free_paid_path},
    {"id": "reengagement_catch",     "section": "C", "name": "Re-engagement / churn catch",      "weight": 2, "fixability": 4, "fn": _check_reengagement},
    {"id": "analytics_tracking",     "section": "C", "name": "Analytics / tracking visibility",  "weight": 2, "fixability": 5, "fn": _check_analytics},
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN PUBLIC API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORE_VALUE = {"red": 0, "yellow": 1, "green": 2}


def run_checklist(enrichment: dict) -> list[dict]:
    """
    Run all 12 checks against an enrichment dict.
    Returns list of check result dicts (all 12, scored).
    """
    results = []
    for check in CHECKLIST:
        result = check["fn"](enrichment)
        dr     = _dollar_range(check["id"], enrichment)

        # opportunity_score: how much value fixing this unlocks
        # higher when: score is red (0), weight is high, fixability is high
        score_int   = SCORE_VALUE[result["score"]]
        opportunity = (2 - score_int) * check["weight"] * check["fixability"] * dr["mid"]

        results.append({
            "id":           check["id"],
            "section":      check["section"],
            "name":         check["name"],
            "weight":       check["weight"],
            "fixability":   check["fixability"],
            "score":        result["score"],
            "evidence":     result["evidence"],
            "finding":      result["finding"],
            "fix":          result["fix"],
            "effort":       result["effort"],
            "timing":       result["timing"],
            "monthly_loss_low":  dr["low"]  if result["score"] != "green" else 0,
            "monthly_loss_high": dr["high"] if result["score"] != "green" else 0,
            "opportunity":  opportunity,
        })
    return results


def top3_leaks(checklist_results: list[dict]) -> list[dict]:
    """
    From 12 scored checks, select the 3 with highest opportunity score.
    Only red/yellow qualify as leaks. Returns ranked list (rank 1 = biggest $).
    """
    leakable = [r for r in checklist_results if r["score"] in ("red", "yellow")]
    leakable.sort(key=lambda x: x["opportunity"], reverse=True)
    top = leakable[:3]
    for i, leak in enumerate(top, start=1):
        leak["rank"] = i
        leak["severity"] = "high" if leak["score"] == "red" else "med"
    return top


def build_template_vars(enrichment: dict, leaks: list[dict]) -> dict:
    """
    Build the full Jinja2 template variable dict that revenue_leak_audit.j2 expects.
    Matches the schema from tools/resolver.py (read-only reference) exactly.
    """
    domain = enrichment.get("domain", enrichment.get("source_url", "your-site.com"))
    today  = date.today().strftime("%B %-d, %Y")
    pages  = enrichment.get("pages_reviewed",
                            1 + (1 if enrichment.get("offer", {}).get("pricing_page") else 0))

    # Uncomfortable truth — driven by top leak
    if leaks:
        top   = leaks[0]
        truth_h = {
            "value_prop_clarity":     "Visitors can't tell what you sell in 5 seconds.",
            "headline_cta_alignment": "Your headline and your CTA are pulling in different directions.",
            "proof_signals":          "Visitors want to trust you — but you're giving them nothing to trust.",
            "mobile_integrity":       "Your buy button doesn't work on mobile.",
            "signup_friction":        "Your sign-up is broken at the exact moment people want to buy.",
            "time_to_value":          "Cold traffic has to commit before they've seen any value.",
            "empty_state_onboarding": "New users arrive to a blank screen with no guidance.",
            "activation_email":       "You're getting sign-ups and then going silent.",
            "pricing_clarity":        "You're filtering out your warmest buyers by hiding the price.",
            "free_paid_path":         "There's no easy path from curious to committed.",
            "reengagement_catch":     "Every visitor who bounces is gone forever.",
            "analytics_tracking":     "You're making every growth decision completely blind.",
        }.get(top["id"], "The funnel is leaking revenue at a fixable point.")
        truth_body = f"{domain} has a {top['name'].lower()} problem. {top['finding']} This isn't a traffic problem — it's a conversion problem that compounds every month you don't fix it."
        truth_sub  = f"— Based on live inspection of {domain}"
    else:
        truth_h    = "No critical leaks detected."
        truth_body = f"{domain} passed all 12 checks. The fundamentals are solid — now it's time to optimise and scale."
        truth_sub  = f"— TitanLeap Audit · {today}"

    # Leak cards — map to j2 template schema
    template_leaks = []
    for lk in leaks:
        template_leaks.append({
            "rank":              lk["rank"],
            "title":             lk["name"],
            "location":          f"Section {lk['section']} — {lk['name']}",
            "severity":          lk["severity"],
            "description":       lk["finding"],
            "monthly_loss_low":  lk["monthly_loss_low"],
            "monthly_loss_high": lk["monthly_loss_high"],
            "cost_assumptions":  f"Assumes ~{MONEY_CONFIG['monthly_traffic']:,} monthly visitors, {int(MONEY_CONFIG['cta_intent_rate']*100)}% CTA intent, ${_detect_price(enrichment):,} offer price.",
            "fix_text":          lk["fix"] or "Implement the recommended fix above.",
            "fix_effort":        lk["effort"] or "2–4 hrs",
            "fix_timing":        lk["timing"] or "This week",
        })

    total_low  = sum(l["monthly_loss_low"]  for l in leaks)
    total_high = sum(l["monthly_loss_high"] for l in leaks)

    # This week's moves — 1:1 with leaks
    week_moves = [
        {
            "rank":          lk["rank"],
            "title":         f"Fix: {lk['name']}",
            "body":          lk["fix"] or "Implement the recommended fix.",
            "recovers_leak": f"Recovers Leak {lk['rank']:02d}",
            "effort":        lk["effort"] or "2–4 hrs",
        }
        for lk in leaks
    ]

    return {
        "prospect_domain":              domain,
        "audit_date":                   today,
        "pages_reviewed":               pages,
        "leak_count":                   len(leaks),
        "uncomfortable_truth_headline": truth_h,
        "uncomfortable_truth":          truth_body,
        "truth_subtext":                truth_sub,
        "leaks":                        template_leaks,
        "total_low":                    f"${total_low:,}",
        "total_high":                   f"${total_high:,}",
        "total_caption": (
            f"Conservative. Based on ~{MONEY_CONFIG['monthly_traffic']:,} estimated monthly visitors "
            f"and a ${_detect_price(enrichment):,} offer price. Primary fix recovers the most."
        ),
        "week_moves":  week_moves,
        "cta_headline": "Ready to close these leaks?",
        "cta_body": (
            "We built this audit to show you exactly where revenue is escaping. "
            "The Growth System Sprint closes every leak we found — "
            "and builds the machine that keeps compounding after."
        ),
        "cta_url": "https://titanleapagency.gumroad.com/l/fxift",
        "footer_dis": (
            "Dollar ranges are directional estimates based on observed funnel structure "
            "and typical conversion benchmarks, not guarantees. "
            "Your actual numbers depend on traffic quality and offer fit."
        ),
    }
