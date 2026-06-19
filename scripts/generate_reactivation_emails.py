#!/usr/bin/env python3
"""Generate Reactivation Email Sequences - AI-powered personalised email generation.

Generates a complete 6-email reactivation sequence personalised to a brand,
product/service, and customer segment using OpenRouter API.

Usage:
    python generate_reactivation_emails.py --brand "Acme Corp" --service "consulting"
    python generate_reactivation_emails.py --brand "ShopNG" --service "fashion retail" --segment dormant-90
    python generate_reactivation_emails.py --brand "TechCo" --service "SaaS" --output emails.md

Requires:
    OPENROUTER_API_KEY environment variable set
"""

import argparse
import json
import os
import subprocess
import sys


MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1:free"
API_URL = "https://openrouter.ai/api/v1/chat/completions"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate personalised reactivation email sequences using AI.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Segment types:
  dormant-30    Recently lapsed (30-60 days inactive)
  dormant-90    Dormant (90-180 days inactive)
  dormant-180   Long dormant (180-365 days inactive)
  dormant-365   Deep freeze (365+ days inactive)
  prospect      Never purchased, showed interest
  vip-lapsed    High-value customer gone inactive
  one-time      Single purchase, never returned

Examples:
  python generate_reactivation_emails.py --brand "Acme" --service "consulting"
  python generate_reactivation_emails.py --brand "ShopNG" --service "fashion" --segment vip-lapsed
  python generate_reactivation_emails.py --brand "TechCo" --service "SaaS" --output emails.md --tone professional
"""
    )
    parser.add_argument("--brand", "-b", required=True, help="Brand/company name")
    parser.add_argument("--service", "-s", required=True, help="Product or service description")
    parser.add_argument("--segment", default="dormant-90",
                        choices=["dormant-30", "dormant-90", "dormant-180", "dormant-365",
                                 "prospect", "vip-lapsed", "one-time"],
                        help="Customer segment type (default: dormant-90)")
    parser.add_argument("--tone", default="warm",
                        choices=["warm", "professional", "casual", "urgent"],
                        help="Email tone (default: warm)")
    parser.add_argument("--include-whatsapp", action="store_true",
                        help="Also generate WhatsApp message variants")
    parser.add_argument("--output", "-o", default=None, help="Output file path (default: stdout)")
    return parser.parse_args()


def call_openrouter(prompt, system_prompt):
    """Call OpenRouter API using curl subprocess."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("Error: OPENROUTER_API_KEY environment variable not set")
        sys.exit(1)

    payload = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 4000
    })

    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST", API_URL,
            "-H", f"Authorization: Bearer {api_key}",
            "-H", "Content-Type: application/json",
            "-H", "HTTP-Referer: https://agent-zero.dev",
            "-d", payload
        ],
        capture_output=True, text=True, timeout=120
    )

    if result.returncode != 0:
        print(f"Error calling API: {result.stderr}")
        sys.exit(1)

    try:
        response = json.loads(result.stdout)
        if "error" in response:
            print(f"API error: {response['error']}")
            sys.exit(1)
        return response["choices"][0]["message"]["content"]
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"Error parsing API response: {e}")
        print(f"Raw response: {result.stdout[:500]}")
        sys.exit(1)


def build_prompt(brand, service, segment, tone, include_whatsapp):
    """Build the generation prompt."""
    segment_descriptions = {
        "dormant-30": "recently lapsed customers (30-60 days since last purchase) who just need a gentle nudge",
        "dormant-90": "dormant customers (90-180 days inactive) who need re-engagement with a soft incentive",
        "dormant-180": "long-dormant customers (180-365 days inactive) who need re-introduction with a strong incentive",
        "dormant-365": "deep-freeze customers (365+ days inactive) who need a last-chance compelling offer",
        "prospect": "prospects who showed interest but never purchased (signed up, enquired, downloaded)",
        "vip-lapsed": "high-value VIP customers who were top spenders but have gone inactive",
        "one-time": "one-time buyers who made a single purchase and never returned"
    }

    segment_desc = segment_descriptions.get(segment, segment_descriptions["dormant-90"])

    whatsapp_section = """

Also generate 4 WhatsApp message variants for the same segment:
1. The Check-In (casual, personal, no selling)
2. The Value Drop (share a useful tip or resource)
3. The Exclusive Offer (WhatsApp-only deal)
4. The Voice Note Script (script for a personal voice message)

Format WhatsApp messages with emoji, keep under 300 characters each.
""" if include_whatsapp else ""

    prompt = f"""Generate a complete 6-email reactivation sequence for:

**Brand:** {brand}
**Product/Service:** {service}
**Target Segment:** {segment_desc}
**Tone:** {tone}

Create these 6 emails in order:

1. **The 10-Word Email** — Ultra-short, personal, question-based.
   Format: "Are you still looking for help with [specific thing]?"
   No images, no links, plain text feel.

2. **The "We Miss You" Email** — Personal, warm, no hard selling.
   Acknowledge the gap, express genuine interest in their wellbeing.

3. **The Exclusive Offer Email** — Time-limited incentive for return.
   Create urgency with a specific deadline (7 days).
   Include a clear, compelling offer.

4. **The Value Reminder Email** — Remind them of results/benefits.
   Reference specific outcomes they achieved or could achieve.
   Include a mini case study or testimonial.

5. **The Personal Video Email** — Short personal message concept.
   Write the email that frames a personal Loom/video message.
   Include a script outline for the video (30-60 seconds).

6. **The Final Chance Email** — Last attempt before reducing contact.
   Be honest about this being the last email.
   Give them a clear choice: stay or unsubscribe.

For EACH email provide:
- **Subject line** (and 2 alternatives)
- **Preview text** (40-90 characters)
- **Body copy** (complete, ready to send)
- **CTA** (primary call to action)
- **Send timing** (days after sequence start)
- **Notes** (personalisation tips, A/B test ideas)
{whatsapp_section}
Format the output as clean Markdown with clear headers for each email.
"""
    return prompt


def main():
    args = parse_args()

    system_prompt = """You are an expert email copywriter specialising in customer
reactivation and win-back campaigns. You write emails that feel personal and
human, not corporate or salesy. You understand that reactivation emails must
cut through inbox noise with brevity, relevance, and genuine care.

Your emails consistently achieve 30-40% open rates and 10-15% reply rates.
You follow direct response principles while maintaining brand warmth."""

    prompt = build_prompt(args.brand, args.service, args.segment,
                          args.tone, args.include_whatsapp)

    header = f"""# Reactivation Email Sequence

**Brand:** {args.brand}
**Service:** {args.service}
**Segment:** {args.segment}
**Tone:** {args.tone}
**Generated:** {__import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M")}

---

"""

    print(f"Generating reactivation emails for {args.brand}...", file=sys.stderr)
    result = call_openrouter(prompt, system_prompt)
    output = header + result

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Email sequence saved to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
