# TitanLeap — Audit Engine

Self-contained module that turns a prospect URL into a branded Revenue Leak Audit PDF + Loom script outline in one command.

**Branch: `feature/audit-engine` — `main` is untouched. Production (Render) is unaffected.**

---

## What it does

1. Scrapes the prospect's public site via `tools/enrich_audit.py` (read-only)
2. Runs a **12-point checklist** across three sections (Messaging → Signup → Monetization)
3. Selects the **top 3 leaks** by money impact × fixability
4. Renders a branded **Revenue Leak Audit HTML** using `tools/revenue_leak_audit.j2` (read-only)
5. Converts to **PDF** (requires `weasyprint`)
6. Generates a **Loom script outline** with 6 segments
7. Prescribes the correct **tier** from `routing.json` (config-driven, no hardcoding)

---

## Files

```
audit-engine/
  audit_engine.py          ← CLI entry point
  checklist.py             ← 12-point scoring engine
  loom_script.py           ← Loom script outline generator
  routing.json             ← Module 2: tier decision table (edit freely)
  manual_fill_template.html← Module 3: blank template for hand-fills
  README.md                ← this file
```

---

## Quick start (local test)

### 1. Install dependencies

```bash
pip install requests beautifulsoup4 jinja2 --break-system-packages

# Optional — enables PDF output:
pip install weasyprint --break-system-packages
```

### 2. Run against a live URL

```bash
cd titan-leap-repo
python audit-engine/audit_engine.py --url https://example.com
```

Output in current directory:
```
example_com_audit.html    ← open in browser or print to PDF
example_com_audit.pdf     ← if weasyprint is installed
example_com_loom.txt      ← paste into Loom / Notion
example_com_checklist.json← full 12-point scored checklist
```

### 3. Use pre-scraped enrichment (faster, avoids repeat scraping)

```bash
# Step 1: scrape and save
python tools/enrich_audit.py https://example.com --save enrichment.json

# Step 2: run audit engine with saved enrichment
python audit-engine/audit_engine.py --url https://example.com --enriched enrichment.json
```

### 4. Dry run (scores + tier only, no rendering)

```bash
python audit-engine/audit_engine.py --url https://example.com --dry-run
```

### 5. Custom output directory

```bash
python audit-engine/audit_engine.py --url https://example.com --out ./output/acme
```

---

## The 12-Point Checklist

| # | Section | Check | Weight |
|---|---------|-------|--------|
| 1 | A — Messaging | Value-prop 5-sec clarity | 3 |
| 2 | A — Messaging | Headline ↔ CTA alignment | 3 |
| 3 | A — Messaging | Proof / trust signals | 2 |
| 4 | A — Messaging | Mobile-first integrity | 2 |
| 5 | B — Signup→Activation | Signup friction | 3 |
| 6 | B — Signup→Activation | Time-to-value / aha moment | 2 |
| 7 | B — Signup→Activation | Empty-state onboarding | 1 |
| 8 | B — Signup→Activation | Activation email sequence | 2 |
| 9 | C — Monetization/Retention | Pricing clarity | 3 |
| 10 | C — Monetization/Retention | Free → paid path | 2 |
| 11 | C — Monetization/Retention | Re-engagement / churn catch | 2 |
| 12 | C — Monetization/Retention | Analytics / tracking visibility | 2 |

**Scoring:** 🔴 critical / 🟡 weak / 🟢 solid

**Top-3 selection:** `opportunity_score = (2 - score_int) × weight × fixability × dollar_mid`

---

## Tier Routing

Edit `routing.json` to change tier prescriptions without touching code.

| Condition | Tier | Price |
|-----------|------|-------|
| No funnel / pre-revenue | Launch Accelerator | $2,999/mo |
| Working but leaky funnel | **Scaling System** (default) | $6,999/mo |
| Funded / scaling | Authority Domination | $9,999/mo |

The `rules` array in `routing.json` is evaluated in priority order. The first matching rule wins. `default_tier` is used if no rule matches.

---

## Manual Fill Template (Module 3)

Open `manual_fill_template.html` in any browser. Click into any field to type. Fill in ~2 hours. Print → Save as PDF.

- All fields are inline `<input>` or `<textarea>` elements
- Severity badge colour toggles automatically when you change the dropdown
- Date auto-fills to today
- Prints cleanly (print CSS included)

---

## Protected files (never modified by this module)

| File | Used as |
|------|---------|
| `tools/enrich_audit.py` | Import read-only via `sys.path` |
| `tools/revenue_leak_audit.j2` | Jinja2 template render read-only |
| `tools/_base.j2` | Extended by revenue_leak_audit.j2 |
| `tools/roadmap_90day.j2` | Not used by this module |
| `tools/resolver.py` | Not used (checklist.py mirrors the dollar-math pattern independently) |
| `tools/render.py` / `render_audit.py` | Not used (audit_engine.py renders directly) |

---

## Merging to main

1. **Review on the branch first.** Run against 2–3 prospect URLs. Check the PDF looks right.
2. **Merge via GitHub PR** (or run `git merge feature/audit-engine` from main locally).
3. No existing routes, files, or DB tables are affected — this module is purely additive.
4. Render auto-deploys from main. The `/audit-engine` folder is a Python-only module and does not affect the Node/Express server at all.

```bash
# Safe merge command (run from main after review):
git checkout main
git merge feature/audit-engine --no-ff -m "feat: merge audit-engine module"
git push origin main
```

---

## Dollar math config

All assumptions live at the top of `checklist.py` in `MONEY_CONFIG`:

```python
MONEY_CONFIG = {
    "monthly_traffic":  500,   # assumed uniques when no signal
    "cta_intent_rate":  0.03,  # 3% with real purchase intent
    "default_price":    297,   # fallback offer price
    "recovery": {
        "signup_friction": 0.60,   # highest — peak-intent intercept
        "pricing_clarity": 0.15,
        ...
    }
}
```

Change values here and re-run — all dollar ranges update automatically.
