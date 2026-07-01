#!/usr/bin/env python3
"""
TitanLeap Pre-Audit Enrichment
================================
Drop in a prospect's URL. Get back JSON that pre-fills the 6 audit sections
on the Audit screen, plus auto-detected revenue leaks before the call.

Usage:
    python enrich_audit.py https://someprospect.com
    python enrich_audit.py https://someprospect.com --save out.json

What it does (from the homepage + a few key pages):
    - Business Basics ...... name, tagline, what they sell, contact, location
    - Social Media ......... linked socials + whether links are real or dead (#)
    - Offer ................ pricing tiers, plan names, free trial / audit
    - Revenue & Goals ...... inferred signals (price points, scale cues)
    - Funnel ............... primary CTA, dead-link detection, signup path
    - Content & Ads ........ blog/video presence, tracking pixels (Meta/GA/etc.)

It also flags LEAKS — concrete, scary-specific things to open the audit with.
No API keys. Pure scrape. Run locally.
"""

import sys
import re
import json
import argparse
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0 Safari/537.36"
}

PRICE_RE = re.compile(r"\$\s?[\d,]+(?:\.\d{2})?(?:\s?/\s?(?:mo|month|yr|year))?", re.I)
SOCIAL_DOMAINS = {
    "twitter.com": "Twitter/X", "x.com": "Twitter/X",
    "linkedin.com": "LinkedIn", "instagram.com": "Instagram",
    "facebook.com": "Facebook", "youtube.com": "YouTube",
    "tiktok.com": "TikTok", "github.com": "GitHub",
}
PIXELS = {
    "Meta Pixel": ["connect.facebook.net", "fbq("],
    "Google Analytics": ["googletagmanager.com", "google-analytics.com", "gtag("],
    "LinkedIn Insight": ["snap.licdn.com", "_linkedin_partner_id"],
    "TikTok Pixel": ["analytics.tiktok.com", "ttq."],
    "Hotjar": ["hotjar.com", "hj("],
}


def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        return r.text
    except Exception as e:
        return None


def text_of(soup):
    return " ".join(soup.get_text(" ").split())


def find_pricing_page(soup, base):
    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        if "pricing" in href or "plans" in href:
            return urljoin(base, a["href"])
    return None


