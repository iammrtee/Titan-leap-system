#!/usr/bin/env python3
"""
audit_engine.py — TitanLeap Audit Engine
==========================================
Entry point for the /audit-engine module.

Usage
-----
  # Full run — scrape + score + render PDF + Loom script:
  python audit_engine.py --url https://example.com

  # Use a pre-scraped enrichment JSON (skips the scrape):
  python audit_engine.py --url https://example.com --enriched enrichment.json

  # Dry run — print checklist scores and tier, skip rendering:
  python audit_engine.py --url https://example.com --dry-run

  # Custom output directory:
  python audit_engine.py --url https://example.com --out ./output

What it produces (in --out directory)
--------------------------------------
  {slug}_audit.html    — Branded Revenue Leak Audit (HTML)
  {slug}_audit.pdf     — Same audit as PDF (requires: pip install weasyprint)
  {slug}_loom.txt      — Loom script outline (plain text)
  {slug}_checklist.json — Full 12-point scored checklist (debug/reference)

Pipeline
--------
  1. tools/enrich_audit.py → enrichment JSON        [read-only import]
  2. checklist.py          → 12-point scores
  3. checklist.top3_leaks  → top 3 by money × fixability
  4. routing.json          → tier prescription       [config-driven]
  5. tools/revenue_leak_audit.j2 → HTML render       [read-only import]
  6. weasyprint            → HTML → PDF
  7. loom_script.py        → Loom outline

Protected files imported read-only (never modified):
  tools/enrich_audit.py
  tools/revenue_leak_audit.j2
  tools/_base.j2
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

# ── path setup: make tools/ importable without modifying any file ────────────
THIS_DIR  = Path(__file__).parent.resolve()
REPO_ROOT = THIS_DIR.parent
TOOLS_DIR = REPO_ROOT / "tools"
sys.path.insert(0, str(TOOLS_DIR))   # gives access to enrich_audit, render_audit, etc.
sys.path.insert(0, str(THIS_DIR))    # gives access to checklist, loom_script


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ENRICHMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def load_enrichment(url: str, enriched_path: str | None) -> dict:
    if enriched_path:
        print(f"[audit-engine] Loading enrichment from {enriched_path}")
        with open(enriched_path, encoding="utf-8") as f:
            return json.load(f)

    try:
        from enrich_audit import enrich   # tools/enrich_audit.py — read-only
        print(f"[audit-engine] Scraping {url} …")
        result = enrich(url)
        if "error" in result:
            print(f"[audit-engine] WARNING: scrape returned error: {result['error']}")
            return {"domain": _slug_domain(url), "leaks_detected": [], "funnel": {}, "offer": {}, "content_ads": {}, "social_media_presence": {}, "business_basics": {}}
        return result
    except ImportError:
        print("[audit-engine] WARNING: enrich_audit.py not found in tools/ — using empty enrichment.")
        return {"domain": _slug_domain(url), "leaks_detected": [], "funnel": {}, "offer": {}, "content_ads": {}, "social_media_presence": {}, "business_basics": {}}
    except Exception as exc:
        print(f"[audit-engine] WARNING: enrichment failed ({exc}) — using empty enrichment.")
        return {"domain": _slug_domain(url), "leaks_detected": [], "funnel": {}, "offer": {}, "content_ads": {}, "social_media_presence": {}, "business_basics": {}}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TIER ROUTING (reads routing.json — no hardcoding)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def prescribe_tier(checklist_results: list[dict]) -> dict:
    """
    Read routing.json and determine the correct tier based on checklist scores.
    Returns the full tier dict including name, price, headline, and body copy.
    """
    routing_path = THIS_DIR / "routing.json"
    with open(routing_path, encoding="utf-8") as f:
        routing = json.load(f)

    # Build a quick lookup: "{check_id}_{score}" → True
    score_flags: set[str] = set()
    red_count = 0
    for r in checklist_results:
        score_flags.add(f"{r['id']}_{r['score']}")
        if r["score"] == "red":
            red_count += 1
        if r["score"] in ("green", "yellow"):
            score_flags.add(f"{r['id']}_green_or_yellow")

    # Evaluate rules in priority order
    matched_tier_id = routing["default_tier"].replace(" ", "_").lower()
    for rule in sorted(routing["rules"], key=lambda x: x["priority"]):
        all_match = all(f in score_flags for f in rule.get("match_all", []))
        any_match = not rule.get("match_any") or any(f in score_flags for f in rule.get("match_any", []))
        min_red   = rule.get("min_red_count", 0)
        red_ok    = red_count >= min_red

        if all_match and any_match and red_ok:
            matched_tier_id = rule["tier"]
            break

    tier_data    = routing["tiers"].get(matched_tier_id, routing["tiers"]["scaling_system"])
    copy_data    = routing["prescription_copy"].get(matched_tier_id, {})

    return {
        "tier_id":        matched_tier_id,
        "tier_name":      tier_data["name"],
        "price_mo":       tier_data["price_mo"],
        "tagline":        tier_data["tagline"],
        "description":    tier_data["description"],
        "ideal_for":      tier_data["ideal_for"],
        "headline":       copy_data.get("headline", ""),
        "body":           copy_data.get("body", ""),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HTML RENDERER (uses existing revenue_leak_audit.j2 — read-only)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_html(template_vars: dict, tier: dict) -> str:
    """
    Render the Revenue Leak Audit HTML using the existing j2 template (read-only).
    Appends a prescription section showing the recommended tier.
    """
    try:
        from jinja2 import Environment, FileSystemLoader, select_autoescape
    except ImportError:
        sys.exit("[audit-engine] ERROR: jinja2 not installed. Run: pip install jinja2 --break-system-packages")

    # Load the existing template from tools/ (read-only)
    env = Environment(
        loader=FileSystemLoader(str(TOOLS_DIR)),
        autoescape=select_autoescape(enabled_extensions=()),
        keep_trailing_newline=True,
    )

    # Inject prescription into template vars
    vars_ = dict(template_vars)
    vars_["prescription_tier"]     = tier["tier_name"]
    vars_["prescription_price"]    = f"${tier['price_mo']:,}/mo"
    vars_["prescription_headline"] = tier["headline"]
    vars_["prescription_body"]     = tier["body"]
    vars_["prescription_tagline"]  = tier["tagline"]

    # Render the audit template
    tpl  = env.get_template("revenue_leak_audit.j2")
    html = tpl.render(**vars_)

    # Inject prescription section before </body>
    prescription_block = _build_prescription_html(tier)
    html = html.replace("</body>", prescription_block + "\n</body>")

    return html


def _build_prescription_html(tier: dict) -> str:
    return f"""
  <!-- ── PRESCRIPTION (injected by audit-engine) ── -->
  <div style="background:#06030D;padding:52px 0 72px;border-top:1px solid #1F1430">
    <div class="wrap">
      <div class="eyebrow">Prescription</div>
      <h2 style="font-size:clamp(24px,4vw,34px);font-weight:800;letter-spacing:-.02em;margin-bottom:14px">{tier['headline']}</h2>
      <p style="font-size:15px;color:#9B91B4;max-width:54ch;margin-bottom:32px;line-height:1.6">{tier['body']}</p>
      <div style="background:#100823;border:1px solid #2E1F47;border-left:3px solid #6B21E8;border-radius:4px;padding:28px 32px;display:inline-block;max-width:480px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#665C7E;margin-bottom:8px">Recommended tier</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-.01em;color:#EDE9F5;margin-bottom:4px">{tier['tier_name']}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#F5C518;margin-bottom:12px">${tier['price_mo']:,}/mo</div>
        <div style="font-size:13px;color:#9B91B4;line-height:1.5">{tier['tagline']}</div>
      </div>
    </div>
  </div>"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PDF RENDERER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def render_pdf(html: str, out_path: str) -> bool:
    """
    Convert HTML to PDF using weasyprint.
    Returns True on success, False if weasyprint is not installed.
    To install: pip install weasyprint --break-system-packages
    """
    try:
        from weasyprint import HTML as WP_HTML
        WP_HTML(string=html, base_url=str(TOOLS_DIR)).write_pdf(out_path)
        return True
    except ImportError:
        print("[audit-engine] INFO: weasyprint not installed — skipping PDF.")
        print("               To enable PDF: pip install weasyprint --break-system-packages")
        return False
    except Exception as exc:
        print(f"[audit-engine] WARNING: PDF render failed ({exc}) — HTML saved, PDF skipped.")
        return False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _slug_domain(url: str) -> str:
    url = re.sub(r"^https?://", "", url.strip().lower())
    url = re.sub(r"/.*$", "", url)
    return url.replace("www.", "") or "prospect"


