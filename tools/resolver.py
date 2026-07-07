"""
resolver.py — TitanLeap Deliverable Engine
==========================================
Single entry point: resolve(form_data, enrichment) → one dict
that feeds BOTH the Revenue Leak Audit and the 90-Day Roadmap.

Never call the templates directly. Always go through resolve() first
so the two documents are guaranteed consistent.

Dollar-math config lives at the TOP of this file. Edit it,
regenerate — both documents update automatically.
"""

from __future__ import annotations
import re
from datetime import date
from typing import Any


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOLLAR-MATH CONFIG — edit this block only
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONFIG: dict[str, Any] = {
    # Assumed monthly unique visitors when no traffic signal is available.
    "monthly_traffic": 500,

    # % of visitors who reach a primary CTA with genuine purchase intent.
    "cta_intent_rate": 0.03,   # 3 %

    # Fallback offer price if none is detected on the site.
    "default_price": 297,

    # Recovery fraction per leak type.
    # Meaning: if fixed, this fraction of (traffic × intent × price) comes back.
    # Formula:
    #   addressable = traffic × cta_intent_rate × price
    #   mid  = addressable × recovery[type]
    #   low  = round(mid × 0.60)
    #   high = round(mid × 1.40)
    "recovery": {
        "dead_ctas":     0.60,   # peak-intent intercept — highest recovery
        "missing_pixel": 0.10,   # can't retarget bounces without pixel
        "dead_social":   0.05,   # broken social → trust hole → exit
        "no_pricing":    0.15,   # visitors self-select out without pricing
        "no_blog":       0.04,   # zero organic content surface
    },

    # Severity badge per type → "high" renders red, "med" renders gold.
    "severity": {
        "dead_ctas":     "high",
        "missing_pixel": "med",
        "dead_social":   "med",
        "no_pricing":    "med",
        "no_blog":       "med",
    },
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOLLAR MATH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _detect_price(form_data: dict, enrichment: dict, config: dict) -> int:
    """Use prospect's stated price; fall back to config default."""
    price_str = str(form_data.get("pricePoint") or "").strip()
    price_str = re.sub(r"[^\d.]", "", price_str)
    try:
        p = int(float(price_str))
        if p > 0:
            return p
    except (ValueError, TypeError):
        pass
    return config["default_price"]


def compute_range(leak_type: str, form_data: dict, enrichment: dict,
                  config: dict = CONFIG) -> dict:
    """Return {low, high, mid, assumption} for a given leak type."""
    traffic  = config["monthly_traffic"]
    intent   = config["cta_intent_rate"]
    recovery = config["recovery"].get(leak_type, 0.08)
    price    = _detect_price(form_data, enrichment, config)

    addressable = traffic * intent * price
    mid  = addressable * recovery
    low  = max(1, round(mid * 0.60))
    high = round(mid * 1.40)

    assumption = (
        f"Assumes ~{traffic:,} monthly visitors, "
        f"{int(intent * 100)}% reaching CTA intent, "
        f"${price:,} offer price. "
        f"At {int(recovery * 100)}% recovery this leak is worth "
        f"${low:,}–${high:,}/mo."
    )
    return {"low": low, "high": high, "mid": round(mid), "assumption": assumption}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LEAK DETECTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Catalog: type → (title, location, description template, fix_text, effort, timing)
_LEAK_CATALOG: dict[str, dict] = {
    "dead_ctas": {
        "title":    "Dead CTA buttons",
        "location": "Homepage · pricing page · primary offer CTA",
        "description": (
            "Your primary call-to-action button either goes nowhere, "
            "throws a 404, or lands on a page that can't convert. "
            "<strong>Visitors who reach a CTA already have intent — "
            "killing that moment costs full addressable revenue, not a fraction of it.</strong>"
        ),
        "fix_text": (
            "Audit every CTA link across homepage, pricing page, and any "
            "linked landing page. Fix broken URLs, confirm checkout loads, "
            "verify mobile tap targets aren't overlapping."
        ),
        "fix_effort": "1–4 hrs",
        "fix_timing": "This week",
    },
    "missing_pixel": {
        "title":    "Missing retargeting pixel",
        "location": "Site-wide — head tag",
        "description": (
            "No pixel means every visitor who bounces is gone forever — "
            "you can't retarget, lookalike, or attribute. "
            "<strong>Paid traffic you've already bought is single-use "
            "instead of a compounding asset.</strong>"
        ),
        "fix_text": (
            "Install Meta Pixel (or Google Tag) via GTM. Add purchase "
            "and lead events on thank-you pages so paid campaigns can "
            "optimise toward real buyers, not just clicks."
        ),
        "fix_effort": "2–4 hrs",
        "fix_timing": "This week",
    },
    "dead_social": {
        "title":    "Broken social links",
        "location": "Footer · header nav social icons",
        "description": (
            "Social links resolve to placeholder # or a 404. "
            "Every visitor who clicks to vet you hits a dead end. "
            "<strong>Trust holes like this don't just lose that visitor — "
            "they poison the whole purchase decision.</strong>"
        ),
        "fix_text": (
            "Update every social href to the live profile URL. "
            "Open each link in an incognito window to confirm it resolves. "
            "Remove any platforms you're not actually active on — "
            "a missing link is cleaner than a broken one."
        ),
        "fix_effort": "30 min",
        "fix_timing": "Today",
    },
    "no_pricing": {
        "title":    "No visible pricing",
        "location": "Site-wide — no /pricing or price mention found",
        "description": (
            "Visitors can't find what your offer costs. "
            "Buyers who are ready to pay will self-select out rather than "
            "book a call just to get a number. "
            "<strong>Hidden pricing is a conversion filter that skims off "
            "your warmest prospects.</strong>"
        ),
        "fix_text": (
            "Add a pricing section to your homepage or a dedicated /pricing page. "
            "Even 'starting from $X' or a price range reduces friction. "
            "If pricing is truly bespoke, show a case-study ROI number instead — "
            "give people an anchor."
        ),
        "fix_effort": "2–6 hrs",
        "fix_timing": "This week",
    },
    "no_blog": {
        "title":    "No content engine",
        "location": "Site-wide — no blog or content section detected",
        "description": (
            "Zero blog or content section means zero organic surface area. "
            "Every potential customer searching problems you solve finds "
            "a competitor instead. "
            "<strong>Content is the only acquisition channel that compounds "
            "— you're skipping it entirely.</strong>"
        ),
        "fix_text": (
            "Publish one foundational post targeting your prospect's "
            "top search intent — the problem they Google before they "
            "realise they need you. Make it the definitive answer. "
            "That's the seed of your content engine."
        ),
        "fix_effort": "4–8 hrs",
        "fix_timing": "This week",
    },
}

def _detect_leaks(enrichment: dict, form_data: dict, config: dict = CONFIG) -> list[dict]:
    """
    Map enrichment signals → ranked list of max 3 leaks by dollar impact.
    Each leak dict carries all fields needed by revenue_leak_audit.j2.
    """
    signals = enrichment.get("signals", enrichment)  # enrich_audit.py top-level OR nested

    present: list[tuple[str, int]] = []  # (leak_type, mid_dollar)

    checks = {
        "dead_ctas":     signals.get("dead_ctas")     or signals.get("has_dead_ctas"),
        "missing_pixel": signals.get("missing_pixel") or signals.get("no_pixel"),
        "dead_social":   signals.get("dead_social")   or signals.get("has_dead_social"),
        "no_pricing":    signals.get("no_pricing")    or not signals.get("has_pricing", True),
        "no_blog":       signals.get("no_blog")       or not signals.get("has_blog", True),
    }

    for leak_type, detected in checks.items():
        if detected:
            r = compute_range(leak_type, form_data, enrichment, config)
            present.append((leak_type, r["mid"]))

    # Sort by dollar impact descending, cap at 3
    present.sort(key=lambda x: x[1], reverse=True)
    top3 = present[:3]

    leaks = []
    for rank, (leak_type, _) in enumerate(top3, start=1):
        cat = _LEAK_CATALOG[leak_type]
        r   = compute_range(leak_type, form_data, enrichment, config)
        leaks.append({
            "rank":             rank,
            "type":             leak_type,
            "title":            cat["title"],
            "location":         cat["location"],
            "description":      cat["description"],
            "fix_text":         cat["fix_text"],
            "fix_effort":       cat["fix_effort"],
            "fix_timing":       cat["fix_timing"],
            "severity":         config["severity"].get(leak_type, "med"),
            "monthly_loss_low":  r["low"],
            "monthly_loss_high": r["high"],
            "cost_assumptions":  r["assumption"],
        })

    return leaks


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNCOMFORTABLE TRUTH GENERATOR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _build_truth(form_data: dict, enrichment: dict, leaks: list[dict]) -> tuple[str, str, str]:
    """
    Returns (uncomfortable_truth_headline, uncomfortable_truth, truth_subtext)
    Specific to the prospect — uses their top leak + form data.
    """
    domain = enrichment.get("domain", form_data.get("websiteUrl", "your site"))
    biz    = form_data.get("businessName") or domain

    if not leaks:
        return (
            f"The revenue is there. It's just escaping.",
            f"{biz} has traffic. The offers exist. But the funnel isn't built to catch buyers — "
            f"it's built to inform them and hope. Hope is not a conversion strategy.",
            "— Your TitanLeap audit",
        )

    top = leaks[0]
    headline_map = {
        "dead_ctas":     f"Your buy button doesn't work.",
        "missing_pixel": f"You're buying traffic you can only use once.",
        "dead_social":   f"Visitors are vetting you and hitting dead ends.",
        "no_pricing":    f"You're filtering out your warmest buyers.",
        "no_blog":       f"Every search for your solution finds a competitor.",
    }
    body_map = {
        "dead_ctas": (
            f"{biz} has a broken primary CTA. Visitors who reach that button have "
            f"already decided they're interested — you're losing them at the exact "
            f"moment they were ready to pay. That's not a traffic problem. "
            f"It's a tap that's been left running."
        ),
        "missing_pixel": (
            f"{biz} is spending money to bring visitors in with no way to bring "
            f"them back. Without a retargeting pixel, every bounce is a permanent "
            f"loss. You're renting attention instead of building a list of warm buyers."
        ),
        "dead_social": (
            f"Three places on {biz} link to social profiles that don't exist or go "
            f"nowhere. Before any buyer converts, they vet you — and right now that "
            f"vetting process hits a wall. Broken links don't just cost you a click; "
            f"they cost you the conversion that was coming after it."
        ),
        "no_pricing": (
            f"{biz} has no visible pricing. Buyers who are ready to pay won't book "
            f"a discovery call just to ask the cost — they'll find someone who tells "
            f"them. You're not being strategic by hiding the number. "
            f"You're just losing the people who already want to buy."
        ),
        "no_blog": (
            f"{biz} has no content. Every day, potential customers search the exact "
            f"problems you solve — and find competitors instead. Content is the only "
            f"acquisition channel that compounds. You're sitting out of it entirely."
        ),
    }

    headline   = headline_map.get(top["type"], f"The funnel is leaking.")
    body       = body_map.get(top["type"], f"{biz} has a revenue leak that compounds every month you don't fix it.")
    subtext    = f"— Based on live inspection of {domain}"

    return headline, body, subtext


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# THIS WEEK'S MOVES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_MOVE_BODIES = {
    "dead_ctas": (
        "Open your site on mobile + desktop. Click every CTA. "
        "Fix every broken link, dead anchor, or checkout error you find. "
        "This is literally leaving money in a broken vending machine."
    ),
    "missing_pixel": (
        "Install your Meta Pixel (or Google Tag) via GTM. "
        "Fire a ViewContent event on key pages, a Lead event on form submissions, "
        "and a Purchase event on thank-you. "
        "Verify with Pixel Helper. Now paid traffic compounds."
    ),
    "dead_social": (
        "Update every social link on the site to the live profile URL. "
        "Test each one in incognito. Remove any platform you're not active on — "
        "a missing icon is better than a broken link."
    ),
    "no_pricing": (
        "Add a pricing section to your homepage or create /pricing. "
        "Even a range or a 'starts at' number is enough to stop the bleed. "
        "If pricing is bespoke, anchor with a case-study ROI or typical investment range."
    ),
    "no_blog": (
        "Identify the one question your best client asked before they hired you. "
        "Write the definitive answer — 800–1,200 words, no fluff. "
        "Publish it. That's the seed of your content engine."
    ),
}

