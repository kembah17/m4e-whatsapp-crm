#!/usr/bin/env python3
"""Segment Database - Segment customer database by inactivity duration and value.

Takes a CSV customer database, segments contacts by inactivity duration
and customer value, outputs segmented lists as separate CSV files.

Usage:
    python segment_database.py --input customers.csv --output segments/
    python segment_database.py --input data.csv --output segments/ --date-field last_purchase_date
    python segment_database.py --input data.csv --output segments/ --format json

Requires:
    CSV with at minimum: email, last_purchase_date (or similar date field)
    Optional: total_spent/lifetime_value for value-based segmentation
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timedelta
from collections import defaultdict


def parse_args():
    parser = argparse.ArgumentParser(
        description="Segment customer database by inactivity duration and value.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Output segments:
  active.csv           - Purchased within last 90 days
  recently-lapsed.csv  - 30-60 days since last purchase
  dormant-90.csv       - 90-180 days inactive
  dormant-180.csv      - 180-365 days inactive
  deep-freeze.csv      - 365+ days inactive
  prospects.csv        - No purchase date (never bought)
  vip-lapsed.csv       - Top 20% spenders who are now inactive
  one-time-buyers.csv  - Single purchase, never returned

Examples:
  python segment_database.py --input customers.csv --output segments/
  python segment_database.py --input data.csv --output out/ --date-field last_order
  python segment_database.py --input data.csv --output out/ --format json
"""
    )
    parser.add_argument("--input", "-i", required=True, help="Path to CSV customer database")
    parser.add_argument("--output", "-o", required=True, help="Output directory for segmented files")
    parser.add_argument("--date-field", default=None,
                        help="Name of the date column (auto-detected if not specified)")
    parser.add_argument("--spend-field", default=None,
                        help="Name of the spend/value column (auto-detected if not specified)")
    parser.add_argument("--order-count-field", default=None,
                        help="Name of the order count column (auto-detected if not specified)")
    parser.add_argument("--format", choices=["csv", "json"], default="csv",
                        help="Output format (default: csv)")
    parser.add_argument("--summary", action="store_true",
                        help="Also generate a summary report")
    return parser.parse_args()


def find_field(headers, candidates):
    """Find a column name by trying multiple possible names."""
    for candidate in candidates:
        for header in headers:
            if header.lower().strip().replace(" ", "_").replace("-", "_") == candidate.lower():
                return header
    return None


def parse_date(date_str):
    """Try to parse a date string in common formats."""
    if not date_str or not isinstance(date_str, str) or not date_str.strip():
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


def parse_number(val):
    """Parse a numeric value from string, handling currency symbols and commas."""
    if not val or not isinstance(val, str):
        return None
    cleaned = re.sub(r"[^\d.\-]", "", val.strip())
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def load_csv(filepath):
    """Load CSV file and return headers + records."""
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        records = [row for row in reader]
    return headers, records


