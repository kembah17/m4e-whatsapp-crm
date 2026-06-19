#!/usr/bin/env python3
"""
M4E Database Reactivation - Performance Fee Calculator
=====================================================

Calculates performance fees from raw transaction data and campaign engagement
logs. All metrics (AOV, CLV, reactivation rate, etc.) are computed automatically
from the data - the client never inputs these values.

Usage:
    python performance_fee_calculator.py \
        --transactions data.csv \
        --campaigns campaigns.csv \
        --attribution-window 14 \
        --fee-percentage 15 \
        --output report/

    python performance_fee_calculator.py --simulate --output report/

Transaction CSV columns (required):
    date, amount, customer_id, product_service, payment_method

Campaign CSV columns (required):
    timestamp, customer_id, channel, event_type
    (event_type: delivered, opened, read, clicked, visited)

Author: Marketing4Effect (M4E)
Version: 1.0.0
"""

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import random
import string
import statistics


class Transaction:
    __slots__ = ("date", "amount", "customer_id", "product_service", "payment_method", "row_num")
    def __init__(self, date, amount, customer_id, product_service, payment_method, row_num):
        self.date = date
        self.amount = amount
        self.customer_id = customer_id
        self.product_service = product_service
        self.payment_method = payment_method
        self.row_num = row_num


class CampaignEvent:
    __slots__ = ("timestamp", "customer_id", "channel", "event_type")
    def __init__(self, timestamp, customer_id, channel, event_type):
        self.timestamp = timestamp
        self.customer_id = customer_id
        self.channel = channel
        self.event_type = event_type


class Anomaly:
    def __init__(self, anomaly_type, description, severity, row_num=None):
        self.anomaly_type = anomaly_type
        self.description = description
        self.severity = severity
        self.row_num = row_num


def parse_date(s):
    s = s.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y",
                "%m/%d/%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {s!r}")


def parse_amount(s):
    s = s.strip().replace(",", "").replace("NGN", "").replace("$", "").replace("USD", "").strip()
    # Remove naira sign
    s = s.replace("\u20a6", "")
    return float(s)


def load_transactions(path):
    transactions = []
    required = {"date", "amount", "customer_id", "product_service", "payment_method"}
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError(f"Empty CSV: {path}")
        headers = {h.strip().lower().replace(" ", "_") for h in reader.fieldnames}
        missing = required - headers
        if missing:
            raise ValueError(f"Missing columns in transactions CSV: {missing}")
        for i, row in enumerate(reader, start=2):
            row = {k.strip().lower().replace(" ", "_"): v for k, v in row.items()}
            try:
                txn = Transaction(
                    date=parse_date(row["date"]),
                    amount=parse_amount(row["amount"]),
                    customer_id=row["customer_id"].strip(),
                    product_service=row.get("product_service", "").strip(),
                    payment_method=row.get("payment_method", "").strip(),
                    row_num=i,
                )
                transactions.append(txn)
            except (ValueError, KeyError) as e:
                print(f"  Warning: Skipping row {i}: {e}")
    return transactions


def load_campaigns(path):
    events = []
    required = {"timestamp", "customer_id", "channel", "event_type"}
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError(f"Empty CSV: {path}")
        headers = {h.strip().lower().replace(" ", "_") for h in reader.fieldnames}
        missing = required - headers
        if missing:
            raise ValueError(f"Missing columns in campaigns CSV: {missing}")
        for i, row in enumerate(reader, start=2):
            row = {k.strip().lower().replace(" ", "_"): v for k, v in row.items()}
            try:
                evt = CampaignEvent(
                    timestamp=parse_date(row["timestamp"]),
                    customer_id=row["customer_id"].strip(),
                    channel=row.get("channel", "").strip().lower(),
                    event_type=row.get("event_type", "").strip().lower(),
                )
                events.append(evt)
            except (ValueError, KeyError) as e:
                print(f"  Warning: Skipping campaign row {i}: {e}")
    return events


