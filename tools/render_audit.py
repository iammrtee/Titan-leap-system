#!/usr/bin/env python3
"""
TitanLeap Revenue Leak Audit Renderer
======================================
Takes enrichment JSON (from enrich_audit.py) → renders a populated
Revenue Leak Audit HTML report per prospect.

Usage:
    # Scrape + render in one step:
    python render_audit.py https://someprospect.com

    # Use pre-scraped enrichment JSON:
    python render_audit.py --enriched out.json

    # Save to a file:
    python render_audit.py https://someprospect.com --save prospect-report.html

Dependencies:
    pip install jinja2 requests beautifulsoup4
"""

import json
import sys
import argparse
from datetime import date
from pathlib import Path

try:
    from jinja2 import Environment, FileSystemLoader
except ImportError:
    sys.exit("Missing: pip install jinja2")


# ─────────────────────────────────────────────────────────────────────────────
#  DOLLAR-MATH CONFIG
#  Edit these constants — they live here, not buried in the math functions.
# ─────────────────────────────────────────────────────────────────────────────
CONFIG = {
    # Baseline monthly traffic estimate when no data is available.
    # Override per-prospect by passing traffic= to compute_leak_range().
    "monthly_traffic": 500,

    # % of visitors who reach a primary CTA with real purchase intent.
    "cta_intent_rate": 0.03,          # 3%

    # Default offer price in USD if none is detected on the site.
    "default_price": 297,

    # Recovery %: what fraction of the estimated addressable revenue
    # comes back when EACH specific leak type is fixed.
    # Source: directional benchmarks — adjust to match your client data.
    "recovery": {
        "dead_ctas":      0.60,   # Broken CTA buttons — peak-intent intercept
        "missing_pixel":  0.10,   # No tracking pixel → can't retarget bounces
        "dead_social":    0.05,   # Social links → placeholder # → trust hole
        "no_pricing":     0.15,   # Pricing invisible → visitors self-select out
        "no_blog":        0.04,   # No content engine → zero organic surface
    },

    # Severity per leak type — drives the badge colour in the report.
    "severity": {
        "dead_ctas":     "high",
        "missing_pixel": "med",
        "dead_social":   "med",
        "no_pricing":    "med",
        "no_blog":       "med",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
#  DOLLAR-RANGE MATH
# ─────────────────────────────────────────────────────────────────────────────
def compute_leak_range(leak_type: str, enrichment: dict, config: dict = CONFIG) -> dict:
    """
    Derive a monthly-loss dollar range for one leak type.

    Formula:
        addressable = traffic × intent_rate × price
        mid         = addressable × recovery[leak_type]
        low         = mid × 0.6   (pessimistic bound)
        high        = mid × 1.4   (optimistic bound)

    All constants come from CONFIG so assumptions are auditable.

    Returns:
        { low: int, high: int, assumption: str }
    """
    traffic  = config["monthly_traffic"]
    intent   = config["cta_intent_rate"]
    recovery = config["recovery"].get(leak_type, 0.08)

    # Use detected price if the scraper found one; else fall back to default.
    offer       = enrichment.get("offer", {})
    price_strs  = offer.get("price_points_found", [])
    price       = config["default_price"]
    if price_strs:
        import re
        nums = [int(re.sub(r"[^\d]", "", p)) for p in price_strs if re.sub(r"[^\d]", "", p)]
        if nums:
            price = min(nums)          # use entry-level price (most likely conversion point)

    addressable = traffic * intent * price
    mid  = addressable * recovery
    low  = round(mid * 0.6)
    high = round(mid * 1.4)

    assumption = (
        f"Assumes ~{traffic:,} monthly visitors, "
        f"{int(intent * 100)}% reaching CTA intent, "
        f"${price:,} offer price. "
        f"Loss scales directly with your actual traffic volume."
    )
    return {"low": low, "high": high, "assumption": assumption}


# ─────────────────────────────────────────────────────────────────────────────
#  LEAK COPY TEMPLATES
#  Human-readable strings for each detectable leak type.
#  Keep prose here; logic lives in detect_leaks().
# ─────────────────────────────────────────────────────────────────────────────
LEAK_COPY = {
    "dead_ctas": {
        "title":      "Dead CTA anchors ({count} button{plural} → href=\"#\")",
        "location":   "Homepage · primary buttons → href=\"#\"",
        "description": (
            'Every "{label}" button resolves to <strong>#</strong>, which scrolls '
            "the user nowhere instead of opening your intake or checkout. A visitor "
            "who decides to buy literally cannot. This is the single most expensive "
            "bug on the site because it intercepts people at peak intent."
        ),
        "fix":        (
            'Point every CTA at the live checkout or intake form. '
            'One find-and-replace on <code>href="#"</code>.'
        ),
        "effort":     "~30 min",
        "timing":     "Do this first, today",
    },
    "missing_pixel": {
        "title":      "No tracking pixel on key pages",
        "location":   "Sitewide · no Meta / GA4 event fires on CTA",
        "description": (
            "There's no conversion pixel firing on intake or checkout, so you're "
            "<strong>flying blind on every dollar of paid traffic</strong>. "
            "You can't retarget the 97% who bounce, and you can't tell which channel "
            "actually produces buyers — so spend gets allocated on vibes, not data."
        ),
        "fix":        (
            "Drop the Meta Pixel + GA4 in <code>&lt;head&gt;</code> and fire a "
            "purchase event on the checkout return URL. Build one retargeting audience."
        ),
        "effort":     "~2 hrs",
        "timing":     "This week",
    },
    "dead_social": {
        "title":      "Social links point to placeholders",
        "location":   "Footer / nav · social icons → href=\"#\"",
        "description": (
            "Social links for {platforms} go to a placeholder <strong>#</strong> anchor. "
            "Visitors who want to vet your brand before buying hit a dead end — "
            "it reads as an unfinished site even if the rest of the page is polished."
        ),
        "fix":        "Replace each placeholder with the real profile URL. Five minutes per platform.",
        "effort":     "~15 min",
        "timing":     "Do this today",
    },
    "no_pricing": {
        "title":      "Pricing invisible above the fold",
        "location":   "Homepage + pricing · offer buried or absent",
        "description": (
            "Your offer pricing isn't visible to cold traffic. Visitors self-select out as "
            "\"too expensive\" before they ever reach the price — "
            "<strong>you're qualifying out buyers who'd have happily paid.</strong>"
        ),
        "fix":        (
            "Surface a clear price or price range in the hero. "
            "Make the entry offer the primary CTA, not the upsell."
        ),
        "effort":     "~1 hr",
        "timing":     "This week",
    },
    "no_blog": {
        "title":      "No content engine / organic SEO surface",
        "location":   "Sitewide · no blog or resource hub detected",
        "description": (
            "No blog or content hub found. You're 100% dependent on paid or outbound "
            "for traffic — zero organic surface means every visitor costs money to acquire "
            "and <strong>every traffic pause kills your pipeline.</strong>"
        ),
        "fix":        (
            "Publish one SEO-targeted piece per week. "
            "Even 4 articles a month compounds significantly over 90 days."
        ),
        "effort":     "~3 hrs / week",
        "timing":     "Start this week",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
#  ENRICHMENT → LEAK LIST
# ─────────────────────────────────────────────────────────────────────────────
def detect_leaks(enrichment: dict, config: dict = CONFIG) -> list:
    """
    Map enrichment JSON → list of leak dicts, sorted by dollar impact (high → low).
    Returns at most 3.

    Each returned dict matches the template's leak variable contract:
        rank, title, location, severity, description,
        monthly_loss_low, monthly_loss_high, cost_assumptions,
        fix_text, fix_effort, fix_timing
    """
    detected = []

    funnel      = enrichment.get("funnel", {})
    social      = enrichment.get("social_media_presence", {})
    offer       = enrichment.get("offer", {})
    content_ads = enrichment.get("content_ads", {})

    # 1. Dead CTAs
    dead_ctas = funnel.get("dead_ctas", 0)
    if dead_ctas > 0:
        ctas  = funnel.get("ctas", [])
        label = ctas[0]["label"] if ctas else "Get Started"
        copy  = LEAK_COPY["dead_ctas"]
        cost  = compute_leak_range("dead_ctas", enrichment, config)
        detected.append({
            "_type":   "dead_ctas",
            "_impact": cost["high"],
            "title":       copy["title"].format(
                count=dead_ctas, plural="s" if dead_ctas > 1 else ""
            ),
            "location":    copy["location"],
            "severity":    config["severity"]["dead_ctas"],
            "description": copy["description"].format(label=label),
            "monthly_loss_low":  cost["low"],
            "monthly_loss_high": cost["high"],
            "cost_assumptions":  cost["assumption"],
            "fix_text":    copy["fix"],
            "fix_effort":  copy["effort"],
            "fix_timing":  copy["timing"],
        })

    # 2. Missing tracking pixel
    if not content_ads.get("tracking_pixels"):
        copy = LEAK_COPY["missing_pixel"]
        cost = compute_leak_range("missing_pixel", enrichment, config)
        detected.append({
            "_type":   "missing_pixel",
            "_impact": cost["high"],
            "title":       copy["title"],
            "location":    copy["location"],
            "severity":    config["severity"]["missing_pixel"],
            "description": copy["description"],
            "monthly_loss_low":  cost["low"],
            "monthly_loss_high": cost["high"],
            "cost_assumptions":  cost["assumption"],
            "fix_text":    copy["fix"],
            "fix_effort":  copy["effort"],
            "fix_timing":  copy["timing"],
        })

    # 3. Dead social links
    dead_socials = social.get("dead_or_placeholder_links", [])
    if dead_socials:
        platforms = ", ".join(dead_socials[:3])
        copy = LEAK_COPY["dead_social"]
        cost = compute_leak_range("dead_social", enrichment, config)
        detected.append({
            "_type":   "dead_social",
            "_impact": cost["high"],
            "title":       copy["title"],
            "location":    copy["location"],
            "severity":    config["severity"]["dead_social"],
            "description": copy["description"].format(platforms=platforms),
            "monthly_loss_low":  cost["low"],
            "monthly_loss_high": cost["high"],
            "cost_assumptions":  cost["assumption"],
            "fix_text":    copy["fix"],
            "fix_effort":  copy["effort"],
            "fix_timing":  copy["timing"],
        })

    # 4. No pricing visible
    if not offer.get("price_points_found"):
        copy = LEAK_COPY["no_pricing"]
        cost = compute_leak_range("no_pricing", enrichment, config)
        detected.append({
            "_type":   "no_pricing",
            "_impact": cost["high"],
            "title":       copy["title"],
            "location":    copy["location"],
            "severity":    config["severity"]["no_pricing"],
            "description": copy["description"],
            "monthly_loss_low":  cost["low"],
            "monthly_loss_high": cost["high"],
            "cost_assumptions":  cost["assumption"],
            "fix_text":    copy["fix"],
            "fix_effort":  copy["effort"],
            "fix_timing":  copy["timing"],
        })

    # 5. No blog / content engine
    if not content_ads.get("blog_detected"):
        copy = LEAK_COPY["no_blog"]
        cost = compute_leak_range("no_blog", enrichment, config)
        detected.append({
            "_type":   "no_blog",
            "_impact": cost["high"],
            "title":       copy["title"],
            "location":    copy["location"],
            "severity":    config["severity"]["no_blog"],
            "description": copy["description"],
            "monthly_loss_low":  cost["low"],
            "monthly_loss_high": cost["high"],
            "cost_assumptions":  cost["assumption"],
            "fix_text":    copy["fix"],
            "fix_effort":  copy["effort"],
            "fix_timing":  copy["timing"],
        })

    # Sort by $ impact descending, keep top 3
    detected.sort(key=lambda x: x["_impact"], reverse=True)
    detected = detected[:3]
    for i, leak in enumerate(detected, start=1):
        leak["rank"] = i
        del leak["_type"]
        del leak["_impact"]

    return detected


# ─────────────────────────────────────────────────────────────────────────────
#  BUILD TEMPLATE VARIABLE DICT
# ─────────────────────────────────────────────────────────────────────────────
def build_vars(enrichment: dict, leaks: list) -> dict:
    """Map enrichment + ranked leaks → full Jinja2 template variable dict."""
    domain   = enrichment.get("domain", enrichment.get("source_url", "—"))
    basics   = enrichment.get("business_basics", {})
    leaks_txt = enrichment.get("leaks_detected", [])

    total_low  = sum(l["monthly_loss_low"]  for l in leaks)
    total_high = sum(l["monthly_loss_high"] for l in leaks)

    # Uncomfortable truth — most alarming scraped finding, or generic fallback.
    if leaks_txt:
        uncomfortable_truth = leaks_txt[0]
        truth_subtext = (
            "These are observable, scrape-verified findings — not assumptions. "
            "This is the kind of thing a founder never catches because you never click your own buttons."
        )
    else:
        uncomfortable_truth = (
            f"Your site is actively losing revenue right now — "
            f"and {len(leaks)} of the leaks are fixable in under a day."
        )
        truth_subtext = "This is the kind of thing a founder never catches, because you never click your own buttons."

    # H1 headline driven by the most severe leak
    if leaks:
        n = len(leaks)
        headline = f"{n} leak{'s are' if n > 1 else ' is'} quietly costing you signups."
    else:
        headline = "Your funnel has fixable leaks."

    # "This Week's Moves" — one entry per leak, ordered by $ impact
    week_moves = [
        {
            "rank":         l["rank"],
            "title":        l["title"],
            "body":         l["fix_text"],
            "recovers_leak": f"Recovers Leak {str(l['rank']).zfill(2)}",
            "effort":       l["fix_effort"],
        }
        for l in leaks
    ]

    pages_reviewed = 1 + (1 if enrichment.get("offer", {}).get("pricing_page") else 0)

    return {
        "prospect_domain":           domain,
        "audit_date":                date.today().strftime("%-d %b %Y"),
        "pages_reviewed":            pages_reviewed,
        "leak_count":                len(leaks),
        "uncomfortable_truth_headline": headline,
        "uncomfortable_truth":       uncomfortable_truth,
        "truth_subtext":             truth_subtext,
        "leaks":                     leaks,
        "total_low":                 f"${total_low:,}",
        "total_high":                f"${total_high:,}",
        "total_caption": (
            f"Conservative. Based on ~{CONFIG['monthly_traffic']:,} estimated monthly visitors "
            f"and a ${CONFIG['default_price']:,} default offer price. "
            "The primary fix alone recovers the most."
        ),
        "week_moves":  week_moves,
        "cta_headline": "Want us to fix all of this for you?",
        "cta_body": (
            "We'll implement every fix in this report and rebuild the funnel "
            "so it actually converts the traffic you're already paying for."
        ),
        "cta_url": "https://titanleapagency.gumroad.com/l/fxift",
    }


# ─────────────────────────────────────────────────────────────────────────────
#  RENDER
# ─────────────────────────────────────────────────────────────────────────────
def render(enrichment: dict, template_file: str | None = None) -> str:
    """Render populated HTML from enrichment JSON."""
    leaks = detect_leaks(enrichment)
    if not leaks:
        print("⚠  No leaks detected — site may be clean or couldn't be fetched.", file=sys.stderr)

    vars_ = build_vars(enrichment, leaks)

    tmpl_path = Path(template_file) if template_file else Path(__file__).parent / "revenue_leak_audit.j2"
    env = Environment(loader=FileSystemLoader(str(tmpl_path.parent)), autoescape=False)
    template = env.get_template(tmpl_path.name)
    return template.render(**vars_)


# ─────────────────────────────────────────────────────────────────────────────
#  CLI
# ─────────────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Render a Revenue Leak Audit report.")
    ap.add_argument("url",        nargs="?", help="Prospect URL to scrape + render")
    ap.add_argument("--enriched", help="Path to pre-scraped enrichment JSON file")
    ap.add_argument("--save",     help="Write output HTML to this file (default: stdout)")
    ap.add_argument("--template", help="Path to Jinja2 template (default: revenue_leak_audit.j2)")
    args = ap.parse_args()

    if args.enriched:
        with open(args.enriched, encoding="utf-8") as f:
            enrichment = json.load(f)
    elif args.url:
        # Import enrich_audit from the parent directory
        sys.path.insert(0, str(Path(__file__).parent.parent))
        try:
            from enrich_audit import enrich
        except ImportError:
            sys.exit("Could not import enrich_audit.py — make sure it's in the repo root.")
        print(f"Scraping {args.url}…", file=sys.stderr)
        enrichment = enrich(args.url)
        if "error" in enrichment:
            sys.exit(f"Enrichment failed: {enrichment['error']}")
    else:
        ap.print_help()
        sys.exit(1)

    html = render(enrichment, args.template)

    if args.save:
        with open(args.save, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"✓ Saved → {args.save}", file=sys.stderr)
    else:
        print(html)


if __name__ == "__main__":
    main()
