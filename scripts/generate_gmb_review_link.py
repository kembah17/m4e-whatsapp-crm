#!/usr/bin/env python3
"""
M4E - Google My Business Review Link Generator
===============================================

Generates direct Google review links from:
- Google Maps URLs (extracts Place ID or CID)
- Place IDs directly
- Business name search (requires Google API key)

Also generates WhatsApp message templates with the review link.

Usage:
    python generate_gmb_review_link.py --place-id "ChIJN1t_tDeuEmsRUsoyG83frY4"
    python generate_gmb_review_link.py --url "https://maps.google.com/?cid=12345"
    python generate_gmb_review_link.py --search "Mama Put Restaurant Lagos" --api-key YOUR_KEY
    python generate_gmb_review_link.py --place-id "ChIJ..." --business-name "Mama Put" --template

Author: Marketing4Effect (M4E)
Version: 1.0.0
"""

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request


def extract_place_id_from_url(url):
    """Extract Place ID or CID from various Google Maps URL formats."""
    # Format: https://www.google.com/maps/place/.../@.../data=!...!1s0x...:0x...!...
    # The hex after 0x...:0x is the CID
    
    # Try to find Place ID in URL (starts with ChIJ)
    place_id_match = re.search(r'(ChIJ[A-Za-z0-9_-]{20,})', url)
    if place_id_match:
        return {"type": "place_id", "value": place_id_match.group(1)}
    
    # Try CID format: ?cid=XXXXX or !1s0x...:0xXXXX
    cid_match = re.search(r'[?&]cid=(\d+)', url)
    if cid_match:
        return {"type": "cid", "value": cid_match.group(1)}
    
    # Try hex CID in data parameter
    hex_cid_match = re.search(r'0x[0-9a-f]+:0x([0-9a-f]+)', url)
    if hex_cid_match:
        cid = str(int(hex_cid_match.group(1), 16))
        return {"type": "cid", "value": cid}
    
    # Try ftid parameter
    ftid_match = re.search(r'ftid=0x[0-9a-f]+:0x([0-9a-f]+)', url)
    if ftid_match:
        cid = str(int(ftid_match.group(1), 16))
        return {"type": "cid", "value": cid}
    
    return None


def generate_review_link(place_id=None, cid=None):
    """Generate the direct Google review link."""
    if place_id:
        return f"https://search.google.com/local/writereview?placeid={place_id}"
    elif cid:
        # CID-based review link (less common but works)
        return f"https://search.google.com/local/writereview?placeid={cid}"
    return None


def generate_maps_link(place_id=None, cid=None):
    """Generate a Google Maps link for the business."""
    if place_id:
        return f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    elif cid:
        return f"https://maps.google.com/?cid={cid}"
    return None


