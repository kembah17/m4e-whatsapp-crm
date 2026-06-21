#!/usr/bin/env python3
"""Insert RetailBot Pro and BeautyBot Pro chatbot flows into Supabase."""

import json
import sys
import httpx

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
SCRIPTS_DIR = "/a0/usr/projects/marketing4effect/m4e-whatsapp-crm/scripts"

client = httpx.Client(base_url=SUPABASE_URL, headers=HEADERS, timeout=30)


def create_flow(name, description, trigger_keywords):
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
    success = 0
    for i, node in enumerate(nodes):
        payload = {
            "flow_id": flow_id,
            "node_key": node["node_key"],
            "node_type": node["node_type"],
            "config": node["config"],
            "position_x": 0,
            "position_y": i * 120,
        }
        resp = client.post("/rest/v1/flow_nodes", json=payload)
        if resp.status_code not in (200, 201):
            print(f"  ERROR node {node['node_key']}: {resp.status_code} {resp.text}")
        else:
            success += 1
    print(f"  Created {success}/{len(nodes)} nodes")
    return success


# ======================================================================
# FLOW 1: RetailBot Pro
# ======================================================================
print("=" * 60)
print("CREATING RETAILBOT PRO")
print("=" * 60)

retail_keywords = [
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "shop", "buy", "order", "price", "how much", "catalog", "catalogue",
    "new arrivals", "delivery", "track", "complaint", "return", "help"
]

with open(f"{SCRIPTS_DIR}/retail_nodes.json", "r", encoding="utf-8") as f:
    retail_nodes = json.load(f)

print(f"Loaded {len(retail_nodes)} retail nodes")
retail_flow_id = create_flow(
    "RetailBot Pro",
    "Complete WhatsApp chatbot for boutiques, online stores, and fashion retailers. Handles product browsing, ordering, tracking, complaints, returns, and feedback.",
    retail_keywords
)
create_nodes(retail_flow_id, retail_nodes)


# ======================================================================
# FLOW 2: BeautyBot Pro
# ======================================================================
print()
print("=" * 60)
print("CREATING BEAUTYBOT PRO")
print("=" * 60)

beauty_keywords = [
    "hi", "hello", "hey", "book", "appointment", "hair", "nails",
    "spa", "braids", "locs", "makeup", "facial", "massage",
    "price list", "available", "complaint", "help"
]

with open(f"{SCRIPTS_DIR}/beauty_nodes.json", "r", encoding="utf-8") as f:
    beauty_nodes = json.load(f)

print(f"Loaded {len(beauty_nodes)} beauty nodes")
beauty_flow_id = create_flow(
    "BeautyBot Pro",
    "Complete WhatsApp chatbot for hair salons, spas, nail studios, and beauty service providers. Handles appointment booking, service menu, loyalty program, bridal packages, complaints, and reviews.",
    beauty_keywords
)
create_nodes(beauty_flow_id, beauty_nodes)


# ======================================================================
# VERIFICATION
# ======================================================================
print()
print("=" * 60)
print("VERIFICATION")
print("=" * 60)

resp = client.get(f"/rest/v1/flows?account_id=eq.{ACCOUNT_ID}&select=id,name,entry_node_id")
flows = resp.json()
print(f"Total flows for account: {len(flows)}")
for flow in flows:
    print(f"  - {flow['name']} (id: {flow['id']}, entry: {flow['entry_node_id']})")
    nr = client.get(f"/rest/v1/flow_nodes?flow_id=eq.{flow['id']}&select=id")
    count = len(nr.json())
    print(f"    Nodes: {count}")

print()
print("Done!")
