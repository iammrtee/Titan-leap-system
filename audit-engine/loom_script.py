"""
loom_script.py — TitanLeap Loom Script Outline Generator
=========================================================
Takes the resolved audit vars (domain, leaks, total range) and returns
a segmented Loom script outline.

Segments (from the Cowork operating brief):
  1. Warm open        (0:00–0:20)
  2. 5-second test    (0:20–0:40)
  3. 3 Leaks          (0:40–1:30)
  4. Quick wins       (1:30–1:50)
  5. The bridge       (1:50–2:05)
  6. Close            (2:05–2:20)

Output: plain text suitable for Notion / copy-paste into Loom.
"""

from __future__ import annotations


def generate_loom_script(
    domain: str,
    leaks: list[dict],
    total_low: str,
    total_high: str,
    cta_url: str = "https://titanleapagency.gumroad.com/l/fxift",
) -> str:
    """
    Generate a Loom script outline from audit results.

    Args:
        domain:     Prospect domain string (e.g. 'acme.com')
        leaks:      Top-3 leak dicts from checklist.top3_leaks()
        total_low:  Formatted total low range (e.g. '$2,005')
        total_high: Formatted total high range (e.g. '$4,678')
        cta_url:    URL for the CTA close

    Returns:
        Multi-line string — ready to paste into Loom / Notion.
    """
    name = domain.split(".")[0].capitalize()
    n    = len(leaks)

    # ── Leak summaries
    leak_lines = []
    for lk in leaks:
        low  = f"${lk.get('monthly_loss_low', 0):,}"
        high = f"${lk.get('monthly_loss_high', 0):,}"
        leak_lines.append(
            f"  Leak {lk['rank']:02d} — {lk['name']}\n"
            f"  → {lk['finding']}\n"
            f"  → Estimated monthly cost: {low}–{high}/mo\n"
            f"  → Evidence: {lk['evidence']}"
        )
    leaks_block = "\n\n".join(leak_lines) if leak_lines else "  No critical leaks detected."

    # ── Quick wins
    wins = []
    for lk in leaks:
        wins.append(f"  • {lk['name']}: {lk['fix'] or 'Implement the fix outlined above.'} [{lk['effort'] or '2–4 hrs'}]")
    wins_block = "\n".join(wins) if wins else "  • No quick wins required — site is clean."

    # ── Top leak for 5-sec test
    top_finding = leaks[0]["finding"] if leaks else "The fundamentals need tightening before scaling."
    top_evidence = leaks[0]["evidence"] if leaks else ""

    script = f"""╔══════════════════════════════════════════════════════════════════════╗
║  TITANLEAP · LOOM SCRIPT OUTLINE                                     ║
║  Prospect: {domain:<57}║
╚══════════════════════════════════════════════════════════════════════╝

── BEFORE YOU HIT RECORD ────────────────────────────────────────────────
  • Have {domain} open in a browser tab (ready to share screen)
  • Have this audit PDF ready to share in the Loom description
  • Keep it 2–3 mins max — long Looms kill response rate
  • Tone: direct, curious, not salesy. You're showing them something.
────────────────────────────────────────────────────────────────────────


[SEGMENT 1 · 0:00–0:20] — WARM OPEN
──────────────────────────────────────
"Hey {name}, I just ran {domain} through TitanLeap's audit engine —
took about 5 minutes. I'm going to show you exactly what I found,
because there are {n} thing{'s' if n != 1 else ''} here I'd want to know about
if it were my site. No pitch — just what the data showed."

[SHOW: homepage of {domain}]


[SEGMENT 2 · 0:20–0:40] — 5-SECOND TEST
──────────────────────────────────────────
"First thing I do with any site: the 5-second test. I land here and ask —
do I know what you do, who it's for, and what happens next?

On {domain}: {top_finding}

{top_evidence}

That's the first place revenue escapes — before they even scroll."

[SHOW: homepage hero / headline area]


[SEGMENT 3 · 0:40–1:30] — THE 3 LEAKS
──────────────────────────────────────────
"We found {n} concrete leak{'s' if n != 1 else ''} — here they are, ranked by dollar impact."

{leaks_block}

"Combined, these {n} leak{'s are' if n != 1 else ' is'} costing an estimated
{total_low}–{total_high}/month based on conservative benchmarks.
That's not a projection — it's what the funnel math says given your structure."

[SHOW: relevant pages for each leak as you describe them]


[SEGMENT 4 · 1:30–1:50] — QUICK WINS
──────────────────────────────────────
"The good news: most of these are fast fixes.

{wins_block}

You could close the top leak this week without hiring anyone."

[SHOW: relevant fix location on site]


[SEGMENT 5 · 1:50–2:05] — THE BRIDGE
──────────────────────────────────────
"Here's the thing — these are just the surface leaks.
The 12-point audit we ran checks messaging, signup friction,
pricing clarity, re-engagement, and analytics all together.

These {n} came out on top. But fixing them in isolation
without building the machine underneath won't compound.
That's what we do after the leak-close."


[SEGMENT 6 · 2:05–2:20] — CLOSE
──────────────────────────────────
"I've attached the full audit PDF in the description below.
It has all {n} leaks, the dollar ranges, and the exact fixes.

If you want us to implement everything — not just the quick wins,
but the full growth system underneath — the link to get started is:
{cta_url}

Either way, fix Leak 01 this week. That one's costing you the most."

[END SCREEN: show audit PDF cover or your logo]

────────────────────────────────────────────────────────────────────────
FOLLOW-UP EMAIL SUBJECT LINE IDEAS:
  • "Your {domain} audit — {n} revenue leak{'s' if n != 1 else ''} found ({total_low}–{total_high}/mo)"
  • "{n} things I found on {domain} in 5 minutes"
  • "The leak costing {domain} {leaks[0]['monthly_loss_low'] if leaks else 'X'}–{leaks[0]['monthly_loss_high'] if leaks else 'Y'}/mo"
────────────────────────────────────────────────────────────────────────
"""
    return script
