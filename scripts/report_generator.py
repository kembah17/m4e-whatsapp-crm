#!/usr/bin/env python3
"""
M4E Campaign Report Generator
==============================

CLI tool for generating branded PDF reports from the Marketing4Effect
Customer Reactivation Manager CRM.

Usage:
    # Monthly report
    python report_generator.py monthly \\
        --account-id UUID --month 2026-06 --output /path/to/output/

    # End-of-campaign report
    python report_generator.py end-campaign \\
        --account-id UUID --campaign-start 2026-01 --campaign-end 2026-06 \\
        --output /path/to/output/

    # Dry-run (sample data, no Supabase connection)
    python report_generator.py monthly \\
        --account-id test --month 2026-06 --output /tmp/test_report/ --dry-run

Author: Marketing4Effect (M4E)
Version: 1.0.0
"""

import argparse
import os
import sys
from datetime import datetime, date
from typing import Any, Dict, List, Optional

# Ensure the scripts directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from report_utils import (
    SupabaseClient,
    ReportDataFetcher,
    build_contact_profiles,
    compute_monthly_metrics,
    compute_campaign_metrics,
    generate_sample_data,
    format_currency,
    format_percentage,
)
from report_templates import (
    generate_monthly_report,
    generate_campaign_report,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _month_range(month_str: str):
    """Return (start_iso, end_iso) for a YYYY-MM month string."""
    year, month = int(month_str[:4]), int(month_str[5:7])
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start.isoformat(), end.isoformat()


def _fetch_account_name(client: SupabaseClient, account_id: str) -> str:
    """Try to fetch the account name from the accounts table."""
    try:
        rows = client.query("accounts", {"id": f"eq.{account_id}", "select": "name"})
        if rows:
            return rows[0].get("name", "Client")
    except Exception:
        pass
    return "Client"


def _print_summary(metrics: Dict[str, Any], mode: str) -> None:
    """Print a human-readable summary to stdout."""
    es = metrics.get("executive_summary", {})
    print("\n" + "=" * 60)
    print(f"  M4E REPORT SUMMARY ({mode.upper()})")
    print("=" * 60)
    print(f"  Total Contacts:        {es.get('total_contacts', 0):>8,}")
    print(f"  Active Customers:      {es.get('active_customers', 0):>8,}  ({es.get('active_pct', 0):.1f}%)")
    print(f"  Satisfaction Score:    {es.get('satisfaction_avg', 0):>8.1f} / 100")
    print(f"  Delighted:             {es.get('delighted_pct', 0):>7.1f}%")
    print(f"  Unhappy:               {es.get('unhappy_pct', 0):>7.1f}%")
    print(f"  Revenue (Satisfied):   {format_currency(es.get('revenue_from_satisfied', 0)):>12}")
    print(f"  Total Revenue:         {format_currency(es.get('total_revenue', 0)):>12}")
    print(f"  Recovery Rate:         {es.get('recovery_rate', 0):>7.1f}%")
    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# Monthly report flow
# ---------------------------------------------------------------------------
def run_monthly(
    account_id: str,
    month_str: str,
    output_dir: str,
    dry_run: bool = False,
) -> str:
    """Generate a monthly report. Returns the PDF filepath."""
    start_iso, end_iso = _month_range(month_str)
    print(f"[INFO] Generating monthly report for {month_str}")
    print(f"[INFO] Account: {account_id}")
    print(f"[INFO] Period:  {start_iso} to {end_iso}")

    if dry_run:
        print("[DRY RUN] Using sample data (no Supabase connection)")
        sample = generate_sample_data()
        account_name = "Sample Business Ltd"

        profiles = build_contact_profiles(
            contacts=sample["contacts"],
            conversations=sample["conversations"],
            messages=sample["messages"],
            deals=sample["deals"],
            purchases=sample["purchases"],
            contact_tags=sample["contact_tags"],
            reference_date=date(2026, 6, 30),
        )

        metrics = compute_monthly_metrics(
            profiles=profiles,
            purchases=sample["purchases"],
            deals=sample["deals"],
            broadcasts=sample["broadcasts"],
            broadcast_recipients=sample["broadcast_recipients"],
            products=sample["products"],
            pipeline_stages=sample["pipeline_stages"],
            prev_profiles=None,
        )
    else:
        client = SupabaseClient()
        fetcher = ReportDataFetcher(client, account_id)
        account_name = _fetch_account_name(client, account_id)

        print(f"[INFO] Account name: {account_name}")
        print("[INFO] Fetching data from Supabase...")

        contacts = fetcher.fetch_contacts(start_iso, end_iso)
        print(f"  Contacts:      {len(contacts)}")

        conversations = fetcher.fetch_conversations(start_iso, end_iso)
        print(f"  Conversations: {len(conversations)}")

        conv_ids = [c["id"] for c in conversations]
        messages = fetcher.fetch_messages_for_conversations(conv_ids)
        print(f"  Messages:      {len(messages)}")

        deals = fetcher.fetch_deals(start_iso, end_iso)
        print(f"  Deals:         {len(deals)}")

        pipeline_stages = fetcher.fetch_pipeline_stages()
        print(f"  Stages:        {len(pipeline_stages)}")

        broadcasts = fetcher.fetch_broadcasts(start_iso, end_iso)
        print(f"  Broadcasts:    {len(broadcasts)}")

        broadcast_ids = [b["id"] for b in broadcasts]
        broadcast_recipients = fetcher.fetch_broadcast_recipients(broadcast_ids)
        print(f"  Recipients:    {len(broadcast_recipients)}")

        products = fetcher.fetch_products()
        print(f"  Products:      {len(products)}")

        purchases = fetcher.fetch_purchases(start_iso, end_iso)
        print(f"  Purchases:     {len(purchases)}")

        contact_ids = [c["id"] for c in contacts]
        contact_tags = fetcher.fetch_contact_tags(contact_ids)
        print(f"  Tagged contacts: {len(contact_tags)}")

        client.close()

        ref_date = date(int(month_str[:4]), int(month_str[5:7]), 28)
        profiles = build_contact_profiles(
            contacts=contacts,
            conversations=conversations,
            messages=messages,
            deals=deals,
            purchases=purchases,
            contact_tags=contact_tags,
            reference_date=ref_date,
        )

        metrics = compute_monthly_metrics(
            profiles=profiles,
            purchases=purchases,
            deals=deals,
            broadcasts=broadcasts,
            broadcast_recipients=broadcast_recipients,
            products=products,
            pipeline_stages=pipeline_stages,
            prev_profiles=None,
        )

    _print_summary(metrics, "monthly")

    print("[INFO] Generating PDF...")
    filepath = generate_monthly_report(
        metrics=metrics,
        output_path=output_dir,
        account_name=account_name,
        month_str=month_str,
    )
    print(f"[OK] Report saved to: {filepath}")
    if dry_run:
        print("[DRY RUN] Report generated with sample data")
    return filepath


# ---------------------------------------------------------------------------
# End-of-campaign report flow
# ---------------------------------------------------------------------------
def run_end_campaign(
    account_id: str,
    campaign_start: str,
    campaign_end: str,
    output_dir: str,
    dry_run: bool = False,
) -> str:
    """Generate an end-of-campaign report. Returns the PDF filepath."""
    print(f"[INFO] Generating end-of-campaign report")
    print(f"[INFO] Account: {account_id}")
    print(f"[INFO] Period:  {campaign_start} to {campaign_end}")

    # Parse month range
    start_year, start_month = int(campaign_start[:4]), int(campaign_start[5:7])
    end_year, end_month = int(campaign_end[:4]), int(campaign_end[5:7])

    months: List[str] = []
    y, m = start_year, start_month
    while (y, m) <= (end_year, end_month):
        months.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1

    print(f"[INFO] Campaign spans {len(months)} months: {months[0]} to {months[-1]}")

    if dry_run:
        print("[DRY RUN] Using sample data (no Supabase connection)")
        account_name = "Sample Business Ltd"

        # Generate monthly metrics for each month
        monthly_metrics_list: List[Dict[str, Any]] = []
        for i, month_str in enumerate(months):
            sample = generate_sample_data()
            profiles = build_contact_profiles(
                contacts=sample["contacts"],
                conversations=sample["conversations"],
                messages=sample["messages"],
                deals=sample["deals"],
                purchases=sample["purchases"],
                contact_tags=sample["contact_tags"],
                reference_date=date(int(month_str[:4]), int(month_str[5:7]), 28),
            )
            prev = monthly_metrics_list[-1].get("_profiles") if monthly_metrics_list else None
            metrics = compute_monthly_metrics(
                profiles=profiles,
                purchases=sample["purchases"],
                deals=sample["deals"],
                broadcasts=sample["broadcasts"],
                broadcast_recipients=sample["broadcast_recipients"],
                products=sample["products"],
                pipeline_stages=sample["pipeline_stages"],
                prev_profiles=prev,
            )
            metrics["_profiles"] = profiles  # stash for next month comparison
            monthly_metrics_list.append(metrics)
            print(f"  Month {i+1}/{len(months)}: {month_str} - "
                  f"satisfaction={metrics['executive_summary']['satisfaction_avg']:.1f}")

        # Use last month as the "current" metrics
        latest_metrics = monthly_metrics_list[-1]
    else:
        client = SupabaseClient()
        fetcher = ReportDataFetcher(client, account_id)
        account_name = _fetch_account_name(client, account_id)
        print(f"[INFO] Account name: {account_name}")

        monthly_metrics_list = []
        prev_profiles = None

        for i, month_str in enumerate(months):
            start_iso, end_iso = _month_range(month_str)
            print(f"\n[INFO] Fetching month {i+1}/{len(months)}: {month_str}")

            contacts = fetcher.fetch_contacts(start_iso, end_iso)
            conversations = fetcher.fetch_conversations(start_iso, end_iso)
            conv_ids = [c["id"] for c in conversations]
            messages = fetcher.fetch_messages_for_conversations(conv_ids)
            deals = fetcher.fetch_deals(start_iso, end_iso)
            pipeline_stages = fetcher.fetch_pipeline_stages()
            broadcasts = fetcher.fetch_broadcasts(start_iso, end_iso)
            broadcast_ids = [b["id"] for b in broadcasts]
            broadcast_recipients = fetcher.fetch_broadcast_recipients(broadcast_ids)
            products = fetcher.fetch_products()
            purchases = fetcher.fetch_purchases(start_iso, end_iso)
            contact_ids = [c["id"] for c in contacts]
            contact_tags = fetcher.fetch_contact_tags(contact_ids)

            ref_date = date(int(month_str[:4]), int(month_str[5:7]), 28)
            profiles = build_contact_profiles(
                contacts=contacts,
                conversations=conversations,
                messages=messages,
                deals=deals,
                purchases=purchases,
                contact_tags=contact_tags,
                reference_date=ref_date,
            )

            metrics = compute_monthly_metrics(
                profiles=profiles,
                purchases=purchases,
                deals=deals,
                broadcasts=broadcasts,
                broadcast_recipients=broadcast_recipients,
                products=products,
                pipeline_stages=pipeline_stages,
                prev_profiles=prev_profiles,
            )
            metrics["_profiles"] = profiles
            monthly_metrics_list.append(metrics)
            prev_profiles = profiles

            es = metrics["executive_summary"]
            print(f"  Contacts: {len(contacts)}, Active: {es['active_customers']}, "
                  f"Satisfaction: {es['satisfaction_avg']:.1f}")

        client.close()
        latest_metrics = monthly_metrics_list[-1]

    # Compute campaign-level metrics
    # Remove internal _profiles before passing
    clean_monthly = []
    for mm in monthly_metrics_list:
        clean = {k: v for k, v in mm.items() if not k.startswith("_")}
        clean_monthly.append(clean)

    campaign_data = compute_campaign_metrics(
        monthly_data=clean_monthly,
        campaign_start=campaign_start,
        campaign_end=campaign_end,
    )

    _print_summary(latest_metrics, "end-of-campaign")

    print("[INFO] Generating PDF...")
    filepath = generate_campaign_report(
        metrics={k: v for k, v in latest_metrics.items() if not k.startswith("_")},
        campaign_data=campaign_data,
        monthly_metrics_list=clean_monthly,
        output_path=output_dir,
        account_name=account_name,
        campaign_start=campaign_start,
        campaign_end=campaign_end,
    )
    print(f"[OK] Report saved to: {filepath}")
    if dry_run:
        print("[DRY RUN] Report generated with sample data")
    return filepath


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        prog="report_generator",
        description="M4E Campaign Report Generator — generate branded PDF reports from CRM data.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Monthly report (live data)
  python report_generator.py monthly --account-id abc-123 --month 2026-06 --output ./reports/

  # End-of-campaign report (live data)
  python report_generator.py end-campaign --account-id abc-123 \\
      --campaign-start 2026-01 --campaign-end 2026-06 --output ./reports/

  # Dry-run with sample data
  python report_generator.py monthly --account-id test --month 2026-06 \\
      --output /tmp/test_report/ --dry-run
""",
    )

    subparsers = parser.add_subparsers(dest="mode", help="Report mode")

    # Monthly sub-command
    monthly_parser = subparsers.add_parser(
        "monthly", help="Generate a single-month report"
    )
    monthly_parser.add_argument(
        "--account-id", required=True, help="Supabase account UUID"
    )
    monthly_parser.add_argument(
        "--month", required=True, help="Report month (YYYY-MM)"
    )
    monthly_parser.add_argument(
        "--output", default="./reports/", help="Output directory (default: ./reports/)"
    )
    monthly_parser.add_argument(
        "--dry-run", action="store_true", help="Use sample data instead of Supabase"
    )

    # End-of-campaign sub-command
    campaign_parser = subparsers.add_parser(
        "end-campaign", help="Generate an end-of-campaign report"
    )
    campaign_parser.add_argument(
        "--account-id", required=True, help="Supabase account UUID"
    )
    campaign_parser.add_argument(
        "--campaign-start", required=True, help="Campaign start month (YYYY-MM)"
    )
    campaign_parser.add_argument(
        "--campaign-end", required=True, help="Campaign end month (YYYY-MM)"
    )
    campaign_parser.add_argument(
        "--output", default="./reports/", help="Output directory (default: ./reports/)"
    )
    campaign_parser.add_argument(
        "--dry-run", action="store_true", help="Use sample data instead of Supabase"
    )

    args = parser.parse_args()

    if not args.mode:
        parser.print_help()
        sys.exit(1)

    if args.mode == "monthly":
        run_monthly(
            account_id=args.account_id,
            month_str=args.month,
            output_dir=args.output,
            dry_run=args.dry_run,
        )
    elif args.mode == "end-campaign":
        run_end_campaign(
            account_id=args.account_id,
            campaign_start=args.campaign_start,
            campaign_end=args.campaign_end,
            output_dir=args.output,
            dry_run=args.dry_run,
        )


if __name__ == "__main__":
    main()
