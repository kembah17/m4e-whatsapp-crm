#!/usr/bin/env python3
"""
M4E Campaign Report Generator - Utility Functions
==================================================

Data fetching from Supabase REST API, satisfaction scoring,
metrics computation, and sample data generation.

Author: Marketing4Effect (M4E)
Version: 1.0.0
"""

import os
import random
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
_ENV_LOADED = False


def _ensure_env() -> None:
    """Load .env.local once from the CRM project root."""
    global _ENV_LOADED
    if not _ENV_LOADED:
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
        load_dotenv(env_path)
        _ENV_LOADED = True


# ---------------------------------------------------------------------------
# Supabase REST client
# ---------------------------------------------------------------------------
class SupabaseClient:
    """Thin wrapper around the Supabase PostgREST API using httpx."""

    def __init__(
        self,
        url: Optional[str] = None,
        key: Optional[str] = None,
    ) -> None:
        _ensure_env()
        self.url = (
            url
            or os.environ.get("SUPABASE_URL")
            or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
        ).rstrip("/")
        self.key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
                "(via environment or .env.local)"
            )
        self._client = httpx.Client(
            base_url=f"{self.url}/rest/v1",
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            timeout=30.0,
        )

    # -- low-level ---------------------------------------------------------

    def query(
        self,
        table: str,
        params: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """Execute a GET query against *table* with PostgREST params."""
        try:
            resp = self._client.get(f"/{table}", params=params or {})
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as exc:
            print(f"[WARN] Supabase query {table} failed: {exc.response.status_code}")
            return []
        except Exception as exc:
            print(f"[WARN] Supabase query {table} error: {exc}")
            return []

    def close(self) -> None:
        self._client.close()


# ---------------------------------------------------------------------------
# Data fetcher (account-scoped, date-filtered)
# ---------------------------------------------------------------------------
class ReportDataFetcher:
    """Fetch all CRM data needed for report generation."""

    def __init__(self, client: SupabaseClient, account_id: str) -> None:
        self.client = client
        self.account_id = account_id

    # -- helpers -----------------------------------------------------------

    def _date_params(
        self,
        start: str,
        end: str,
        date_col: str = "created_at",
    ) -> Dict[str, str]:
        """Return PostgREST filter params for account + date range."""
        return {
            "account_id": f"eq.{self.account_id}",
            f"{date_col}": f"gte.{start}",
            f"{date_col}": f"lt.{end}",
            "select": "*",
        }

    def _account_params(self) -> Dict[str, str]:
        return {"account_id": f"eq.{self.account_id}", "select": "*"}

    # -- table fetchers ----------------------------------------------------

    def fetch_contacts(self, start: str, end: str) -> List[dict]:
        """Contacts created or updated in the period."""
        # Fetch ALL contacts for the account (we filter activity later)
        return self.client.query("contacts", self._account_params())

    def fetch_conversations(self, start: str, end: str) -> List[dict]:
        params = {
            "account_id": f"eq.{self.account_id}",
            "select": "*",
            "or": f"(created_at.gte.{start},last_message_at.gte.{start})",
        }
        return self.client.query("conversations", params)

    def fetch_messages_for_conversations(
        self, conversation_ids: List[str]
    ) -> List[dict]:
        if not conversation_ids:
            return []
        # PostgREST IN filter
        ids_csv = ",".join(conversation_ids)
        return self.client.query(
            "messages",
            {
                "conversation_id": f"in.({ids_csv})",
                "select": "*",
                "order": "created_at.asc",
            },
        )

    def fetch_deals(self, start: str, end: str) -> List[dict]:
        return self.client.query(
            "deals",
            {
                "account_id": f"eq.{self.account_id}",
                "select": "*,pipeline_stages(name,position)",
            },
        )

    def fetch_pipeline_stages(self) -> List[dict]:
        """All stages across all pipelines for this account."""
        pipelines = self.client.query(
            "pipelines", self._account_params()
        )
        if not pipelines:
            return []
        pipe_ids = ",".join(p["id"] for p in pipelines)
        return self.client.query(
            "pipeline_stages",
            {
                "pipeline_id": f"in.({pipe_ids})",
                "select": "*",
                "order": "position.asc",
            },
        )

    def fetch_broadcasts(self, start: str, end: str) -> List[dict]:
        return self.client.query(
            "broadcasts",
            {
                "account_id": f"eq.{self.account_id}",
                "select": "*",
                "created_at": f"gte.{start}",
            },
        )

    def fetch_broadcast_recipients(self, broadcast_ids: List[str]) -> List[dict]:
        if not broadcast_ids:
            return []
        ids_csv = ",".join(broadcast_ids)
        return self.client.query(
            "broadcast_recipients",
            {"broadcast_id": f"in.({ids_csv})", "select": "*"},
        )

    def fetch_products(self) -> List[dict]:
        return self.client.query("products", self._account_params())

    def fetch_purchases(self, start: str, end: str) -> List[dict]:
        return self.client.query(
            "purchase_history",
            {
                "account_id": f"eq.{self.account_id}",
                "select": "*",
                "purchase_date": f"gte.{start}",
            },
        )

    def fetch_tags(self) -> List[dict]:
        return self.client.query("tags", self._account_params())

    def fetch_contact_tags(self, contact_ids: List[str]) -> Dict[str, List[str]]:
        """Return {contact_id: [tag_name, ...]}."""
        if not contact_ids:
            return {}
        tags = self.fetch_tags()
        tag_map = {t["id"]: t["name"] for t in tags}

        ids_csv = ",".join(contact_ids)
        ct_rows = self.client.query(
            "contact_tags",
            {"contact_id": f"in.({ids_csv})", "select": "*"},
        )
        result: Dict[str, List[str]] = defaultdict(list)
        for row in ct_rows:
            tag_name = tag_map.get(row.get("tag_id", ""), "")
            if tag_name:
                result[row["contact_id"]].append(tag_name)
        return dict(result)

    def fetch_automations(self) -> List[dict]:
        return self.client.query("automations", self._account_params())


# ---------------------------------------------------------------------------
# Satisfaction scoring
# ---------------------------------------------------------------------------
SATISFACTION_TIERS = [
    ("Delighted", 80, 100),
    ("Satisfied", 60, 79),
    ("Neutral", 40, 59),
    ("At-Risk", 20, 39),
    ("Unhappy", 0, 19),
]


def tier_for_score(score: float) -> str:
    """Return the satisfaction tier label for a numeric score."""
    for label, lo, hi in SATISFACTION_TIERS:
        if lo <= score <= hi:
            return label
    return "Unknown"


def calculate_satisfaction_score(contact_data: Dict[str, Any]) -> float:
    """Calculate composite satisfaction score 0-100."""
    scores: Dict[str, float] = {}

    # 1. Response engagement (0-100)
    msgs_recv = contact_data.get("messages_received", 0)
    if msgs_recv > 0:
        reply_rate = contact_data.get("messages_sent", 0) / msgs_recv
        scores["engagement"] = min(100.0, reply_rate * 100)
    else:
        scores["engagement"] = 0.0

    # 2. Purchase behaviour (0-100)
    purchase_count = contact_data.get("purchase_count", 0)
    if purchase_count > 0:
        days_since = contact_data.get("days_since_last_purchase", 999)
        recency_score = max(0.0, 100.0 - days_since * 2)
        frequency_score = min(100.0, purchase_count * 25.0)
        scores["purchase"] = (recency_score + frequency_score) / 2
    else:
        scores["purchase"] = 0.0

    # 3. Complaint indicator (inverted)
    complaint_keywords = ["complaint", "unhappy", "issue", "problem"]
    tags = contact_data.get("tags", [])
    complaint_count = sum(
        1 for t in tags if any(c in t.lower() for c in complaint_keywords)
    )
    scores["complaints"] = max(0.0, 100.0 - complaint_count * 30)

    # 4. Positive indicators
    positive_keywords = [
        "satisfied", "delighted", "referral", "review", "testimonial", "won-back",
    ]
    positive_count = sum(
        1 for t in tags if any(p in t.lower() for p in positive_keywords)
    )
    scores["positive"] = min(100.0, positive_count * 25.0)

    # 5. Pipeline stage indicator
    stage_scores = {
        "Won Back": 90, "Follow-up": 50, "Campaign Active": 40,
        "Segmentation": 20, "Data Import": 10, "Lost": 5,
    }
    scores["pipeline"] = float(
        stage_scores.get(contact_data.get("current_stage", ""), 30)
    )

    # Weighted composite
    weights = {
        "engagement": 0.25,
        "purchase": 0.30,
        "complaints": 0.15,
        "positive": 0.15,
        "pipeline": 0.15,
    }
    composite = sum(scores[k] * weights[k] for k in weights)
    return round(composite, 1)


# ---------------------------------------------------------------------------
# Contact profile builder
# ---------------------------------------------------------------------------
def build_contact_profiles(
    contacts: List[dict],
    conversations: List[dict],
    messages: List[dict],
    deals: List[dict],
    purchases: List[dict],
    contact_tags: Dict[str, List[str]],
    reference_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """Build enriched profile dicts for every contact."""
    ref = reference_date or date.today()

    # Index conversations by contact_id
    conv_by_contact: Dict[str, List[dict]] = defaultdict(list)
    for c in conversations:
        cid = c.get("contact_id")
        if cid:
            conv_by_contact[cid].append(c)

    # Index messages by conversation_id
    msgs_by_conv: Dict[str, List[dict]] = defaultdict(list)
    for m in messages:
        msgs_by_conv[m.get("conversation_id", "")].append(m)

    # Index deals by contact_id
    deals_by_contact: Dict[str, List[dict]] = defaultdict(list)
    for d in deals:
        cid = d.get("contact_id")
        if cid:
            deals_by_contact[cid].append(d)

    # Index purchases by contact_id
    purch_by_contact: Dict[str, List[dict]] = defaultdict(list)
    for p in purchases:
        cid = p.get("contact_id")
        if cid:
            purch_by_contact[cid].append(p)

    profiles: List[Dict[str, Any]] = []
    for contact in contacts:
        cid = contact["id"]
        tags = contact_tags.get(cid, [])

        # Messages analysis
        contact_convs = conv_by_contact.get(cid, [])
        conv_ids = [c["id"] for c in contact_convs]
        contact_msgs = []
        for cvid in conv_ids:
            contact_msgs.extend(msgs_by_conv.get(cvid, []))

        msgs_sent = sum(
            1 for m in contact_msgs if m.get("sender_type") == "customer"
        )
        msgs_received = sum(
            1 for m in contact_msgs if m.get("sender_type") in ("agent", "bot")
        )

        # Purchase analysis
        contact_purchases = purch_by_contact.get(cid, [])
        purchase_count = len(contact_purchases)
        total_spend = sum(_safe_float(p.get("amount", 0)) for p in contact_purchases)
        avg_order = total_spend / purchase_count if purchase_count else 0.0

        days_since_last = 999
        if contact_purchases:
            last_date = max(
                _parse_date(p.get("purchase_date", "")) for p in contact_purchases
            )
            if last_date:
                days_since_last = (ref - last_date).days

        # Deal / pipeline stage
        contact_deals = deals_by_contact.get(cid, [])
        current_stage = ""
        deal_value = 0.0
        deal_status = ""
        if contact_deals:
            latest = max(contact_deals, key=lambda d: d.get("updated_at", ""))
            deal_value = _safe_float(latest.get("value", 0))
            deal_status = latest.get("status", "")
            # Try to get stage name from embedded join
            stage_info = latest.get("pipeline_stages")
            if isinstance(stage_info, dict):
                current_stage = stage_info.get("name", "")

        # Interaction dates
        first_contact = contact.get("created_at", "")
        last_interaction = ""
        if contact_convs:
            last_interaction = max(
                c.get("last_message_at", "") or c.get("updated_at", "")
                for c in contact_convs
            )

        profile: Dict[str, Any] = {
            "id": cid,
            "name": contact.get("name", "Unknown"),
            "phone": contact.get("phone", ""),
            "email": contact.get("email", ""),
            "company": contact.get("company", ""),
            "messages_sent": msgs_sent,
            "messages_received": msgs_received,
            "purchase_count": purchase_count,
            "total_spend": total_spend,
            "avg_order_value": avg_order,
            "days_since_last_purchase": days_since_last,
            "tags": tags,
            "current_stage": current_stage,
            "deal_value": deal_value,
            "deal_status": deal_status,
            "first_contact_date": first_contact,
            "last_interaction_date": last_interaction,
            "satisfaction_score": 0.0,
            "satisfaction_tier": "Unknown",
        }
        profile["satisfaction_score"] = calculate_satisfaction_score(profile)
        profile["satisfaction_tier"] = tier_for_score(profile["satisfaction_score"])
        profiles.append(profile)

    return profiles


# ---------------------------------------------------------------------------
# Metrics computation
# ---------------------------------------------------------------------------

# Traffic-light thresholds: (metric_key, green_test, yellow_test)
# green_test returns True if green, yellow_test returns True if yellow, else red
TRAFFIC_LIGHTS = {
    "active_pct": {"green": 80, "yellow": 50},
    "satisfaction_avg": {"green": 70, "yellow": 50},
    "delighted_pct": {"green": 30, "yellow": 15},
    "unhappy_pct": {"green_below": 10, "yellow_below": 25},  # inverted
    "revenue_satisfied_pct": {"green": 70, "yellow": 40},
    "recovery_rate": {"green": 40, "yellow": 20},
}


def _traffic_light(key: str, value: float) -> str:
    """Return 'green', 'yellow', or 'red' for a metric."""
    cfg = TRAFFIC_LIGHTS.get(key, {})
    if "green_below" in cfg:  # inverted metric (lower is better)
        if value < cfg["green_below"]:
            return "green"
        if value < cfg["yellow_below"]:
            return "yellow"
        return "red"
    if "green" in cfg:
        if value >= cfg["green"]:
            return "green"
        if value >= cfg["yellow"]:
            return "yellow"
        return "red"
    return "green"


def compute_monthly_metrics(
    profiles: List[Dict[str, Any]],
    purchases: List[dict],
    deals: List[dict],
    broadcasts: List[dict],
    broadcast_recipients: List[dict],
    products: List[dict],
    pipeline_stages: List[dict],
    prev_profiles: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Compute all metrics for a single month report."""
    total = len(profiles)
    if total == 0:
        return _empty_metrics()

    # -- Section 1: Executive Summary ------------------------------------
    active = [p for p in profiles if p["messages_sent"] > 0 or p["purchase_count"] > 0]
    active_pct = len(active) / total * 100 if total else 0

    scores = [p["satisfaction_score"] for p in profiles]
    satisfaction_avg = sum(scores) / len(scores) if scores else 0

    tier_counts = defaultdict(int)
    tier_revenue = defaultdict(float)
    for p in profiles:
        tier_counts[p["satisfaction_tier"]] += 1
        tier_revenue[p["satisfaction_tier"]] += p["total_spend"]

    delighted_pct = tier_counts.get("Delighted", 0) / total * 100 if total else 0
    unhappy_pct = tier_counts.get("Unhappy", 0) / total * 100 if total else 0

    total_revenue = sum(p["total_spend"] for p in profiles)
    satisfied_revenue = sum(
        p["total_spend"] for p in profiles if p["satisfaction_score"] >= 60
    )
    revenue_satisfied_pct = (
        satisfied_revenue / total_revenue * 100 if total_revenue else 0
    )

    # Recovery rate: contacts that were unhappy in prev period now neutral+
    recovery_rate = 0.0
    if prev_profiles:
        prev_unhappy_ids = {
            p["id"] for p in prev_profiles if p["satisfaction_score"] < 20
        }
        if prev_unhappy_ids:
            current_map = {p["id"]: p for p in profiles}
            recovered = sum(
                1
                for uid in prev_unhappy_ids
                if uid in current_map
                and current_map[uid]["satisfaction_score"] >= 40
            )
            recovery_rate = recovered / len(prev_unhappy_ids) * 100

    executive_summary = {
        "total_contacts": total,
        "active_customers": len(active),
        "active_pct": round(active_pct, 1),
        "active_light": _traffic_light("active_pct", active_pct),
        "satisfaction_avg": round(satisfaction_avg, 1),
        "satisfaction_light": _traffic_light("satisfaction_avg", satisfaction_avg),
        "delighted_pct": round(delighted_pct, 1),
        "delighted_light": _traffic_light("delighted_pct", delighted_pct),
        "unhappy_pct": round(unhappy_pct, 1),
        "unhappy_light": _traffic_light("unhappy_pct", unhappy_pct),
        "revenue_from_satisfied": round(satisfied_revenue, 2),
        "revenue_satisfied_pct": round(revenue_satisfied_pct, 1),
        "revenue_satisfied_light": _traffic_light(
            "revenue_satisfied_pct", revenue_satisfied_pct
        ),
        "recovery_rate": round(recovery_rate, 1),
        "recovery_light": _traffic_light("recovery_rate", recovery_rate),
        "total_revenue": round(total_revenue, 2),
    }

    # -- Section 2: Satisfaction Distribution -----------------------------
    distribution = []
    for label, lo, hi in SATISFACTION_TIERS:
        count = tier_counts.get(label, 0)
        pct = count / total * 100 if total else 0
        rev = tier_revenue.get(label, 0.0)
        distribution.append({
            "tier": label,
            "range": f"{lo}-{hi}",
            "count": count,
            "percentage": round(pct, 1),
            "revenue": round(rev, 2),
            "revenue_pct": round(rev / total_revenue * 100, 1) if total_revenue else 0,
        })

    # -- Section 3: Satisfied vs Disappointed Comparison -----------------
    satisfied = [p for p in profiles if p["satisfaction_score"] >= 60]
    disappointed = [p for p in profiles if p["satisfaction_score"] < 40]

    def _group_stats(group: List[dict]) -> Dict[str, Any]:
        n = len(group)
        if n == 0:
            return {
                "count": 0, "total_spend": 0, "avg_spend": 0,
                "avg_messages_sent": 0, "avg_messages_received": 0,
                "avg_purchase_count": 0, "avg_order_value": 0,
                "top_tags": [],
            }
        total_sp = sum(p["total_spend"] for p in group)
        all_tags: List[str] = []
        for p in group:
            all_tags.extend(p["tags"])
        tag_freq = defaultdict(int)
        for t in all_tags:
            tag_freq[t] += 1
        top_tags = sorted(tag_freq.items(), key=lambda x: -x[1])[:5]
        return {
            "count": n,
            "total_spend": round(total_sp, 2),
            "avg_spend": round(total_sp / n, 2),
            "avg_messages_sent": round(sum(p["messages_sent"] for p in group) / n, 1),
            "avg_messages_received": round(
                sum(p["messages_received"] for p in group) / n, 1
            ),
            "avg_purchase_count": round(
                sum(p["purchase_count"] for p in group) / n, 1
            ),
            "avg_order_value": round(
                sum(p["avg_order_value"] for p in group) / n, 2
            ),
            "top_tags": [t[0] for t in top_tags],
        }

    comparison = {
        "satisfied": _group_stats(satisfied),
        "disappointed": _group_stats(disappointed),
    }

    # -- Section 4: Actionable Insights ----------------------------------
    insights = _generate_insights(executive_summary, distribution, comparison)

    # -- Section 5: Gamification -----------------------------------------
    gamification = {
        "note": "Gamification features not yet active in CRM.",
        "raffle_entries": 0,
        "loyalty_points_issued": 0,
        "badges_awarded": 0,
        "top_customer": profiles[0]["name"] if profiles else "N/A",
    }

    # -- Section 6: Campaign Performance ---------------------------------
    campaign_perf = _compute_campaign_performance(broadcasts, broadcast_recipients)

    # -- Section 7: Pipeline Summary -------------------------------------
    pipeline_summary = _compute_pipeline_summary(deals, pipeline_stages)

    # -- Section 8: Product Performance ----------------------------------
    product_perf = _compute_product_performance(purchases, products, profiles)

    # -- Section 9: Recommendations --------------------------------------
    recommendations = _generate_recommendations(
        executive_summary, distribution, comparison, campaign_perf, pipeline_summary
    )

    return {
        "executive_summary": executive_summary,
        "distribution": distribution,
        "comparison": comparison,
        "insights": insights,
        "gamification": gamification,
        "campaign_performance": campaign_perf,
        "pipeline_summary": pipeline_summary,
        "product_performance": product_perf,
        "recommendations": recommendations,
    }


def _empty_metrics() -> Dict[str, Any]:
    """Return a metrics dict with all sections empty / zeroed."""
    return {
        "executive_summary": {
            "total_contacts": 0, "active_customers": 0, "active_pct": 0,
            "active_light": "red", "satisfaction_avg": 0,
            "satisfaction_light": "red", "delighted_pct": 0,
            "delighted_light": "red", "unhappy_pct": 0,
            "unhappy_light": "green", "revenue_from_satisfied": 0,
            "revenue_satisfied_pct": 0, "revenue_satisfied_light": "red",
            "recovery_rate": 0, "recovery_light": "red", "total_revenue": 0,
        },
        "distribution": [],
        "comparison": {"satisfied": {"count": 0}, "disappointed": {"count": 0}},
        "insights": ["No data available for analysis."],
        "gamification": {
            "note": "No data", "raffle_entries": 0,
            "loyalty_points_issued": 0, "badges_awarded": 0,
            "top_customer": "N/A",
        },
        "campaign_performance": {},
        "pipeline_summary": [],
        "product_performance": [],
        "recommendations": ["Collect more data before generating recommendations."],
    }


# ---------------------------------------------------------------------------
# Sub-computations
# ---------------------------------------------------------------------------
def _compute_campaign_performance(
    broadcasts: List[dict],
    recipients: List[dict],
) -> Dict[str, Any]:
    if not broadcasts:
        return {
            "total_campaigns": 0,
            "total_sent": 0,
            "delivery_rate": 0,
            "read_rate": 0,
            "response_rate": 0,
            "campaigns": [],
        }
    total_sent = sum(b.get("sent_count", 0) or 0 for b in broadcasts)
    total_delivered = sum(b.get("delivered_count", 0) or 0 for b in broadcasts)
    total_read = sum(b.get("read_count", 0) or 0 for b in broadcasts)
    total_replied = sum(b.get("replied_count", 0) or 0 for b in broadcasts)
    total_failed = sum(b.get("failed_count", 0) or 0 for b in broadcasts)

    campaigns = []
    for b in broadcasts:
        sent = b.get("sent_count", 0) or 0
        campaigns.append({
            "name": b.get("name", "Unnamed"),
            "template": b.get("template_name", ""),
            "sent": sent,
            "delivered": b.get("delivered_count", 0) or 0,
            "read": b.get("read_count", 0) or 0,
            "replied": b.get("replied_count", 0) or 0,
            "failed": b.get("failed_count", 0) or 0,
            "delivery_rate": round(
                (b.get("delivered_count", 0) or 0) / sent * 100, 1
            ) if sent else 0,
            "read_rate": round(
                (b.get("read_count", 0) or 0) / sent * 100, 1
            ) if sent else 0,
        })

    return {
        "total_campaigns": len(broadcasts),
        "total_sent": total_sent,
        "total_delivered": total_delivered,
        "total_failed": total_failed,
        "delivery_rate": round(total_delivered / total_sent * 100, 1) if total_sent else 0,
        "read_rate": round(total_read / total_sent * 100, 1) if total_sent else 0,
        "response_rate": round(total_replied / total_sent * 100, 1) if total_sent else 0,
        "campaigns": campaigns,
    }


def _compute_pipeline_summary(
    deals: List[dict],
    stages: List[dict],
) -> List[Dict[str, Any]]:
    if not deals:
        return []
    stage_map = {s["id"]: s.get("name", "Unknown") for s in stages}
    by_stage: Dict[str, List[dict]] = defaultdict(list)
    for d in deals:
        sid = d.get("stage_id", "")
        stage_name = stage_map.get(sid, "Unknown")
        by_stage[stage_name].append(d)

    summary = []
    for stage_name, stage_deals in by_stage.items():
        values = [_safe_float(d.get("value", 0)) for d in stage_deals]
        won = sum(1 for d in stage_deals if d.get("status") == "won")
        summary.append({
            "stage": stage_name,
            "deal_count": len(stage_deals),
            "total_value": round(sum(values), 2),
            "avg_value": round(sum(values) / len(values), 2) if values else 0,
            "won_count": won,
            "conversion_rate": round(won / len(stage_deals) * 100, 1) if stage_deals else 0,
        })
    return summary


def _compute_product_performance(
    purchases: List[dict],
    products: List[dict],
    profiles: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    if not purchases:
        return []
    product_map = {p["id"]: p for p in products}
    by_product: Dict[str, List[dict]] = defaultdict(list)
    for p in purchases:
        pid = p.get("product_id") or p.get("product_name", "Unknown")
        by_product[str(pid)].append(p)

    result = []
    for pid, purch_list in by_product.items():
        prod = product_map.get(pid, {})
        name = prod.get("name") or purch_list[0].get("product_name", "Unknown")
        revenue = sum(_safe_float(p.get("amount", 0)) for p in purch_list)
        qty = sum(p.get("quantity", 1) or 1 for p in purch_list)
        result.append({
            "product_id": pid,
            "name": name,
            "category": prod.get("category", "Uncategorized"),
            "purchases": len(purch_list),
            "quantity_sold": qty,
            "revenue": round(revenue, 2),
            "avg_price": round(revenue / len(purch_list), 2) if purch_list else 0,
        })
    result.sort(key=lambda x: -x["revenue"])
    return result


# ---------------------------------------------------------------------------
# Insight & recommendation generators
# ---------------------------------------------------------------------------
def _generate_insights(
    summary: Dict[str, Any],
    distribution: List[dict],
    comparison: Dict[str, Any],
) -> List[str]:
    """Auto-generate plain-English insights from data patterns."""
    insights: List[str] = []

    # Active customer insight
    ap = summary.get("active_pct", 0)
    if ap >= 80:
        insights.append(
            f"Strong engagement: {ap:.0f}% of contacts are actively interacting "
            f"with your campaigns this month."
        )
    elif ap >= 50:
        insights.append(
            f"Moderate engagement: {ap:.0f}% of contacts are active. "
            f"Consider targeted re-engagement for the remaining {100-ap:.0f}%."
        )
    else:
        insights.append(
            f"Low engagement alert: Only {ap:.0f}% of contacts are active. "
            f"A re-engagement campaign is strongly recommended."
        )

    # Satisfaction insight
    sa = summary.get("satisfaction_avg", 0)
    if sa >= 70:
        insights.append(
            f"Customer satisfaction is healthy at {sa:.1f}/100. "
            f"Focus on maintaining this level and converting satisfied customers to advocates."
        )
    elif sa >= 50:
        insights.append(
            f"Satisfaction score of {sa:.1f}/100 indicates room for improvement. "
            f"Prioritise addressing common pain points."
        )
    else:
        insights.append(
            f"Satisfaction score of {sa:.1f}/100 is below target. "
            f"Immediate attention needed to identify and resolve customer issues."
        )

    # Revenue concentration
    rsp = summary.get("revenue_satisfied_pct", 0)
    if rsp >= 70:
        insights.append(
            f"{rsp:.0f}% of revenue comes from satisfied customers (score 60+), "
            f"confirming the link between satisfaction and spending."
        )
    else:
        insights.append(
            f"Only {rsp:.0f}% of revenue comes from satisfied customers. "
            f"Improving satisfaction could unlock significant revenue growth."
        )

    # Comparison insight
    sat_data = comparison.get("satisfied", {})
    dis_data = comparison.get("disappointed", {})
    sat_avg = sat_data.get("avg_spend", 0)
    dis_avg = dis_data.get("avg_spend", 0)
    if sat_avg > 0 and dis_avg > 0:
        ratio = sat_avg / dis_avg if dis_avg else 0
        if ratio > 1:
            insights.append(
                f"Satisfied customers spend {ratio:.1f}x more on average "
                f"(\u20a6{sat_avg:,.0f} vs \u20a6{dis_avg:,.0f}), "
                f"reinforcing the ROI of satisfaction improvement."
            )

    # Unhappy customer insight
    up = summary.get("unhappy_pct", 0)
    if up > 25:
        insights.append(
            f"Critical: {up:.0f}% of contacts are in the Unhappy tier. "
            f"Immediate intervention with personalised outreach is recommended."
        )
    elif up > 10:
        insights.append(
            f"{up:.0f}% of contacts are Unhappy. "
            f"A targeted recovery campaign could convert these to neutral or satisfied."
        )

    if not insights:
        insights.append("Insufficient data to generate detailed insights.")

    return insights


def _generate_recommendations(
    summary: Dict[str, Any],
    distribution: List[dict],
    comparison: Dict[str, Any],
    campaign_perf: Dict[str, Any],
    pipeline_summary: List[dict],
) -> List[Dict[str, str]]:
    """Generate prioritised recommendations."""
    recs: List[Dict[str, str]] = []

    # Based on satisfaction
    sa = summary.get("satisfaction_avg", 0)
    if sa < 50:
        recs.append({
            "priority": "HIGH",
            "title": "Launch Customer Recovery Campaign",
            "description": (
                "Satisfaction is critically low. Deploy personalised WhatsApp "
                "outreach to unhappy and at-risk contacts with special offers "
                "or service recovery messages."
            ),
            "impact": "Could recover 20-40% of at-risk customers",
        })
    elif sa < 70:
        recs.append({
            "priority": "MEDIUM",
            "title": "Improve Customer Experience Touchpoints",
            "description": (
                "Satisfaction is moderate. Review common complaint themes "
                "and address the top 3 issues to move more contacts into "
                "the Satisfied and Delighted tiers."
            ),
            "impact": "10-20% improvement in satisfaction scores",
        })

    # Based on engagement
    ap = summary.get("active_pct", 0)
    if ap < 50:
        recs.append({
            "priority": "HIGH",
            "title": "Re-engage Dormant Contacts",
            "description": (
                f"{100-ap:.0f}% of contacts are inactive. Send a re-engagement "
                f"broadcast with a compelling offer or valuable content to "
                f"reactivate dormant customers."
            ),
            "impact": "Potential 15-30% reactivation rate",
        })

    # Based on campaign performance
    rr = campaign_perf.get("response_rate", 0)
    if rr < 10 and campaign_perf.get("total_campaigns", 0) > 0:
        recs.append({
            "priority": "MEDIUM",
            "title": "Optimise Campaign Messaging",
            "description": (
                f"Campaign response rate is {rr:.1f}%. Test different message "
                f"templates, personalisation tokens, and send times to improve "
                f"engagement."
            ),
            "impact": "2-5x improvement in response rates",
        })

    # Based on pipeline
    if pipeline_summary:
        total_deals = sum(s.get("deal_count", 0) for s in pipeline_summary)
        won_deals = sum(s.get("won_count", 0) for s in pipeline_summary)
        if total_deals > 0:
            win_rate = won_deals / total_deals * 100
            if win_rate < 30:
                recs.append({
                    "priority": "MEDIUM",
                    "title": "Improve Deal Conversion Rate",
                    "description": (
                        f"Win rate is {win_rate:.0f}%. Review deals stuck in "
                        f"early stages and implement follow-up sequences to "
                        f"move them forward."
                    ),
                    "impact": "Increase revenue by improving close rate",
                })

    # Always include a growth recommendation
    recs.append({
        "priority": "LOW",
        "title": "Expand Referral Programme",
        "description": (
            "Leverage your Delighted customers as advocates. Implement a "
            "referral programme with incentives to generate new leads from "
            "your happiest customers."
        ),
        "impact": "New customer acquisition at low cost",
    })

    return recs


# ---------------------------------------------------------------------------
# End-of-campaign metrics
# ---------------------------------------------------------------------------
def compute_campaign_metrics(
    monthly_data: List[Dict[str, Any]],
    campaign_start: str,
    campaign_end: str,
) -> Dict[str, Any]:
    """Compute additional end-of-campaign sections from monthly data."""
    if not monthly_data:
        return {
            "timeline": [],
            "trends": {},
            "analysis": {},
            "practical_recommendations": [],
            "roi_summary": {},
        }

    # Section A: Timeline
    timeline = []
    for i, md in enumerate(monthly_data):
        es = md.get("executive_summary", {})
        timeline.append({
            "month_index": i + 1,
            "active_customers": es.get("active_customers", 0),
            "satisfaction_avg": es.get("satisfaction_avg", 0),
            "total_revenue": es.get("total_revenue", 0),
            "recovery_rate": es.get("recovery_rate", 0),
        })

    # Section B: Trends
    trend_keys = [
        "active_pct", "satisfaction_avg", "delighted_pct", "unhappy_pct",
        "revenue_satisfied_pct", "recovery_rate", "total_revenue",
    ]
    trends: Dict[str, List[float]] = {}
    for key in trend_keys:
        trends[key] = [
            md.get("executive_summary", {}).get(key, 0) for md in monthly_data
        ]

    # Section C: Analysis
    first_es = monthly_data[0].get("executive_summary", {})
    last_es = monthly_data[-1].get("executive_summary", {})
    analysis = {
        "satisfaction_change": round(
            last_es.get("satisfaction_avg", 0) - first_es.get("satisfaction_avg", 0), 1
        ),
        "revenue_change": round(
            last_es.get("total_revenue", 0) - first_es.get("total_revenue", 0), 2
        ),
        "active_change": round(
            last_es.get("active_pct", 0) - first_es.get("active_pct", 0), 1
        ),
        "unhappy_change": round(
            last_es.get("unhappy_pct", 0) - first_es.get("unhappy_pct", 0), 1
        ),
        "total_months": len(monthly_data),
        "campaign_period": f"{campaign_start} to {campaign_end}",
    }

    # What worked / didn't
    if analysis["satisfaction_change"] > 0:
        analysis["what_worked"] = [
            f"Satisfaction improved by {analysis['satisfaction_change']:.1f} points over the campaign.",
            "Consistent engagement through WhatsApp campaigns maintained customer interest.",
        ]
    else:
        analysis["what_worked"] = [
            "Campaign maintained baseline engagement despite challenges.",
        ]

    analysis["what_didnt_work"] = []
    if analysis["unhappy_change"] > 0:
        analysis["what_didnt_work"].append(
            f"Unhappy customer percentage increased by {analysis['unhappy_change']:.1f}pp."
        )
    if not analysis["what_didnt_work"]:
        analysis["what_didnt_work"].append("No significant negative trends detected.")

    # Section D: Practical recommendations
    practical_recs = [
        {
            "category": "Repeat",
            "items": [
                "Continue regular WhatsApp broadcast campaigns.",
                "Maintain personalised follow-up sequences.",
                "Keep satisfaction monitoring active.",
            ],
        },
        {
            "category": "Change",
            "items": [
                "Test new message templates for higher response rates.",
                "Segment campaigns by satisfaction tier for targeted messaging.",
                "Introduce loyalty programme for Delighted customers.",
            ],
        },
        {
            "category": "Stop",
            "items": [
                "Discontinue generic broadcast messages with low engagement.",
                "Stop sending to contacts who have explicitly opted out.",
            ],
        },
    ]

    # Section E: ROI Summary
    total_revenue = sum(
        md.get("executive_summary", {}).get("total_revenue", 0)
        for md in monthly_data
    )
    roi_summary = {
        "total_revenue_generated": round(total_revenue, 2),
        "campaign_duration_months": len(monthly_data),
        "avg_monthly_revenue": round(
            total_revenue / len(monthly_data), 2
        ) if monthly_data else 0,
        "total_contacts_reached": max(
            (md.get("executive_summary", {}).get("total_contacts", 0)
             for md in monthly_data),
            default=0,
        ),
        "final_satisfaction": last_es.get("satisfaction_avg", 0),
        "satisfaction_improvement": analysis["satisfaction_change"],
    }

    return {
        "timeline": timeline,
        "trends": trends,
        "analysis": analysis,
        "practical_recommendations": practical_recs,
        "roi_summary": roi_summary,
    }


# ---------------------------------------------------------------------------
# Sample data generator (for --dry-run)
# ---------------------------------------------------------------------------
def generate_sample_data() -> Dict[str, Any]:
    """Generate realistic sample data for dry-run report testing."""
    random.seed(42)
    num_contacts = 150

    # Sample names
    first_names = [
        "Adebayo", "Chioma", "Emeka", "Fatima", "Ibrahim", "Jumoke",
        "Kelechi", "Lola", "Musa", "Ngozi", "Oluwaseun", "Patience",
        "Rasheed", "Sade", "Tunde", "Uche", "Victoria", "Wale",
        "Yetunde", "Zainab", "Aisha", "Bola", "Chidi", "Damilola",
        "Eze", "Funke", "Gbenga", "Halima", "Ikenna", "Jide",
    ]
    last_names = [
        "Adeyemi", "Okafor", "Balogun", "Nwosu", "Abubakar", "Ogundimu",
        "Eze", "Adeniyi", "Mohammed", "Obi", "Olawale", "Nnamdi",
        "Bakare", "Chukwu", "Danjuma", "Fashola", "Garba", "Hassan",
        "Igwe", "Johnson", "Kalu", "Lawal", "Madu", "Nwachukwu",
    ]
    companies = [
        "Lagos Fresh Foods", "Abuja Auto Parts", "Kano Textiles Ltd",
        "Port Harcourt Oil Services", "Ibadan Agro Supplies",
        "Enugu Electronics", "Benin Beauty Supplies", "Kaduna Construction",
        "Owerri Pharmaceuticals", "Abeokuta Furniture", "Warri Marine",
        "Jos Mining Corp", "Calabar Tourism", "Sokoto Leather Works",
    ]

    stages = [
        "Data Import", "Segmentation", "Campaign Active",
        "Follow-up", "Won Back", "Lost",
    ]
    stage_weights = [5, 10, 30, 25, 20, 10]

    tag_pool = [
        "satisfied", "delighted", "complaint", "unhappy", "referral",
        "review", "testimonial", "won-back", "high-value", "new-customer",
        "repeat-buyer", "issue", "VIP", "dormant", "reactivated",
    ]

    product_names = [
        "Premium Hair Oil", "Organic Shea Butter", "African Black Soap",
        "Coconut Hair Cream", "Vitamin C Serum", "Body Lotion Deluxe",
        "Beard Growth Kit", "Natural Perfume Set", "Skin Repair Cream",
        "Hair Growth Supplement",
    ]

    # Generate contacts
    contacts = []
    for i in range(num_contacts):
        contacts.append({
            "id": str(uuid.uuid4()),
            "name": f"{random.choice(first_names)} {random.choice(last_names)}",
            "phone": f"+234{random.randint(7000000000, 9099999999)}",
            "email": f"contact{i}@example.com",
            "company": random.choice(companies) if random.random() > 0.3 else "",
            "created_at": (datetime(2026, 1, 1) + timedelta(days=random.randint(0, 150))).isoformat(),
        })

    # Generate tags per contact
    contact_tags: Dict[str, List[str]] = {}
    for c in contacts:
        num_tags = random.choices([0, 1, 2, 3], weights=[20, 40, 30, 10])[0]
        contact_tags[c["id"]] = random.sample(tag_pool, min(num_tags, len(tag_pool)))

    # Generate conversations and messages
    conversations = []
    messages = []
    for c in contacts:
        if random.random() < 0.7:  # 70% have conversations
            conv_id = str(uuid.uuid4())
            conversations.append({
                "id": conv_id,
                "contact_id": c["id"],
                "status": random.choice(["open", "closed"]),
                "last_message_at": (
                    datetime(2026, 6, 1) + timedelta(days=random.randint(0, 29))
                ).isoformat(),
                "created_at": c["created_at"],
            })
            # Generate messages
            num_msgs = random.randint(2, 20)
            for j in range(num_msgs):
                messages.append({
                    "id": str(uuid.uuid4()),
                    "conversation_id": conv_id,
                    "sender_type": random.choice(["customer", "agent", "bot"]),
                    "content_text": "Sample message content",
                    "status": random.choice(["delivered", "read", "sent"]),
                    "created_at": (
                        datetime(2026, 6, 1) + timedelta(
                            days=random.randint(0, 29),
                            hours=random.randint(0, 23),
                        )
                    ).isoformat(),
                })

    # Generate deals
    deals = []
    for c in contacts:
        if random.random() < 0.5:  # 50% have deals
            stage = random.choices(stages, weights=stage_weights)[0]
            deals.append({
                "id": str(uuid.uuid4()),
                "contact_id": c["id"],
                "title": f"Reactivation - {c['name']}",
                "value": round(random.uniform(5000, 500000), 2),
                "currency": "NGN",
                "status": random.choice(["open", "won", "lost"]),
                "pipeline_stages": {"name": stage, "position": stages.index(stage)},
                "created_at": c["created_at"],
                "updated_at": (
                    datetime(2026, 6, 1) + timedelta(days=random.randint(0, 29))
                ).isoformat(),
            })

    # Generate products
    products = []
    for i, name in enumerate(product_names):
        products.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "price": round(random.uniform(2000, 50000), 2),
            "category": random.choice(["Hair Care", "Skin Care", "Body Care", "Supplements"]),
            "status": "active",
        })

    # Generate purchases
    purchases = []
    for c in contacts:
        if random.random() < 0.4:  # 40% have purchases
            num_purchases = random.randint(1, 5)
            for _ in range(num_purchases):
                prod = random.choice(products)
                qty = random.randint(1, 3)
                purchases.append({
                    "id": str(uuid.uuid4()),
                    "contact_id": c["id"],
                    "product_id": prod["id"],
                    "product_name": prod["name"],
                    "amount": round(prod["price"] * qty, 2),
                    "quantity": qty,
                    "purchase_date": (
                        datetime(2026, 6, 1) + timedelta(days=random.randint(0, 29))
                    ).strftime("%Y-%m-%d"),
                })

    # Generate broadcasts
    broadcasts = []
    for i in range(4):
        sent = random.randint(80, 150)
        delivered = int(sent * random.uniform(0.85, 0.98))
        read = int(delivered * random.uniform(0.4, 0.75))
        replied = int(read * random.uniform(0.1, 0.35))
        failed = sent - delivered
        broadcasts.append({
            "id": str(uuid.uuid4()),
            "name": f"Campaign Wave {i+1}",
            "template_name": f"reactivation_wave_{i+1}",
            "status": "completed",
            "total_recipients": sent,
            "sent_count": sent,
            "delivered_count": delivered,
            "read_count": read,
            "replied_count": replied,
            "failed_count": failed,
            "created_at": (
                datetime(2026, 6, 1) + timedelta(days=i * 7)
            ).isoformat(),
        })

    # Pipeline stages
    pipeline_stages = [
        {"id": str(uuid.uuid4()), "name": s, "position": i}
        for i, s in enumerate(stages)
    ]

    return {
        "contacts": contacts,
        "conversations": conversations,
        "messages": messages,
        "deals": deals,
        "products": products,
        "purchases": purchases,
        "broadcasts": broadcasts,
        "broadcast_recipients": [],
        "contact_tags": contact_tags,
        "pipeline_stages": pipeline_stages,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _safe_float(val: Any) -> float:
    """Safely convert a value to float."""
    try:
        return float(val) if val is not None else 0.0
    except (ValueError, TypeError):
        return 0.0


def _parse_date(val: str) -> Optional[date]:
    """Parse a date string (YYYY-MM-DD or ISO datetime) to date."""
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00")).date()
    except (ValueError, AttributeError):
        try:
            return datetime.strptime(val[:10], "%Y-%m-%d").date()
        except (ValueError, AttributeError):
            return None


def format_currency(amount: float, symbol: str = "\u20a6") -> str:
    """Format amount as Nigerian Naira with commas."""
    if amount >= 1_000_000:
        return f"{symbol}{amount:,.0f}"
    elif amount >= 1000:
        return f"{symbol}{amount:,.0f}"
    else:
        return f"{symbol}{amount:,.2f}"


def format_percentage(value: float) -> str:
    """Format a percentage value."""
    return f"{value:.1f}%"


def format_number(value: int) -> str:
    """Format a number with commas."""
    return f"{value:,}"
