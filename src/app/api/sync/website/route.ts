import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Public API endpoint for website content sync.
 * Authenticated via API key (query param or header).
 * GET /api/sync/website?key=API_KEY
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey =
      req.nextUrl.searchParams.get("key") ||
      req.headers.get("x-api-key") ||
      "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required. Pass ?key=YOUR_KEY or x-api-key header." },
        { status: 401 },
      );
    }

    const supabase = getAdmin();

    // Find account by sync API key
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("*")
      .eq("website_sync_api_key", apiKey)
      .eq("website_sync_enabled", true)
      .single();

    if (accErr || !account) {
      return NextResponse.json(
        { error: "Invalid API key or sync is disabled." },
        { status: 403 },
      );
    }

    const config = (account.website_sync_config as Record<string, boolean>) ?? {
      products: true,
      testimonials: true,
      stats: true,
    };

    const result: Record<string, unknown> = {
      business: {
        name: account.business_name || account.name || "",
        industry: account.industry || "",
        description: account.description || "",
      },
    };

    // Products
    if (config.products !== false) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, description, price, currency, image_url, category, in_stock")
        .eq("account_id", account.accountId)
        .order("name");

      result.products = (products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: p.price ?? 0,
        currency: p.currency || "NGN",
        image_url: p.image_url || undefined,
        category: p.category || undefined,
        in_stock: p.in_stock !== false,
      }));
    }

    // Testimonials
    if (config.testimonials !== false) {
      const { data: testimonials } = await supabase
        .from("testimonials")
        .select("customer_name, text, rating, created_at")
        .eq("account_id", account.accountId)
        .order("created_at", { ascending: false })
        .limit(20);

      result.testimonials = (testimonials ?? []).map((t) => ({
        customer_name: t.customer_name || "Customer",
        text: t.text || "",
        rating: t.rating ?? 5,
        date: t.created_at,
      }));
    }

    // Stats
    if (config.stats !== false) {
      const { count: totalCustomers } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("account_id", account.accountId);

      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("account_id", account.accountId);

      // Average rating from testimonials
      const { data: ratingData } = await supabase
        .from("testimonials")
        .select("rating")
        .eq("account_id", account.accountId);

      const ratings = (ratingData ?? []).map((r) => r.rating).filter(Boolean);
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
          : 0;

      result.stats = {
        total_customers: totalCustomers ?? 0,
        total_products: totalProducts ?? 0,
        avg_rating: avgRating,
      };
    }

    result.updated_at = new Date().toISOString();

    // Update last sync timestamp
    await supabase
      .from("accounts")
      .update({ website_sync_last_at: new Date().toISOString() })
      .eq("id", account.accountId);

    // Notify webhook if configured
    if (account.website_sync_webhook_url) {
      fetch(account.website_sync_webhook_url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "sync_completed", timestamp: result.updated_at }),
      }).catch(() => { /* fire and forget */ });
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 min cache
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "x-api-key, content-type",
    },
  });
}
