#!/usr/bin/env python3
"""Database Audit Tool - Analyse customer database health and reactivation potential.

Analyses a CSV or JSON customer database file and outputs a comprehensive
health report including: total contacts, email validity estimate, segmentation
breakdown, data completeness score, and estimated reactivation revenue.

Usage:
    python database_audit.py --input customers.csv
    python database_audit.py --input customers.json --aov 50000 --currency NGN
    python database_audit.py --input data.csv --output report.md
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timedelta
from collections import Counter


def parse_args():
    parser = argparse.ArgumentParser(
        description="Analyse customer database health and estimate reactivation revenue.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  python database_audit.py --input customers.csv
  python database_audit.py --input data.json --aov 50000 --currency NGN
  python database_audit.py --input data.csv --output audit_report.md

Expected CSV/JSON fields (flexible matching):
  email, name/first_name, last_purchase_date/last_order_date,
  total_spent/lifetime_value, phone, company, city/location
"""
    )
    parser.add_argument("--input", "-i", required=True, help="Path to CSV or JSON customer database file")
    parser.add_argument("--output", "-o", default=None, help="Output file path for report (default: stdout)")
    parser.add_argument("--aov", type=float, default=50000, help="Average order value for revenue estimation (default: 50000)")
    parser.add_argument("--currency", default="NGN", help="Currency symbol for report (default: NGN)")
    parser.add_argument("--reactivation-rate", type=float, default=0.15, help="Expected reactivation rate (default: 0.15)")
    return parser.parse_args()