def search_place_id(query, api_key):
    """Search for a business and return its Place ID using Google Places API."""
    encoded_query = urllib.parse.quote(query)
    url = (
        f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
        f"?input={encoded_query}"
        f"&inputtype=textquery"
        f"&fields=place_id,name,formatted_address,rating,user_ratings_total"
        f"&key={api_key}"
    )
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        if data.get("status") != "OK":
            print(f"  API Error: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
            return None
        
        candidates = data.get("candidates", [])
        if not candidates:
            print("  No results found for that search query.")
            return None
        
        result = candidates[0]
        print(f"  Found: {result.get('name', 'Unknown')}")
        print(f"  Address: {result.get('formatted_address', 'N/A')}")
        if result.get("rating"):
            print(f"  Rating: {result['rating']} ({result.get('user_ratings_total', 0)} reviews)")
        
        return result["place_id"]
        
    except urllib.error.URLError as e:
        print(f"  Network error: {e}")
        return None
    except (json.JSONDecodeError, KeyError) as e:
        print(f"  Parse error: {e}")
        return None


def generate_whatsapp_templates(review_link, business_name="your business"):
    """Generate WhatsApp message templates with the review link."""
    templates = []
    
    # Template 1: Post-satisfaction review request
    templates.append({
        "name": "Review Request (Post-Satisfaction)",
        "message": (
            f"That's wonderful to hear! 😊 Thank you!\n\n"
            f"Would you mind taking 30 seconds to share your experience on Google? "
            f"It really helps {business_name} and other customers find us.\n\n"
            f"👉 {review_link}\n\n"
            f"Just tap the link and leave a quick review. Even a few words make a huge difference! 🙏"
        ),
    })
    
    # Template 2: Gentle reminder
    templates.append({
        "name": "Review Reminder (48hr follow-up)",
        "message": (
            f"Hi! 👋\n\n"
            f"Just a gentle reminder — we'd really appreciate your Google review "
            f"for {business_name}. It takes less than 30 seconds!\n\n"
            f"👉 {review_link}\n\n"
            f"Thank you for supporting local business! 💚"
        ),
    })
    
    # Template 3: Simple and direct
    templates.append({
        "name": "Simple Review Request",
        "message": (
            f"Hi! Thanks for choosing {business_name}. 🙏\n\n"
            f"If you enjoyed your experience, we'd love a quick Google review:\n\n"
            f"👉 {review_link}\n\n"
            f"It helps other people find us. Thank you!"
        ),
    })
    
    return templates


def main():
    parser = argparse.ArgumentParser(
        description="M4E - Google My Business Review Link Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --place-id "ChIJN1t_tDeuEmsRUsoyG83frY4"
  %(prog)s --url "https://maps.google.com/?cid=12345"
  %(prog)s --search "Mama Put Restaurant Lagos" --api-key YOUR_KEY
  %(prog)s --place-id "ChIJ..." --business-name "Mama Put" --template
        """
    )
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--place-id", "-p", help="Google Place ID (starts with ChIJ...)")
    group.add_argument("--url", "-u", help="Google Maps URL for the business")
    group.add_argument("--search", "-s", help="Business name to search for")
    
    parser.add_argument("--api-key", "-k", help="Google Places API key (required for --search)")
    parser.add_argument("--business-name", "-b", default="", help="Business name for templates")
    parser.add_argument("--template", "-t", action="store_true", help="Generate WhatsApp message templates")
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    place_id = None
    cid = None
    
    # Resolve Place ID from input
    if args.place_id:
        place_id = args.place_id.strip()
        print(f"\nUsing Place ID: {place_id}")
        
    elif args.url:
        print(f"\nParsing URL: {args.url}")
        result = extract_place_id_from_url(args.url)
        if not result:
            print("  ERROR: Could not extract Place ID or CID from URL.")
            print("  Try using --search with the business name instead.")
            sys.exit(1)
        if result["type"] == "place_id":
            place_id = result["value"]
            print(f"  Extracted Place ID: {place_id}")
        else:
            cid = result["value"]
            print(f"  Extracted CID: {cid}")
            print("  Note: CID-based links may be less reliable. Consider using Place ID.")
            
    elif args.search:
        if not args.api_key:
            print("\nERROR: --api-key is required when using --search")
            print("Get a key at: https://console.cloud.google.com/apis/credentials")
            sys.exit(1)
        print(f"\nSearching for: {args.search}")
        place_id = search_place_id(args.search, args.api_key)
        if not place_id:
            print("  Could not find the business. Try a more specific search.")
            sys.exit(1)
        print(f"  Place ID: {place_id}")
    
    # Generate links
    review_link = generate_review_link(place_id=place_id, cid=cid)
    maps_link = generate_maps_link(place_id=place_id, cid=cid)
    
    if not review_link:
        print("\nERROR: Could not generate review link.")
        sys.exit(1)
    
    business_name = args.business_name or "our business"
    
    if args.json:
        output = {
            "place_id": place_id,
            "cid": cid,
            "review_link": review_link,
            "maps_link": maps_link,
            "business_name": business_name,
        }
        if args.template:
            output["templates"] = generate_whatsapp_templates(review_link, business_name)
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        print(f"\n{'='*60}")
        print(f"  GOOGLE REVIEW LINK GENERATOR")
        print(f"{'='*60}")
        if place_id:
            print(f"  Place ID:    {place_id}")
        if cid:
            print(f"  CID:         {cid}")
        print(f"  Review Link: {review_link}")
        print(f"  Maps Link:   {maps_link}")
        print(f"{'='*60}")
        
        if args.template:
            templates = generate_whatsapp_templates(review_link, business_name)
            print(f"\n  WHATSAPP MESSAGE TEMPLATES")
            print(f"  (for {business_name})")
            print(f"{'-'*60}")
            for i, tmpl in enumerate(templates, 1):
                print(f"\n  Template {i}: {tmpl['name']}")
                print(f"  {'-'*40}")
                for line in tmpl["message"].split("\n"):
                    print(f"  {line}")
            print(f"\n{'='*60}")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