def _file_slug(domain: str) -> str:
    return re.sub(r"[^a-z0-9]", "_", domain.lower()).strip("_")


def _print_summary(domain: str, leaks: list[dict], tier: dict, checklist: list[dict]) -> None:
    print(f"\n{'━'*64}")
    print(f"  TITANLEAP AUDIT ENGINE — {domain}")
    print(f"{'━'*64}")

    # Section breakdown
    sections = {"A": "Messaging", "B": "Signup→Activation", "C": "Monetization/Retention"}
    for sec_id, sec_name in sections.items():
        checks = [c for c in checklist if c["section"] == sec_id]
        icons  = {"red": "🔴", "yellow": "🟡", "green": "🟢"}
        print(f"\n  Section {sec_id} — {sec_name}")
        for c in checks:
            print(f"    {icons[c['score']]}  {c['name']}")

    print(f"\n  Top {len(leaks)} Leak{'s' if len(leaks) != 1 else ''} (by money × fixability):")
    total_low  = sum(l["monthly_loss_low"]  for l in leaks)
    total_high = sum(l["monthly_loss_high"] for l in leaks)
    for lk in leaks:
        sev = "🔴" if lk["severity"] == "high" else "🟡"
        print(f"    {sev}  Leak {lk['rank']:02d}: {lk['name']}")
        print(f"          ${lk['monthly_loss_low']:,}–${lk['monthly_loss_high']:,}/mo | {lk['effort'] or 'TBD'} | {lk['timing'] or 'TBD'}")

    print(f"\n  Total estimated monthly leak: ${total_low:,}–${total_high:,}/mo")
    print(f"\n  Prescribed tier: {tier['tier_name']} — ${tier['price_mo']:,}/mo")
    print(f"  "{tier['tagline']}"")
    print(f"{'━'*64}\n")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLI ENTRY POINT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main() -> None:
    parser = argparse.ArgumentParser(
        description="TitanLeap Audit Engine — 12-point checklist → branded PDF + Loom script.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python audit_engine.py --url https://acme.com
  python audit_engine.py --url https://acme.com --enriched enrichment.json
  python audit_engine.py --url https://acme.com --dry-run
  python audit_engine.py --url https://acme.com --out ./output
        """
    )
    parser.add_argument("--url",      required=True,        help="Prospect website URL")
    parser.add_argument("--enriched", metavar="FILE",        help="Path to pre-scraped enrichment JSON (skips scrape)")
    parser.add_argument("--out",      default=".",           help="Output directory (default: current directory)")
    parser.add_argument("--dry-run",  action="store_true",   help="Print scores and tier only — skip rendering")
    args = parser.parse_args()

    # ── 1. Enrich
    enrichment = load_enrichment(args.url, args.enriched)
    domain     = enrichment.get("domain") or _slug_domain(args.url)

    # ── 2. Checklist
    from checklist import run_checklist, top3_leaks, build_template_vars
    checklist_results = run_checklist(enrichment)
    leaks             = top3_leaks(checklist_results)

    # ── 3. Tier routing
    tier = prescribe_tier(checklist_results)

    # ── 4. Print summary (always)
    _print_summary(domain, leaks, tier, checklist_results)

    if args.dry_run:
        print("[audit-engine] Dry run — rendering skipped.")
        return

    # ── 5. Build template vars + render HTML
    template_vars = build_template_vars(enrichment, leaks)
    html          = render_html(template_vars, tier)

    # ── 6. Write outputs
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = _file_slug(domain)

    # HTML
    html_path = out_dir / f"{slug}_audit.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"[audit-engine] Audit HTML  → {html_path}")

    # PDF
    pdf_path = out_dir / f"{slug}_audit.pdf"
    ok = render_pdf(html, str(pdf_path))
    if ok:
        print(f"[audit-engine] Audit PDF   → {pdf_path}")

    # Loom script
    from loom_script import generate_loom_script
    total_low  = sum(l["monthly_loss_low"]  for l in leaks)
    total_high = sum(l["monthly_loss_high"] for l in leaks)
    loom = generate_loom_script(
        domain     = domain,
        leaks      = leaks,
        total_low  = f"${total_low:,}",
        total_high = f"${total_high:,}",
    )
    loom_path = out_dir / f"{slug}_loom.txt"
    loom_path.write_text(loom, encoding="utf-8")
    print(f"[audit-engine] Loom script → {loom_path}")

    # Full checklist JSON (for reference / debugging)
    checklist_path = out_dir / f"{slug}_checklist.json"
    checklist_path.write_text(
        json.dumps({"domain": domain, "tier": tier, "checklist": checklist_results, "top3_leaks": leaks}, indent=2),
        encoding="utf-8"
    )
    print(f"[audit-engine] Checklist   → {checklist_path}")

    print(f"\n✓ Done — {len(leaks)} leak(s) found · ${total_low:,}–${total_high:,}/mo · {tier['tier_name']}")
    print(f"  Open: {html_path.resolve()}")


if __name__ == "__main__":
    main()