def load_data(filepath):
    """Load customer data from CSV or JSON file."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".json":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                # Handle {"customers": [...]} or {"data": [...]}
                for key in ["customers", "data", "contacts", "records"]:
                    if key in data:
                        return data[key]
                return [data]
            return data
    elif ext == ".csv":
        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            return [row for row in reader]
    else:
        print(f"Error: Unsupported file format '{ext}'. Use .csv or .json")
        sys.exit(1)


def find_field(record, candidates):
    """Find a field value by trying multiple possible column names."""
    for candidate in candidates:
        for key in record:
            if key.lower().strip().replace(" ", "_") == candidate.lower():
                return record[key]
    return None


def validate_email(email):
    """Basic email validation."""
    if not email or not isinstance(email, str):
        return False
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email.strip()))


def is_disposable_domain(email):
    """Check if email uses a known disposable domain."""
    disposable = {
        "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
        "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
        "dispostable.com", "trashmail.com", "10minutemail.com", "temp-mail.org"
    }
    try:
        domain = email.strip().split("@")[1].lower()
        return domain in disposable
    except (IndexError, AttributeError):
        return False


def parse_date(date_str):
    """Try to parse a date string in common formats."""
    if not date_str or not isinstance(date_str, str):
        return None
    date_str = date_str.strip()
    formats = [
        "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ",
        "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
        "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y",
        "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def analyse_database(records, aov, currency, reactivation_rate):
    """Run full analysis on customer records."""
    now = datetime.now()
    total = len(records)

    # --- Email Analysis ---
    emails = []
    valid_emails = 0
    invalid_emails = 0
    missing_emails = 0
    disposable_emails = 0
    duplicate_emails = set()
    seen_emails = set()

    for r in records:
        email = find_field(r, ["email", "email_address", "e-mail", "e_mail"])
        if not email or not str(email).strip():
            missing_emails += 1
            continue
        email = str(email).strip().lower()
        emails.append(email)
        if email in seen_emails:
            duplicate_emails.add(email)
        seen_emails.add(email)
        if validate_email(email):
            if is_disposable_domain(email):
                disposable_emails += 1
            else:
                valid_emails += 1
        else:
            invalid_emails += 1

    # --- Date / Segmentation Analysis ---
    date_fields = ["last_purchase_date", "last_order_date", "last_activity",
                   "last_purchase", "last_transaction", "date", "last_active"]
    active = 0
    dormant_30_60 = 0
    dormant_90_180 = 0
    dormant_180_365 = 0
    dormant_365_plus = 0
    no_date = 0
    prospects = 0

    spend_fields = ["total_spent", "lifetime_value", "total_revenue",
                    "revenue", "ltv", "total_spend", "amount"]
    total_spend = 0.0
    spend_count = 0
    vip_threshold = 0
    spends = []

    for r in records:
        # Date analysis
        date_str = find_field(r, date_fields)
        dt = parse_date(str(date_str)) if date_str else None
        if dt is None:
            no_date += 1
            prospects += 1
            continue
        days_ago = (now - dt).days
        if days_ago <= 90:
            active += 1
        elif days_ago <= 60:
            dormant_30_60 += 1
        elif days_ago <= 180:
            dormant_90_180 += 1
        elif days_ago <= 365:
            dormant_180_365 += 1
        else:
            dormant_365_plus += 1

        # Spend analysis
        spend_str = find_field(r, spend_fields)
        if spend_str:
            try:
                spend = float(str(spend_str).replace(",", "").replace(currency, "").strip())
                spends.append(spend)
                total_spend += spend
                spend_count += 1
            except (ValueError, TypeError):
                pass

    if spends:
        spends.sort(reverse=True)
        vip_threshold = spends[max(0, len(spends) // 5 - 1)] if len(spends) >= 5 else spends[0]

    # --- Data Completeness ---
    field_checks = {
        "email": ["email", "email_address"],
        "name": ["name", "first_name", "full_name", "customer_name"],
        "phone": ["phone", "phone_number", "mobile", "tel"],
        "last_purchase": date_fields,
        "total_spent": spend_fields,
        "company": ["company", "company_name", "organization", "business"],
        "location": ["city", "location", "state", "country", "address"],
    }
    completeness = {}
    for label, candidates in field_checks.items():
        filled = sum(1 for r in records if find_field(r, candidates))
        completeness[label] = filled / total * 100 if total > 0 else 0

    overall_completeness = sum(completeness.values()) / len(completeness) if completeness else 0

    # --- Revenue Estimation ---
    total_dormant = dormant_30_60 + dormant_90_180 + dormant_180_365 + dormant_365_plus
    valid_rate = valid_emails / total if total > 0 else 0.75
    reachable_dormant = int(total_dormant * valid_rate)
    estimated_reactivations = int(reachable_dormant * reactivation_rate)
    estimated_revenue = estimated_reactivations * aov

    # Conservative / moderate / aggressive
    rev_conservative = int(reachable_dormant * 0.10 * aov)
    rev_moderate = int(reachable_dormant * 0.15 * aov)
    rev_aggressive = int(reachable_dormant * 0.25 * aov)

    # --- Build Report ---
    report = []
    report.append("# Database Audit Report")
    report.append("")
    report.append("**Generated:** " + now.strftime("%Y-%m-%d %H:%M"))
    report.append("")
    report.append(f"**Source file:** `{os.path.basename(args.input)}`")
    report.append(f"**Total records:** {total:,}")
    report.append("")

    report.append("## Email Health")
    report.append("")
    report.append(f"| Metric | Count | % |")
    report.append(f"|---|---|---|")
    report.append(f"| Valid emails | {valid_emails:,} | {valid_emails/total*100:.1f}% |")
    report.append(f"| Invalid emails | {invalid_emails:,} | {invalid_emails/total*100:.1f}% |")
    report.append(f"| Missing emails | {missing_emails:,} | {missing_emails/total*100:.1f}% |")
    report.append(f"| Disposable emails | {disposable_emails:,} | {disposable_emails/total*100:.1f}% |")
    report.append(f"| Duplicate emails | {len(duplicate_emails):,} | {len(duplicate_emails)/total*100:.1f}% |")
    report.append("")
    health = "🟢 Good" if valid_emails/total > 0.8 else "🟡 Fair" if valid_emails/total > 0.6 else "🔴 Poor"
    report.append(f"**Email health rating:** {health}")
    report.append("")
    report.append("**Generated:** " + now.strftime("%Y-%m-%d %H:%M"))
    report.append("")
    report.append("")

    report.append("## Segmentation Breakdown")
    report.append("")
    report.append(f"| Segment | Count | % | Priority |")
    report.append(f"|---|---|---|---|")
    report.append(f"| Active (0-90 days) | {active:,} | {active/total*100:.1f}% | Upsell/cross-sell |")
    report.append(f"| Recently lapsed (30-60 days) | {dormant_30_60:,} | {dormant_30_60/total*100:.1f}% | 🔴 Highest |")
    report.append(f"| Dormant (90-180 days) | {dormant_90_180:,} | {dormant_90_180/total*100:.1f}% | 🟡 High |")
    report.append(f"| Long dormant (180-365 days) | {dormant_180_365:,} | {dormant_180_365/total*100:.1f}% | 🟠 Medium |")
    report.append(f"| Deep freeze (365+ days) | {dormant_365_plus:,} | {dormant_365_plus/total*100:.1f}% | 🔵 Low |")
    report.append(f"| Prospects (no purchase date) | {prospects:,} | {prospects/total*100:.1f}% | Nurture |")
    report.append("")
    report.append(f"**Total reactivation targets:** {total_dormant:,} ({total_dormant/total*100:.1f}%)")
    report.append("")

    if spend_count > 0:
        report.append("## Spend Analysis")
        report.append("")
        report.append(f"| Metric | Value |")
        report.append(f"|---|---|")
        report.append(f"| Customers with spend data | {spend_count:,} |")
        report.append(f"| Total lifetime spend | {currency} {total_spend:,.0f} |")
        report.append(f"| Average spend | {currency} {total_spend/spend_count:,.0f} |")
        report.append(f"| VIP threshold (top 20%) | {currency} {vip_threshold:,.0f} |")
        report.append(f"| VIP count | {len([s for s in spends if s >= vip_threshold]):,} |")
        report.append("")

    report.append("## Data Completeness")
    report.append("")
    report.append(f"| Field | Filled | Score |")
    report.append(f"|---|---|---|")
    for field, pct in completeness.items():
        bar = "🟢" if pct > 80 else "🟡" if pct > 50 else "🔴"
        report.append(f"| {field} | {pct:.0f}% | {bar} |")
    report.append("")
    score_emoji = "🟢" if overall_completeness > 70 else "🟡" if overall_completeness > 50 else "🔴"
    report.append(f"**Overall completeness:** {overall_completeness:.0f}% {score_emoji}")
    report.append("")

    report.append("## Revenue Estimation")
    report.append("")
    report.append(f"| Scenario | Reactivation Rate | Est. Reactivations | Est. Revenue |")
    report.append(f"|---|---|---|---|")
    report.append(f"| Conservative | 10% | {int(reachable_dormant*0.10):,} | {currency} {rev_conservative:,} |")
    report.append(f"| Moderate | 15% | {int(reachable_dormant*0.15):,} | {currency} {rev_moderate:,} |")
    report.append(f"| Aggressive | 25% | {int(reachable_dormant*0.25):,} | {currency} {rev_aggressive:,} |")
    report.append("")
    report.append(f"*Based on {reachable_dormant:,} reachable dormant contacts × {currency} {aov:,.0f} AOV*")
    report.append("")
    report.append(f"> 💰 **At zero ad cost, this is pure profit minus email platform fees.**")
    report.append("")

    report.append("## Recommendations")
    report.append("")
    if valid_emails / total < 0.8:
        report.append("1. **Clean email list** — Run through NeverBounce/ZeroBounce before any sends")
    if overall_completeness < 60:
        report.append("2. **Enrich data** — Fill missing fields (name, phone, purchase history)")
    if dormant_90_180 + dormant_30_60 > 0:
        report.append("3. **Priority targets** — Start with recently lapsed and 90-180 day dormant")
    if len(duplicate_emails) > 0:
        report.append(f"4. **De-duplicate** — {len(duplicate_emails)} duplicate emails found")
    report.append(f"5. **Launch reactivation** — Use the 10-word email first for highest response")
    report.append(f"6. **Omnichannel** — Follow up non-responders via WhatsApp/SMS")
    report.append("")

    return "\n".join(report)


if __name__ == "__main__":
    args = parse_args()

    if not os.path.exists(args.input):
        print(f"Error: File not found: {args.input}")
        sys.exit(1)

    records = load_data(args.input)
    if not records:
        print("Error: No records found in file")
        sys.exit(1)

    report = analyse_database(records, args.aov, args.currency, args.reactivation_rate)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Report saved to {args.output}")
    else:
        print(report)