def enrich(url):
    if not url.startswith("http"):
        url = "https://" + url
    base = url
    domain = urlparse(url).netloc.replace("www.", "")

    html = fetch(url)
    if html is None:
        return {"error": f"Could not fetch {url}"}

    soup = BeautifulSoup(html, "html.parser")
    body_text = text_of(soup)
    raw_lower = html.lower()

    out = {
        "source_url": url,
        "domain": domain,
        "business_basics": {},
        "social_media_presence": {},
        "offer": {},
        "revenue_goals": {},
        "funnel": {},
        "content_ads": {},
        "leaks_detected": [],
    }

    # ---- BUSINESS BASICS ----
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    desc_tag = soup.find("meta", attrs={"name": "description"})
    description = desc_tag["content"].strip() if desc_tag and desc_tag.get("content") else ""
    h1 = soup.find("h1")
    headline = " ".join(h1.get_text(" ").split()) if h1 else ""
    emails = sorted(set(re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", html)))
    out["business_basics"] = {
        "company_name": title.split("—")[0].split("|")[0].strip() or domain,
        "tagline": headline,
        "what_they_sell": description,
        "contact_email": emails[0] if emails else None,
    }

    # ---- SOCIAL MEDIA PRESENCE ----
    socials, dead_socials = {}, []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        for dom, name in SOCIAL_DOMAINS.items():
            if dom in href.lower():
                if href.strip() in ("#", "") or href.strip().endswith("#"):
                    dead_socials.append(name)
                else:
                    socials[name] = href
    # also catch labelled-but-dead social links (text says Twitter, href is #)
    for a in soup.find_all("a", href=True):
        label = a.get_text(" ").strip().lower()
        if a["href"].strip() == "#":
            for name in ("twitter", "linkedin", "instagram", "tiktok", "youtube", "facebook"):
                if name in label:
                    pretty = SOCIAL_DOMAINS.get(name + ".com", name.title())
                    if pretty not in socials:
                        dead_socials.append(pretty)
    out["social_media_presence"] = {
        "active_links": socials,
        "dead_or_placeholder_links": sorted(set(dead_socials)),
        "platforms_found": sorted(set(list(socials) + dead_socials)),
    }
    if dead_socials:
        out["leaks_detected"].append(
            f"Social links for {', '.join(sorted(set(dead_socials)))} point to a "
            f"placeholder (#) — visitors who want to vet you hit a dead end."
        )

    # ---- OFFER + PRICING (check pricing page too) ----
    prices = PRICE_RE.findall(body_text)
    pricing_url = find_pricing_page(soup, base)
    if pricing_url and pricing_url != url:
        phtml = fetch(pricing_url)
        if phtml:
            prices += PRICE_RE.findall(text_of(BeautifulSoup(phtml, "html.parser")))
    prices = sorted(set(p.replace(" ", "") for p in prices))
    has_free = bool(re.search(r"\bfree\b.*(trial|audit|plan|demo)", body_text, re.I))
    out["offer"] = {
        "price_points_found": prices,
        "free_entry_offer": has_free,
        "pricing_page": pricing_url,
    }
    if not prices:
        out["leaks_detected"].append(
            "No pricing visible on the site — buyers can't self-qualify, "
            "so they bounce instead of booking."
        )

    # ---- REVENUE & GOALS (inferred) ----
    numeric_prices = [int(re.sub(r"[^\d]", "", p)) for p in prices if re.sub(r"[^\d]", "", p)]
    out["revenue_goals"] = {
        "lowest_price": min(numeric_prices) if numeric_prices else None,
        "highest_price": max(numeric_prices) if numeric_prices else None,
        "tier_count": len(numeric_prices),
        "note": "Inferred from public pricing — confirm actual MRR/goals on the call.",
    }

    # ---- FUNNEL ----
    ctas, dead_ctas = [], 0
    cta_words = ("get", "start", "book", "demo", "audit", "try", "sign up", "buy", "join")
    for a in soup.find_all("a", href=True):
        label = " ".join(a.get_text(" ").split())
        if label and any(w in label.lower() for w in cta_words) and len(label) < 40:
            target = a["href"].strip()
            ctas.append({"label": label, "href": target})
            if target == "#" or target == "" or target.endswith("/#"):
                dead_ctas += 1
    primary = ctas[0]["label"] if ctas else None
    out["funnel"] = {
        "primary_cta": primary,
        "cta_count": len(ctas),
        "dead_ctas": dead_ctas,
        "ctas": ctas[:10],
    }
    if dead_ctas and dead_ctas >= max(1, len(ctas) // 2):
        out["leaks_detected"].append(
            f"{dead_ctas} of {len(ctas)} call-to-action buttons go to a dead anchor (#) — "
            f"the site looks ready to sell but no button actually converts a visitor."
        )

    # ---- CONTENT & ADS ----
    has_blog = bool(re.search(r"/blog|/articles|/resources", raw_lower))
    has_video = bool(soup.find("video")) or ".mp4" in raw_lower
    pixels_found = [name for name, sigs in PIXELS.items() if any(s in raw_lower for s in sigs)]
    out["content_ads"] = {
        "blog_detected": has_blog,
        "video_on_page": has_video,
        "tracking_pixels": pixels_found,
    }
    if not pixels_found:
        out["leaks_detected"].append(
            "No tracking pixel detected (Meta/GA/etc.) — they can't retarget visitors "
            "or measure what's working, so every ad dollar flies blind."
        )
    if not has_blog:
        out["leaks_detected"].append(
            "No blog/content engine found — zero organic SEO surface, "
            "100% dependent on paid or outbound for traffic."
        )

    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", help="Prospect website URL")
    ap.add_argument("--save", help="Write JSON to this file")
    args = ap.parse_args()

    result = enrich(args.url)
    pretty = json.dumps(result, indent=2)
    print(pretty)

    if args.save:
        with open(args.save, "w") as f:
            f.write(pretty)
        print(f"\nSaved -> {args.save}", file=sys.stderr)


if __name__ == "__main__":
    main()
