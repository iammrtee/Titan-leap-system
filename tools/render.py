"""
render.py — TitanLeap Deliverable Engine CLI
============================================
Renders the Revenue Leak Audit + 90-Day Roadmap from one resolved object.

Usage
-----
# Scrape a live URL and render both documents:
  python render.py https://example.com

# Use a pre-run enrichment JSON (e.g. from enrich_audit.py):
  python render.py https://example.com --enriched enrichment.json

# Pass intake form answers as JSON:
  python render.py https://example.com --form form_answers.json

# Custom output paths:
  python render.py https://example.com --audit-out audit.html --roadmap-out roadmap.html

# Dry-run (print resolved vars, don't write files):
  python render.py https://example.com --dry-run

Outputs
-------
  {slug}_audit.html    — Revenue Leak Audit
  {slug}_roadmap.html  — 90-Day Roadmap
"""

from __future__ import annotations
import argparse
import json
import os
import sys
from pathlib import Path

# ── local imports ────────────────────────────────────────────────────────────
THIS_DIR = Path(__file__).parent
sys.path.insert(0, str(THIS_DIR))

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
except ImportError:
    sys.exit("ERROR: jinja2 not installed. Run: pip install jinja2 --break-system-packages")

from resolver import resolve, _clean_domain


# ── template environment ─────────────────────────────────────────────────────
_env = Environment(
    loader=FileSystemLoader(str(THIS_DIR)),
    autoescape=select_autoescape(enabled_extensions=()),  # HTML is authored by us — no escaping
    keep_trailing_newline=True,
)
# Register Jinja2 global helpers
_env.globals["'{:,}'.format"] = lambda n: f"{n:,}"


def render_audit(resolved: dict) -> str:
    """Render the Revenue Leak Audit HTML string."""
    tpl  = _env.get_template("revenue_leak_audit.j2")
    vars_= dict(resolved)  # shallow copy — footer_dis already set by resolver
    return tpl.render(**vars_)


def render_roadmap(resolved: dict) -> str:
    """Render the 90-Day Roadmap HTML string."""
    tpl   = _env.get_template("roadmap_90day.j2")
    vars_ = dict(resolved)
    # roadmap has its own footer disclaimer
    vars_["footer_dis"] = resolved.get("roadmap_footer_dis", resolved.get("footer_dis", ""))
    # roadmap CTA vars share the same key names as audit in the resolved dict
    # because the template uses {{ cta_headline }}, {{ cta_body }}, {{ cta_url }}
    # The roadmap overrides are already in the resolved dict from resolver.py
    # (both templates read cta_headline / cta_body / cta_url — same values are fine
    #  since the roadmap CTA is about the audit product as an entry point)
    return tpl.render(**vars_)


# ── enrichment ───────────────────────────────────────────────────────────────

def _load_enrichment(url: str, enriched_path: str | None) -> dict:
    if enriched_path:
        with open(enriched_path) as f:
            return json.load(f)

    try:
        # Import here so the rest of the CLI works even if enrich_audit isn't present
        from enrich_audit import enrich
        print(f"[render] Scraping {url} …")
        return enrich(url)
    except ImportError:
        print("[render] WARNING: enrich_audit.py not found — using empty enrichment.")
        domain = _clean_domain(url)
        return {"domain": domain, "signals": {}, "pages_reviewed": 1}
    except Exception as exc:
        print(f"[render] WARNING: enrichment failed ({exc}) — using empty enrichment.")
        domain = _clean_domain(url)
        return {"domain": domain, "signals": {}, "pages_reviewed": 1}


# ── slug ─────────────────────────────────────────────────────────────────────

def _slug(domain: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]", "_", domain.lower()).strip("_")


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="TitanLeap Deliverable Engine — render audit + roadmap from one URL.",
    )
    parser.add_argument("url", help="Prospect website URL")
    parser.add_argument("--enriched",    metavar="FILE",   help="Path to pre-run enrichment JSON")
    parser.add_argument("--form",        metavar="FILE",   help="Path to intake form answers JSON")
    parser.add_argument("--audit-out",   metavar="FILE",   help="Output path for audit HTML")
    parser.add_argument("--roadmap-out", metavar="FILE",   help="Output path for roadmap HTML")
    parser.add_argument("--dry-run",     action="store_true", help="Print resolved vars, skip rendering")
    args = parser.parse_args()

    # Load form data
    form_data: dict = {}
    if args.form:
        with open(args.form) as f:
            form_data = json.load(f)
    form_data.setdefault("websiteUrl", args.url)

    # Load enrichment
    enrichment = _load_enrichment(args.url, args.enriched)

    # Resolve
    resolved = resolve(form_data, enrichment)
    domain   = resolved["prospect_domain"]
    slug     = _slug(domain)

    if args.dry_run:
        import pprint
        pprint.pprint(resolved)
        return

    # Render audit
    audit_path = args.audit_out or f"{slug}_audit.html"
    audit_html = render_audit(resolved)
    Path(audit_path).write_text(audit_html, encoding="utf-8")
    print(f"[render] Audit  → {audit_path}")

    # Render roadmap
    roadmap_path = args.roadmap_out or f"{slug}_roadmap.html"
    roadmap_html = render_roadmap(resolved)
    Path(roadmap_path).write_text(roadmap_html, encoding="utf-8")
    print(f"[render] Roadmap → {roadmap_path}")

    # Quick summary
    leaks = resolved.get("leaks", [])
    print(f"\n✓  {domain} — {len(leaks)} leak(s) detected")
    for l in leaks:
        print(f"   Leak {l['rank']:02d}: {l['title']} · ${l['monthly_loss_low']:,}–${l['monthly_loss_high']:,}/mo")
    total_low  = sum(l["monthly_loss_low"]  for l in leaks)
    total_high = sum(l["monthly_loss_high"] for l in leaks)
    print(f"   Total: ${total_low:,}–${total_high:,}/mo")


if __name__ == "__main__":
    main()