def _build_week_moves(leaks: list[dict]) -> list[dict]:
    """Build This Week's Moves — 1:1 with leaks, same order."""
    moves = []
    for leak in leaks:
        cat = _LEAK_CATALOG[leak["type"]]
        moves.append({
            "rank":          leak["rank"],
            "title":         f"Fix: {cat['title']}",
            "body":          _MOVE_BODIES.get(leak["type"], cat["fix_text"]),
            "recovers_leak": f"Recovers Leak {leak['rank']:02d}",
            "effort":        cat["fix_effort"],
        })
    return moves


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROADMAP PHASE BUILDER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _build_phases(leaks: list[dict]) -> list[dict]:
    """
    Phases 2 + 3 are static. Phase 1 is prospect-specific:
    Items A + B come from the top two detected leaks.
    Item C (instrument) is always static.
    """
    phase1_items = []

    for i, leak in enumerate(leaks[:2]):
        ic    = chr(65 + i)   # "A", "B"
        cat   = _LEAK_CATALOG[leak["type"]]
        phase1_items.append({
            "ic":    ic,
            "title": cat["title"].capitalize(),
            "body":  cat["fix_text"],
        })

    phase1_items.append({
        "ic":    chr(65 + len(phase1_items)),
        "title": "Instrument everything",
        "body":  (
            "Pixels, GA4, event tracking on every key action. "
            "From here on, every decision is made on data, not vibes."
        ),
    })

    phase1_goal = (
        "We stop the bleeding before we add anything new. "
        "<strong>Every dollar you're already spending should convert "
        "before we spend a new one.</strong>"
    )
    if leaks:
        phase1_goal = (
            f"We fix the {len(leaks)} leak{'s' if len(leaks) > 1 else ''} "
            f"bleeding ~${leaks[0]['monthly_loss_low']:,}–"
            f"${sum(l['monthly_loss_high'] for l in leaks):,}/mo before adding anything new. "
            f"<strong>Every dollar you're already spending should convert "
            f"before we spend a new one.</strong>"
        )

    phase1_milestone = "Funnel is fixed, tracked, and converting the traffic you already have."
    if leaks:
        phase1_milestone = (
            f"{len(leaks)} leak{'s' if len(leaks) > 1 else ''} closed, "
            f"pixel live, every action tracked. "
            f"You're now converting traffic you were previously losing."
        )

    return [
        {
            "number":       1,
            "day_range":    "Days 1–30",
            "title":        "Foundation &amp; Fix",
            "goal":         phase1_goal,
            "work_items":   phase1_items,
            "milestone_day": 30,
            "milestone":    phase1_milestone,
        },
        {
            "number":       2,
            "day_range":    "Days 31–60",
            "title":        "Build &amp; Launch",
            "goal": (
                "Now that the foundation holds, we build the engine that brings people in. "
                "<strong>Content, ads, and funnels designed to work together — "
                "not three disconnected efforts.</strong>"
            ),
            "work_items": [
                {
                    "ic":    "A",
                    "title": "Content engine live",
                    "body":  (
                        "A founder-led content system across your primary channel, "
                        "built on four pillars — teach, prove, build, provoke — "
                        "so you're known for something, not just posting."
                    ),
                },
                {
                    "ic":    "B",
                    "title": "Paid acquisition tested",
                    "body":  (
                        "Small, controlled ad tests pointed at the now-working funnel. "
                        "We find what converts before scaling spend, not after."
                    ),
                },
                {
                    "ic":    "C",
                    "title": "Offer ladder in place",
                    "body":  (
                        "A clear path from low-risk entry offer up to retainer — "
                        "so cold visitors have a cheap front door instead of "
                        "bouncing off your highest price."
                    ),
                },
            ],
            "milestone_day": 60,
            "milestone": (
                "Traffic is flowing in, the offer ladder is converting, "
                "and you can see exactly what's working."
            ),
        },
        {
            "number":       3,
            "day_range":    "Days 61–90",
            "title":        "Automate &amp; Scale",
            "goal": (
                "The system works — now we take you out of the loop and pour fuel on the winners. "
                "<strong>Growth that doesn't depend on your daily attention.</strong>"
            ),
            "work_items": [
                {
                    "ic":    "A",
                    "title": "AI lead flow automated",
                    "body":  (
                        "Lead capture, scoring, and qualification handled by automated pipelines. "
                        "Hot leads surface to you; the rest get nurtured without manual work."
                    ),
                },
                {
                    "ic":    "B",
                    "title": "Double down on what converts",
                    "body":  (
                        "We cut what didn't work and scale spend behind the channels "
                        "and content that produced real buyers. Data decides, not opinion."
                    ),
                },
                {
                    "ic":    "C",
                    "title": "Handover-ready system",
                    "body":  (
                        "Documented, automated, and running. You own a growth machine — "
                        "not a dependency on an agency that disappears when you stop paying."
                    ),
                },
            ],
            "milestone_day": 90,
            "milestone": "A self-running growth system: leads in, automated, scaling behind proven winners.",
        },
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN RESOLVER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def resolve(form_data: dict, enrichment: dict, config: dict = CONFIG) -> dict:
    """
    Merge intake form answers + enrichment signals → one resolved object.

    Returns a flat dict with every variable both templates need.
    render.py splits it into audit_vars / roadmap_vars before template rendering.
    """
    domain     = enrichment.get("domain") or _clean_domain(form_data.get("websiteUrl", ""))
    today      = date.today().strftime("%B %-d, %Y")
    pages      = enrichment.get("pages_reviewed", 5)
    leaks      = _detect_leaks(enrichment, form_data, config)
    truth_h, truth, truth_sub = _build_truth(form_data, enrichment, leaks)
    week_moves = _build_week_moves(leaks)
    phases     = _build_phases(leaks)

    total_low  = sum(l["monthly_loss_low"]  for l in leaks)
    total_high = sum(l["monthly_loss_high"] for l in leaks)

    total_caption = (
        f"Based on ~{config['monthly_traffic']:,} monthly visitors, "
        f"{int(config['cta_intent_rate'] * 100)}% CTA intent rate, "
        f"${_detect_price(form_data, enrichment, config):,} offer price. "
        f"Directional — not a guarantee."
    )

    thesis_text = (
        "Most agencies sell you <span class=\"hl\">activity</span> — "
        "more posts, more ads, more noise. We build the "
        "<span class=\"hl\">machine</span> underneath it: fix what's leaking, "
        "build what converts, then automate it so it runs without you babysitting it."
    )

    roadmap_lede = (
        "Not a campaign you run once and forget. "
        "A system that gets built, instrumented, and automated — "
        "so growth keeps compounding after the 90 days end."
    )
    if leaks:
        roadmap_lede = (
            f"Starts by closing the {len(leaks)} revenue leak{'s' if len(leaks) > 1 else ''} "
            f"we found on {domain}. "
            f"Then builds the engine that keeps compounding after the 90 days end."
        )

    cta_url = "https://titanleapagency.gumroad.com/l/fxift"

    return {
        # ── shared
        "prospect_domain": domain,
        "audit_date":      today,
        "pages_reviewed":  pages,

        # ── audit template vars
        "uncomfortable_truth_headline": truth_h,
        "uncomfortable_truth":          truth,
        "truth_subtext":                truth_sub,
        "leak_count":                   len(leaks),
        "leaks":                        leaks,
        "total_low":                    f"${total_low:,}",
        "total_high":                   f"${total_high:,}",
        "total_caption":                total_caption,
        "week_moves":                   week_moves,
        "cta_headline":   "Ready to stop the bleeding?",
        "cta_body":       (
            "We built this report to show you exactly where revenue is escaping. "
            "The Growth System Sprint closes every leak we found — "
            "and builds the machine that keeps compounding after."
        ),
        "cta_url":        cta_url,
        "footer_dis":     (
            "Dollar ranges are directional estimates based on observed funnel structure "
            "and typical conversion benchmarks, not guarantees. "
            "Your actual numbers depend on traffic quality and offer fit."
        ),

        # ── roadmap template vars
        "roadmap_lede":   roadmap_lede,
        "thesis":         thesis_text,
        "phases":         phases,
        "outcome_cards": [
            {"n": "0",    "title": "Dead ends in your funnel",   "body": "Every path from visitor to buyer works and is tracked."},
            {"n": "1",    "title": "Content engine running",     "body": "A repeatable system producing demand, not one-off posts."},
            {"n": "∞",    "title": "Automated lead flow",        "body": "Capture and qualification that runs without your attention."},
            {"n": "100%", "title": "Owned, not rented",          "body": "The system stays yours — documented and handover-ready."},
        ],
        "cta_headline":     "Want to see where your 90 days would start?",
        "cta_body": (
            "It starts with the audit — we find your three biggest leaks "
            "and what they're costing you. That's the first move in the roadmap above."
        ),
        "cta_btn":          "Get your Revenue Leak Audit",
        "cta_alt":          "Or book a call to talk through the full 90 days",
        "cta_alt_url":      "#",
        "cta_fine":         "$297 · delivered in 5 business days",
        "roadmap_footer_dis": (
            "TitanLeap builds growth systems — not campaigns. "
            "The roadmap above is the standard arc; "
            "exact work is scoped to your funnel after the audit."
        ),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _clean_domain(url: str) -> str:
    url = url.strip().lower()
    url = re.sub(r"^https?://", "", url)
    url = re.sub(r"/.*$", "", url)
    return url or "your-site.com"