def detect_anomalies(transactions):
    anomalies = []
    if not transactions:
        return anomalies

    amounts = [t.amount for t in transactions]
    mean_amt = statistics.mean(amounts)
    stdev_amt = statistics.stdev(amounts) if len(amounts) > 1 else 0

    if stdev_amt > 0:
        for t in transactions:
            z = abs(t.amount - mean_amt) / stdev_amt
            if z > 3:
                sev = "high" if z > 5 else "medium"
                anomalies.append(Anomaly(
                    "extreme_amount",
                    f"Row {t.row_num}: {t.amount:,.2f} is {z:.1f} std devs from mean {mean_amt:,.2f}",
                    sev, t.row_num,
                ))

    for t in transactions:
        if t.amount <= 0:
            anomalies.append(Anomaly(
                "non_positive_amount",
                f"Row {t.row_num}: Amount is {t.amount:,.2f} (zero or negative)",
                "high", t.row_num,
            ))

    seen = defaultdict(list)
    for t in transactions:
        key = (t.customer_id, t.amount, t.date.date())
        seen[key].append(t.row_num)
    for key, rows in seen.items():
        if len(rows) > 1:
            anomalies.append(Anomaly(
                "duplicate_transaction",
                f"Possible duplicate: customer {key[0]}, {key[1]:,.2f} on {key[2]} (rows {rows})",
                "medium",
            ))

    daily_counts = defaultdict(int)
    for t in transactions:
        daily_counts[t.date.date()] += 1
    if daily_counts:
        avg_daily = statistics.mean(daily_counts.values())
        for day, count in daily_counts.items():
            if avg_daily > 0 and count > 3 * avg_daily:
                anomalies.append(Anomaly(
                    "volume_spike",
                    f"{day}: {count} transactions (avg {avg_daily:.1f}/day)",
                    "medium",
                ))

    for t in transactions:
        if not t.customer_id or t.customer_id.lower() in ("unknown", "n/a", "none", ""):
            anomalies.append(Anomaly(
                "missing_customer_id",
                f"Row {t.row_num}: Missing or invalid customer_id",
                "high", t.row_num,
            ))

    return anomalies


