#!/usr/bin/env python3
"""Create RetailBot Pro and BeautyBot Pro chatbot flow templates in Supabase."""

import json
import httpx
import sys

# Read secrets
secrets = {}
with open("/a0/usr/projects/marketing4effect/.a0proj/secrets.env", "r") as sf:
    for line in sf:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            secrets[key.strip()] = val.strip().strip('"').strip("''")

SUPABASE_URL = secrets["SUPABASE_URL"]
SUPABASE_KEY = secrets["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

USER_ID = "d0c81028-f396-4961-a228-d2080bd620e0"
ACCOUNT_ID = "6ef6ba5f-e3c6-40a5-b1f3-da991ef9d9b1"

client = httpx.Client(base_url=SUPABASE_URL, headers=HEADERS, timeout=30)


def create_flow(name, description, trigger_keywords):
    """Create a flow and return its ID."""
    payload = {
        "user_id": USER_ID,
        "account_id": ACCOUNT_ID,
        "name": name,
        "description": description,
        "status": "draft",
        "trigger_type": "keyword",
        "trigger_config": {"keywords": trigger_keywords},
        "entry_node_id": "start",
    }
    resp = client.post("/rest/v1/flows", json=payload)
    if resp.status_code not in (200, 201):
        print(f"ERROR creating flow {name}: {resp.status_code} {resp.text}")
        sys.exit(1)
    data = resp.json()
    flow_id = data[0]["id"] if isinstance(data, list) else data["id"]
    print(f"Created flow: {name} -> {flow_id}")
    return flow_id


def create_nodes(flow_id, nodes):
    """Create all nodes for a flow."""
    success = 0
    for i, node in enumerate(nodes):
        payload = {
            "flow_id": flow_id,
            "node_key": node["node_key"],
            "node_type": node["node_type"],
            "config": node["config"],
            "position_x": node.get("position_x", 0),
            "position_y": node.get("position_y", i * 120),
        }
        resp = client.post("/rest/v1/flow_nodes", json=payload)
        if resp.status_code not in (200, 201):
            print(f"  ERROR node {node["node_key"]}: {resp.status_code} {resp.text}")
        else:
            success += 1
    print(f"  Created {success}/{len(nodes)} nodes")
    return success


# ======================================================================
# RETAILBOT PRO
# ======================================================================

retail_keywords = [
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "shop", "buy", "order", "price", "how much", "catalog", "catalogue",
    "new arrivals", "delivery", "track", "complaint", "return", "help"
]

retail_nodes = [
    {"node_key": "start", "node_type": "start", "config": {"next_node_key": "welcome"}},
    {"node_key": "welcome", "node_type": "send_buttons", "config": {
        "text": "Welcome to {business_name}! \U0001f6cd\ufe0f\u2728\n\nWe are so glad you are here. How can we help you today?",
        "buttons": [
            {"title": "\U0001f6d2 Shop Now", "reply_id": "shop_now", "next_node_key": "product_inquiry"},
            {"title": "\U0001f4e6 Track Order", "reply_id": "track_order", "next_node_key": "order_tracking_start"},
            {"title": "\U0001f4ac Talk to Us", "reply_id": "talk_to_us", "next_node_key": "general_inquiry"}
        ],
        "footer_text": "Tap a button below to get started"
    }},
    {"node_key": "product_inquiry", "node_type": "send_list", "config": {
        "text": "What are you looking for today? \U0001f440\n\nBrowse our categories below:",
        "button_text": "View Categories",
        "sections": [{"title": "Shop by Category", "rows": [
            {"id": "new_arrivals", "title": "\U0001f195 New Arrivals", "description": "Just dropped this week", "next_node_key": "category_selected"},
            {"id": "womens_fashion", "title": "\U0001f457 Womens Fashion", "description": "Dresses, tops, skirts and more", "next_node_key": "category_selected"},
            {"id": "mens_fashion", "title": "\U0001f454 Mens Fashion", "description": "Shirts, trousers, native wear", "next_node_key": "category_selected"},
            {"id": "kids_baby", "title": "\U0001f476 Kids and Baby", "description": "Adorable styles for little ones", "next_node_key": "category_selected"},
            {"id": "bags_accessories", "title": "\U0001f45c Bags and Accessories", "description": "Bags, jewelry, watches", "next_node_key": "category_selected"},
            {"id": "shoes_footwear", "title": "\U0001f45f Shoes and Footwear", "description": "Sneakers, heels, sandals", "next_node_key": "category_selected"},
            {"id": "sale_items", "title": "\U0001f3f7\ufe0f Sale Items", "description": "Up to 50 percent off selected items", "next_node_key": "category_selected"},
            {"id": "full_catalog", "title": "\U0001f4cb Full Catalog", "description": "See everything we have", "next_node_key": "category_selected"}
        ]}]
    }},