def write_segment(records, headers, filepath, fmt="csv"):
    """Write a segment to file."""
    if not records:
        return 0
    if fmt == "json":
        filepath = filepath.replace(".csv", ".json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, default=str)
    else:
        with open(filepath, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(records)
    return len(records)


def main():
    args = parse_args()

    if not os.path.exists(args.input):
        print(f"Error: File not found: {args.input}")
        sys.exit(1)

    os.makedirs(args.output, exist_ok=True)

    headers, records = load_csv(args.input)
    if not records:
        print("Error: No records found in file")
        sys.exit(1)

    total = len(records)
    print(f"Loaded {total:,} records from {args.input}")

    # Auto-detect fields
    date_candidates = ["last_purchase_date", "last_order_date", "last_activity",
                       "last_purchase", "last_transaction", "last_order", "last_active",
                       "last_activity_date", "date"]
    spend_candidates = ["total_spent", "lifetime_value", "total_revenue",
                        "revenue", "ltv", "total_spend", "amount", "total_amount"]
    order_candidates = ["order_count", "orders", "total_orders", "purchase_count",
                        "num_orders", "transactions"]

    date_col = args.date_field or find_field(headers, date_candidates)
    spend_col = args.spend_field or find_field(headers, spend_candidates)
    order_col = args.order_count_field or find_field(headers, order_candidates)

    if not date_col:
        print("Warning: No date column detected. All records without dates will be classified as prospects.")
        print(f"  Available columns: {', '.join(headers)}")
        print(f"  Use --date-field to specify the correct column.")

    if date_col:
        print(f"  Date field: {date_col}")
    if spend_col:
        print(f"  Spend field: {spend_col}")
    if order_col:
        print(f"  Order count field: {order_col}")

    now = datetime.now()

    # Compute VIP threshold (top 20% by spend)
    vip_threshold = 0
    if spend_col:
        spends = []
        for r in records:
            val = parse_number(r.get(spend_col, ""))
            if val is not None and val > 0:
                spends.append(val)
        if spends:
            spends.sort(reverse=True)
            vip_idx = max(0, len(spends) // 5 - 1)
            vip_threshold = spends[vip_idx]
            print(f"  VIP threshold (top 20%): {vip_threshold:,.2f}")

    # Segment records
    segments = {
        "active": [],
        "recently-lapsed": [],
        "dormant-90": [],
        "dormant-180": [],
        "deep-freeze": [],
        "prospects": [],
        "vip-lapsed": [],
        "one-time-buyers": [],
    }

    for r in records:
        # Parse date
        dt = None
        if date_col:
            dt = parse_date(r.get(date_col, ""))

        # Parse spend
        spend = None
        if spend_col:
            spend = parse_number(r.get(spend_col, ""))

        # Parse order count
        orders = None
        if order_col:
            orders = parse_number(r.get(order_col, ""))

        # No date = prospect
        if dt is None:
            segments["prospects"].append(r)
            continue

        days_ago = (now - dt).days

        # Determine inactivity segment
        if days_ago <= 90:
            segments["active"].append(r)
        elif days_ago <= 60:
            segments["recently-lapsed"].append(r)
        elif days_ago <= 180:
            segments["dormant-90"].append(r)
        elif days_ago <= 365:
            segments["dormant-180"].append(r)
        else:
            segments["deep-freeze"].append(r)

        # Check for VIP lapsed (inactive + high spend)
        if days_ago > 90 and spend is not None and spend >= vip_threshold and vip_threshold > 0:
            segments["vip-lapsed"].append(r)

        # Check for one-time buyers
        if orders is not None and orders == 1 and days_ago > 90:
            segments["one-time-buyers"].append(r)

    # Add enrichment columns to headers
    enriched_headers = list(headers)
    if "_segment" not in enriched_headers:
        enriched_headers.append("_segment")
    if "_days_inactive" not in enriched_headers:
        enriched_headers.append("_days_inactive")
    if "_priority" not in enriched_headers:
        enriched_headers.append("_priority")

    priority_map = {
        "active": "Upsell/Cross-sell",
        "recently-lapsed": "Highest",
        "dormant-90": "High",
        "dormant-180": "Medium",
        "deep-freeze": "Low",
        "prospects": "Nurture",
        "vip-lapsed": "Highest (VIP)",
        "one-time-buyers": "High",
    }

    # Write segments
    ext = ".json" if args.format == "json" else ".csv"
    print(f"\nSegmentation results:")
    print(f"{'Segment':<25} {'Count':>8} {'%':>8}")
    print("-" * 43)

    total_written = 0
    for seg_name, seg_records in segments.items():
        # Enrich records
        for r in seg_records:
            r["_segment"] = seg_name
            dt = parse_date(r.get(date_col, "")) if date_col else None
            r["_days_inactive"] = str((now - dt).days) if dt else "N/A"
            r["_priority"] = priority_map.get(seg_name, "")

        filepath = os.path.join(args.output, f"{seg_name}{ext}")
        count = write_segment(seg_records, enriched_headers, filepath, args.format)
        pct = count / total * 100 if total > 0 else 0
        status = f"  → {filepath}" if count > 0 else "  (empty, skipped)"
        print(f"{seg_name:<25} {count:>8,} {pct:>7.1f}%{status}")
        total_written += count

    print("-" * 43)
    print(f"{'Total':<25} {total_written:>8,}")
    # Note: total_written may exceed total because VIP-lapsed and one-time-buyers
    # overlap with inactivity segments
    if total_written > total:
        overlap = total_written - total
        print(f"\nNote: {overlap:,} records appear in multiple segments")
        print(f"  (VIP-lapsed and one-time-buyers overlap with inactivity segments)")

    # Summary report
    if args.summary:
        summary_path = os.path.join(args.output, f"segmentation-summary.md")
        lines = []
        lines.append("# Segmentation Summary")
        lines.append(f"\n**Source:** `{os.path.basename(args.input)}`")
        lines.append(f"**Date:** {now.strftime('{}')}\n".format("%Y-%m-%d %H:%M"))
        lines.append(f"**Total records:** {total:,}\n")
        lines.append("| Segment | Count | % | Priority | Action |")
        lines.append("|---|---|---|---|---|")
        actions = {
            "active": "Upsell, cross-sell, referral request",
            "recently-lapsed": "Gentle reminder, no incentive needed",
            "dormant-90": "Personal outreach + soft incentive",
            "dormant-180": "Re-introduction + strong incentive",
            "deep-freeze": "Last-chance campaign, then archive",
            "prospects": "Nurture sequence → convert",
            "vip-lapsed": "Personal email/call from founder",
            "one-time-buyers": "Related product recommendation",
        }
        for seg_name, seg_records in segments.items():
            count = len(seg_records)
            pct = count / total * 100 if total > 0 else 0
            action = actions.get(seg_name, "")
            priority = priority_map.get(seg_name, "")
            lines.append(f"| {seg_name} | {count:,} | {pct:.1f}% | {priority} | {action} |")
        lines.append("")
        lines.append("## Recommended Next Steps")
        lines.append("")
        lines.append("1. **Start with VIP-lapsed** — Highest revenue potential per contact")
        lines.append("2. **Then recently-lapsed** — Easiest to win back")
        lines.append("3. **Then dormant-90** — Good response rates with soft incentive")
        lines.append("4. **Use 10-word email first** — \"Are you still looking for help with [X]?\"")
        lines.append("5. **Follow up non-responders** — WhatsApp/SMS after 3 days")
        lines.append("")

        with open(summary_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"\nSummary report saved to {summary_path}")

    print(f"\nDone. Segmented files saved to {args.output}/")


if __name__ == "__main__":
    main()