def calculate_metrics(transactions, campaign_events, attribution_window_days,
                      fee_percentage, dormancy_threshold_days=90):
    if not transactions:
        raise ValueError("No valid transactions to analyse.")

    all_dates = [t.date for t in transactions]
    date_min = min(all_dates)
    date_max = max(all_dates)
    analysis_period_days = (date_max - date_min).days or 1

    # Group transactions by customer
    customer_txns = defaultdict(list)
    for t in transactions:
        customer_txns[t.customer_id].append(t)

    total_customers = len(customer_txns)
    total_transactions = len(transactions)
    total_revenue = sum(t.amount for t in transactions)
    aov = total_revenue / total_transactions if total_transactions else 0

    # Per-customer metrics
    customer_spend = {}
    customer_frequency = {}
    customer_last_purchase = {}
    customer_first_purchase = {}

    for cid, txns in customer_txns.items():
        txns_sorted = sorted(txns, key=lambda t: t.date)
        customer_spend[cid] = sum(t.amount for t in txns_sorted)
        customer_frequency[cid] = len(txns_sorted)
        customer_last_purchase[cid] = txns_sorted[-1].date
        customer_first_purchase[cid] = txns_sorted[0].date

    clv_values = list(customer_spend.values())
    avg_clv = statistics.mean(clv_values) if clv_values else 0
    median_clv = statistics.median(clv_values) if clv_values else 0
    avg_frequency = statistics.mean(customer_frequency.values()) if customer_frequency else 0

    # Dormancy: based on end-of-period snapshot (for reporting)
    dormancy_cutoff = date_max - timedelta(days=dormancy_threshold_days)
    dormant_customers_eop = set()
    active_customers_eop = set()
    for cid, last_date in customer_last_purchase.items():
        if last_date < dormancy_cutoff:
            dormant_customers_eop.add(cid)
        else:
            active_customers_eop.add(cid)
    dormancy_rate = len(dormant_customers_eop) / total_customers * 100 if total_customers else 0

    # Build per-customer campaign engagement index
    customer_engagements = defaultdict(list)
    for evt in campaign_events:
        customer_engagements[evt.customer_id].append(evt)

    # Determine dormancy AT TIME OF FIRST CAMPAIGN CONTACT
    # A customer is "dormant-at-contact" if their last purchase before
    # the first campaign event was 90+ days prior.
    dormant_at_contact = set()
    for cid, engagements in customer_engagements.items():
        first_contact = min(e.timestamp for e in engagements)
        # Find last purchase BEFORE first campaign contact
        pre_contact_purchases = [t.date for t in customer_txns.get(cid, []) if t.date < first_contact]
        if pre_contact_purchases:
            last_pre_contact = max(pre_contact_purchases)
            gap = (first_contact - last_pre_contact).days
            if gap >= dormancy_threshold_days:
                dormant_at_contact.add(cid)
        # If no purchases before contact, they are a prospect (not dormant)
        # We skip them for reactivation attribution

    contacted_dormant = dormant_at_contact  # These were dormant when we contacted them

    # Attribution: find purchases AFTER campaign engagement within the window
    attribution_window = timedelta(days=attribution_window_days)
    reactivated_customers = set()
    attributed_transactions = []
    attribution_details = []

    for cid in contacted_dormant:
        engagements = sorted(customer_engagements[cid], key=lambda e: e.timestamp)
        first_contact = engagements[0].timestamp
        cust_txns = sorted(customer_txns.get(cid, []), key=lambda t: t.date)

        for txn in cust_txns:
            # Only consider purchases AFTER the first campaign contact
            if txn.date < first_contact:
                continue
            # Find the most recent engagement before this purchase
            last_engagement = None
            for eng in engagements:
                if eng.timestamp <= txn.date:
                    last_engagement = eng
            if last_engagement:
                gap = txn.date - last_engagement.timestamp
                if gap <= attribution_window and gap.total_seconds() >= 0:
                    reactivated_customers.add(cid)
                    attributed_transactions.append(txn)
                    attribution_details.append({
                        "customer_id": cid,
                        "transaction_date": txn.date.strftime("%Y-%m-%d"),
                        "transaction_amount": txn.amount,
                        "product_service": txn.product_service,
                        "last_engagement_date": last_engagement.timestamp.strftime("%Y-%m-%d %H:%M"),
                        "last_engagement_channel": last_engagement.channel,
                        "last_engagement_type": last_engagement.event_type,
                        "days_between": gap.days,
                    })

    reactivation_revenue = sum(t.amount for t in attributed_transactions)
    reactivation_rate = (len(reactivated_customers) / len(contacted_dormant) * 100
                         if contacted_dormant else 0)
    performance_fee = reactivation_revenue * (fee_percentage / 100)

    # Channel breakdown
    channel_stats = defaultdict(lambda: {"engagements": 0, "attributed_revenue": 0, "attributed_txns": 0})
    for detail in attribution_details:
        ch = detail["last_engagement_channel"]
        channel_stats[ch]["attributed_revenue"] += detail["transaction_amount"]
        channel_stats[ch]["attributed_txns"] += 1
    for evt in campaign_events:
        channel_stats[evt.channel]["engagements"] += 1

    return {
        "date_range_start": date_min.strftime("%Y-%m-%d"),
        "date_range_end": date_max.strftime("%Y-%m-%d"),
        "analysis_period_days": analysis_period_days,
        "total_customers": total_customers,
        "total_transactions": total_transactions,
        "total_revenue": total_revenue,
        "aov": aov,
        "avg_clv": avg_clv,
        "median_clv": median_clv,
        "avg_purchase_frequency": avg_frequency,
        "dormancy_threshold_days": dormancy_threshold_days,
        "dormant_customers": len(dormant_customers_eop),
        "active_customers": len(active_customers_eop),
        "dormancy_rate": dormancy_rate,
        "total_campaign_events": len(campaign_events),
        "contacted_dormant_customers": len(contacted_dormant),
        "attribution_window_days": attribution_window_days,
        "reactivated_customers": len(reactivated_customers),
        "reactivation_rate": reactivation_rate,
        "attributed_transactions": len(attributed_transactions),
        "reactivation_revenue": reactivation_revenue,
        "fee_percentage": fee_percentage,
        "performance_fee": performance_fee,
        "channel_stats": dict(channel_stats),
        "attribution_details": attribution_details,
    }


def generate_simulation_data(output_dir):
    random.seed(42)
    os.makedirs(output_dir, exist_ok=True)

    customers = [f"CUST-{i+1:04d}" for i in range(200)]
    products = [
        "Hair Styling", "Braiding", "Manicure", "Pedicure", "Facial Treatment",
        "Massage", "Hair Colouring", "Wig Installation", "Lash Extensions",
        "Makeup Session", "Bridal Package", "Kids Haircut", "Beard Trim",
        "Spa Package", "Hair Treatment",
    ]
    payment_methods = ["cash", "transfer", "POS", "paystack", "opay"]

    base_date = datetime(2025, 1, 1)
    transactions = []

    for cid in customers:
        n_txns = random.choices([1, 2, 3, 4, 5, 6, 7, 8],
                                weights=[15, 25, 20, 15, 10, 7, 5, 3])[0]
        is_dormant = random.random() < 0.55
        last_active_day = random.randint(30, 200) if is_dormant else random.randint(0, 60)

        for _ in range(n_txns):
            days_ago = random.randint(last_active_day, 365)
            txn_date = base_date + timedelta(days=365 - days_ago)
            amount = random.gauss(15000, 8000)
            amount = max(2000, min(150000, amount))
            amount = round(amount, -2)
            transactions.append({
                "date": txn_date.strftime("%Y-%m-%d"),
                "amount": f"{amount:.0f}",
                "customer_id": cid,
                "product_service": random.choice(products),
                "payment_method": random.choice(payment_methods),
            })

    transactions.sort(key=lambda x: x["date"])

    # Identify dormant customers
    customer_last = {}
    for t in transactions:
        d = datetime.strptime(t["date"], "%Y-%m-%d")
        if t["customer_id"] not in customer_last or d > customer_last[t["customer_id"]]:
            customer_last[t["customer_id"]] = d

    latest_date = max(customer_last.values())
    dormant_cutoff = latest_date - timedelta(days=90)
    dormant_ids = [cid for cid, d in customer_last.items() if d < dormant_cutoff]

    # Generate campaign events
    campaign_events = []
    channels = ["whatsapp", "email", "sms"]
    event_types = ["delivered", "opened", "read", "clicked", "visited"]

    contacted = random.sample(dormant_ids, min(len(dormant_ids), int(len(dormant_ids) * 0.8)))

    for cid in contacted:
        n_touches = random.randint(2, 5)
        campaign_start = dormant_cutoff + timedelta(days=random.randint(5, 30))
        for j in range(n_touches):
            evt_date = campaign_start + timedelta(days=j * random.randint(2, 7))
            channel = random.choice(channels)
            evt_type = random.choices(event_types, weights=[30, 25, 20, 15, 10])[0]
            campaign_events.append({
                "timestamp": evt_date.strftime("%Y-%m-%d %H:%M:%S"),
                "customer_id": cid,
                "channel": channel,
                "event_type": evt_type,
            })

    # Generate reactivation purchases
    reactivation_txns = []
    for cid in contacted:
        if random.random() < 0.22:
            cust_events = [e for e in campaign_events if e["customer_id"] == cid]
            if cust_events:
                last_evt = max(cust_events, key=lambda e: e["timestamp"])
                last_evt_date = datetime.strptime(last_evt["timestamp"], "%Y-%m-%d %H:%M:%S")
                purchase_date = last_evt_date + timedelta(days=random.randint(1, 10))
                amount = random.gauss(18000, 9000)
                amount = max(3000, min(200000, amount))
                amount = round(amount, -2)
                reactivation_txns.append({
                    "date": purchase_date.strftime("%Y-%m-%d"),
                    "amount": f"{amount:.0f}",
                    "customer_id": cid,
                    "product_service": random.choice(products),
                    "payment_method": random.choice(payment_methods),
                })

    all_txns = transactions + reactivation_txns
    all_txns.sort(key=lambda x: x["date"])

    txn_path = os.path.join(output_dir, "sim_transactions.csv")
    with open(txn_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "amount", "customer_id",
                                                "product_service", "payment_method"])
        writer.writeheader()
        writer.writerows(all_txns)

    campaign_events.sort(key=lambda x: x["timestamp"])
    camp_path = os.path.join(output_dir, "sim_campaigns.csv")
    with open(camp_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "customer_id",
                                                "channel", "event_type"])
        writer.writeheader()
        writer.writerows(campaign_events)

    print(f"  Generated {len(all_txns)} transactions -> {txn_path}")
    print(f"  Generated {len(campaign_events)} campaign events -> {camp_path}")
    print(f"  {len(customers)} customers, {len(dormant_ids)} dormant, {len(contacted)} contacted")
    print(f"  {len(reactivation_txns)} simulated reactivation purchases")

    return txn_path, camp_path


def print_terminal_report(metrics, anomalies):
    m = metrics
    print()
    print("=" * 70)
    print("  M4E DATABASE REACTIVATION - PERFORMANCE FEE REPORT")
    print("=" * 70)

    print(f"\n  Analysis Period: {m['date_range_start']} to {m['date_range_end']} ({m['analysis_period_days']} days)")
    print(f"  Attribution Window: {m['attribution_window_days']} days")
    print(f"  Fee Percentage: {m['fee_percentage']}%")

    print("\n--- DATABASE OVERVIEW " + "-" * 48)
    print(f"  Total Customers:      {m['total_customers']:>10,}")
    print(f"  Total Transactions:   {m['total_transactions']:>10,}")
    print(f"  Total Revenue:       N{m['total_revenue']:>13,.2f}")

    print("\n--- CALCULATED METRICS (from raw data) " + "-" * 31)
    print(f"  AOV (Avg Order Value):  N{m['aov']:>11,.2f}   = Total Revenue / Total Transactions")
    print(f"  Avg CLV:                N{m['avg_clv']:>11,.2f}   = Avg total spend per customer")
    print(f"  Median CLV:             N{m['median_clv']:>11,.2f}")
    print(f"  Avg Purchase Frequency:  {m['avg_purchase_frequency']:>10.2f}x   = Avg transactions per customer")

    print("\n--- DORMANCY ANALYSIS " + "-" * 48)
    print(f"  Dormancy Threshold:   {m['dormancy_threshold_days']} days (no purchase)")
    print(f"  Active Customers:     {m['active_customers']:>10,}")
    print(f"  Dormant Customers:    {m['dormant_customers']:>10,}")
    print(f"  Dormancy Rate:        {m['dormancy_rate']:>10.1f}%")

    print("\n--- CAMPAIGN & ATTRIBUTION " + "-" * 43)
    print(f"  Campaign Events:      {m['total_campaign_events']:>10,}")
    print(f"  Dormant Contacted:    {m['contacted_dormant_customers']:>10,}")
    print(f"  Reactivated:          {m['reactivated_customers']:>10,}")
    print(f"  Reactivation Rate:    {m['reactivation_rate']:>10.1f}%   = Reactivated / Contacted")
    print(f"  Attributed Txns:      {m['attributed_transactions']:>10,}")
    print(f"  Reactivation Revenue:N{m['reactivation_revenue']:>13,.2f}")

    if m["channel_stats"]:
        print("\n--- CHANNEL BREAKDOWN " + "-" * 48)
        print(f"  {'Channel':<12} {'Engagements':>12} {'Attr. Revenue':>15} {'Attr. Txns':>12}")
        print(f"  {'-'*12} {'-'*12} {'-'*15} {'-'*12}")
        for ch, stats in sorted(m["channel_stats"].items()):
            print(f"  {ch:<12} {stats['engagements']:>12,} N{stats['attributed_revenue']:>13,.2f} {stats['attributed_txns']:>12,}")

    print()
    print("=" * 70)
    print(f"  PERFORMANCE FEE CALCULATION")
    print(f"  Reactivation Revenue:  N{m['reactivation_revenue']:>13,.2f}")
    print(f"  x Fee Percentage:       {m['fee_percentage']:>13}%")
    print(f"  ---------------------------------------")
    print(f"  PERFORMANCE FEE DUE:   N{m['performance_fee']:>13,.2f}")
    print("=" * 70)

    if anomalies:
        print(f"\n  ANOMALIES DETECTED: {len(anomalies)}")
        for a in anomalies[:10]:
            icon = "[HIGH]" if a.severity == "high" else "[MED]" if a.severity == "medium" else "[LOW]"
            print(f"  {icon} [{a.anomaly_type}] {a.description}")
        if len(anomalies) > 10:
            print(f"  ... and {len(anomalies) - 10} more (see full report)")
    print()


def write_csv_report(metrics, anomalies, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    if metrics["attribution_details"]:
        path = os.path.join(output_dir, "attribution_details.csv")
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(metrics["attribution_details"][0].keys()))
            writer.writeheader()
            writer.writerows(metrics["attribution_details"])
        print(f"  Attribution details -> {path}")

    if anomalies:
        path = os.path.join(output_dir, "anomalies.csv")
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["type", "severity", "description", "row_num"])
            writer.writeheader()
            for a in anomalies:
                writer.writerow({
                    "type": a.anomaly_type,
                    "severity": a.severity,
                    "description": a.description,
                    "row_num": a.row_num or "",
                })
        print(f"  Anomalies -> {path}")

    summary = {k: v for k, v in metrics.items() if k != "attribution_details"}
    path = os.path.join(output_dir, "metrics_summary.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"  Metrics JSON -> {path}")


def write_markdown_report(metrics, anomalies, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    m = metrics
    path = os.path.join(output_dir, "performance_fee_report.md")

    lines = []
    lines.append("# M4E Database Reactivation - Performance Fee Report")
    lines.append("")
    lines.append(f"**Report Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Analysis Period:** {m['date_range_start']} to {m['date_range_end']} ({m['analysis_period_days']} days)")
    lines.append(f"**Attribution Window:** {m['attribution_window_days']} days")
    lines.append(f"**Fee Percentage:** {m['fee_percentage']}%")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Executive Summary")
    lines.append("")
    lines.append(
        f"From a database of **{m['total_customers']:,} customers** with "
        f"**{m['total_transactions']:,} transactions** totalling "
        f"**N{m['total_revenue']:,.2f}**, the reactivation campaign successfully "
        f"re-engaged **{m['reactivated_customers']}** dormant customers, generating "
        f"**N{m['reactivation_revenue']:,.2f}** in attributed revenue."
    )
    lines.append("")
    lines.append(
        f"The **performance fee due** for this period is "
        f"**N{m['performance_fee']:,.2f}** ({m['fee_percentage']}% of reactivation revenue)."
    )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Database Overview")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|---|---|")
    lines.append(f"| Total Customers | {m['total_customers']:,} |")
    lines.append(f"| Total Transactions | {m['total_transactions']:,} |")
    lines.append(f"| Total Revenue | N{m['total_revenue']:,.2f} |")
    lines.append("")
    lines.append("## Calculated Metrics")
    lines.append("")
    lines.append("*All metrics below are calculated automatically from raw transaction data.*")
    lines.append("")
    lines.append("| Metric | Value | Formula |")
    lines.append("|---|---|---|")
    lines.append(f"| Average Order Value (AOV) | N{m['aov']:,.2f} | Total Revenue / Total Transactions |")
    lines.append(f"| Average CLV | N{m['avg_clv']:,.2f} | Mean of per-customer total spend |")
    lines.append(f"| Median CLV | N{m['median_clv']:,.2f} | Median of per-customer total spend |")
    lines.append(f"| Avg Purchase Frequency | {m['avg_purchase_frequency']:.2f}x | Mean transactions per customer |")
    lines.append("")
    lines.append("## Dormancy Analysis")
    lines.append("")
    lines.append(f"Dormancy threshold: **{m['dormancy_threshold_days']} days** without a purchase.")
    lines.append("")
    lines.append("| Segment | Count | Percentage |")
    lines.append("|---|---|---|")
    lines.append(f"| Active Customers | {m['active_customers']:,} | {100 - m['dormancy_rate']:.1f}% |")
    lines.append(f"| Dormant Customers | {m['dormant_customers']:,} | {m['dormancy_rate']:.1f}% |")
    lines.append("")
    lines.append("## Campaign Attribution")
    lines.append("")
    lines.append(f"Attribution window: **{m['attribution_window_days']} days** from last campaign engagement to purchase.")
    lines.append("")
    lines.append("| Metric | Value | Formula |")
    lines.append("|---|---|---|")
    lines.append(f"| Campaign Events | {m['total_campaign_events']:,} | Total engagement events logged |")
    lines.append(f"| Dormant Customers Contacted | {m['contacted_dormant_customers']:,} | Dormant intersect Engaged |")
    lines.append(f"| Reactivated Customers | {m['reactivated_customers']} | Purchased within attribution window |")
    lines.append(f"| Reactivation Rate | {m['reactivation_rate']:.1f}% | Reactivated / Contacted x 100 |")
    lines.append(f"| Attributed Transactions | {m['attributed_transactions']} | Transactions within window |")
    lines.append(f"| **Reactivation Revenue** | **N{m['reactivation_revenue']:,.2f}** | Sum of attributed transaction amounts |")
    lines.append("")

    if m["channel_stats"]:
        lines.append("## Channel Breakdown")
        lines.append("")
        lines.append("| Channel | Engagements | Attributed Revenue | Attributed Txns |")
        lines.append("|---|---|---|---|")
        for ch, stats in sorted(m["channel_stats"].items()):
            lines.append(
                f"| {ch.title()} | {stats['engagements']:,} | "
                f"N{stats['attributed_revenue']:,.2f} | {stats['attributed_txns']} |"
            )
        lines.append("")

    lines.append("## Performance Fee Calculation")
    lines.append("")
    lines.append("```")
    lines.append(f"Reactivation Revenue:  N{m['reactivation_revenue']:>13,.2f}")
    lines.append(f"x Fee Percentage:       {m['fee_percentage']:>13}%")
    lines.append(f"---------------------------------------")
    lines.append(f"PERFORMANCE FEE DUE:   N{m['performance_fee']:>13,.2f}")
    lines.append("```")
    lines.append("")

    if anomalies:
        lines.append("## Anomalies Detected")
        lines.append("")
        lines.append(f"**{len(anomalies)} anomalies** were flagged for review before inclusion in fee calculations.")
        lines.append("")
        lines.append("| Severity | Type | Description |")
        lines.append("|---|---|---|")
        for a in anomalies:
            sev = "HIGH" if a.severity == "high" else "MEDIUM" if a.severity == "medium" else "LOW"
            lines.append(f"| {sev} | {a.anomaly_type} | {a.description} |")
        lines.append("")

    if m["attribution_details"]:
        lines.append("## Attribution Details (Sample)")
        lines.append("")
        lines.append("| Customer | Txn Date | Amount | Channel | Engagement Date | Days Gap |")
        lines.append("|---|---|---|---|---|---|")
        for d in m["attribution_details"][:20]:
            lines.append(
                f"| {d['customer_id']} | {d['transaction_date']} | "
                f"N{d['transaction_amount']:,.2f} | {d['last_engagement_channel']} | "
                f"{d['last_engagement_date']} | {d['days_between']}d |"
            )
        if len(m["attribution_details"]) > 20:
            lines.append(f"")
            lines.append(f"*... and {len(m['attribution_details']) - 20} more (see attribution_details.csv)*")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("*Report generated by M4E Performance Fee Calculator v1.0.0*")
    lines.append("*Marketing4Effect - crm.marketing4effect.com*")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Markdown report -> {path}")


def main():
    parser = argparse.ArgumentParser(
        description="M4E Database Reactivation - Performance Fee Calculator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--transactions", "-t", help="Path to transactions CSV")
    parser.add_argument("--campaigns", "-c", help="Path to campaign engagement CSV")
    parser.add_argument("--attribution-window", "-w", type=int, default=14,
                        help="Attribution window in days (default: 14)")
    parser.add_argument("--fee-percentage", "-f", type=float, default=15.0,
                        help="Performance fee percentage (default: 15)")
    parser.add_argument("--dormancy-days", "-d", type=int, default=90,
                        help="Days without purchase to classify as dormant (default: 90)")
    parser.add_argument("--output", "-o", default="report",
                        help="Output directory for reports (default: report/)")
    parser.add_argument("--simulate", "-s", action="store_true",
                        help="Generate sample data for demonstration")

    args = parser.parse_args()

    print("\nM4E Performance Fee Calculator v1.0.0")
    print("-" * 45)

    if args.simulate:
        print("\nGenerating simulation data...")
        txn_path, camp_path = generate_simulation_data(args.output)
        args.transactions = txn_path
        args.campaigns = camp_path

    if not args.transactions or not args.campaigns:
        parser.error("--transactions and --campaigns are required (or use --simulate)")

    print(f"\nLoading transactions from {args.transactions}...")
    transactions = load_transactions(args.transactions)
    print(f"  Loaded {len(transactions)} transactions")

    print(f"\nLoading campaign data from {args.campaigns}...")
    campaign_events = load_campaigns(args.campaigns)
    print(f"  Loaded {len(campaign_events)} campaign events")

    print("\nRunning anomaly detection...")
    anomalies = detect_anomalies(transactions)
    print(f"  Found {len(anomalies)} anomalies")

    print("\nCalculating performance metrics...")
    metrics = calculate_metrics(
        transactions=transactions,
        campaign_events=campaign_events,
        attribution_window_days=args.attribution_window,
        fee_percentage=args.fee_percentage,
        dormancy_threshold_days=args.dormancy_days,
    )

    print_terminal_report(metrics, anomalies)

    print("Writing reports...")
    write_csv_report(metrics, anomalies, args.output)
    write_markdown_report(metrics, anomalies, args.output)

    print(f"\nDone! All reports saved to: {args.output}")


if __name__ == "__main__":
    main()
