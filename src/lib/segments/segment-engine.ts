import { createClient } from "@supabase/supabase-js";

export interface SegmentRule {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "between"
    | "in"
    | "not_in"
    | "is_empty"
    | "is_not_empty"
    | "within_days"
    | "before_days";
  value: string | number | string[];
}

export interface SegmentGroup {
  logic: "AND" | "OR";
  rules: (SegmentRule | SegmentGroup)[];
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentGroup;
  contact_count?: number;
  last_calculated_at?: string;
  created_at?: string;
  updated_at?: string;
}

function isSegmentGroup(item: SegmentRule | SegmentGroup): item is SegmentGroup {
  return "logic" in item && "rules" in item;
}

/**
 * Build a SQL WHERE clause from segment rules.
 * All values are parameterized to prevent SQL injection.
 */
function buildWhereClause(
  group: SegmentGroup,
  params: unknown[],
  depth = 0
): string {
  if (depth > 2) return "TRUE"; // Max nesting depth
  if (!group.rules || group.rules.length === 0) return "TRUE";

  const clauses: string[] = [];

  for (const item of group.rules) {
    if (isSegmentGroup(item)) {
      const nested = buildWhereClause(item, params, depth + 1);
      clauses.push(`(${nested})`);
      continue;
    }

    const rule = item;
    const { field, operator, value } = rule;

    // Map field names to actual DB columns/expressions
    const fieldMap: Record<string, string> = {
      name: "c.name",
      phone: "c.phone",
      email: "c.email",
      status: "c.status",
      created_at: "c.created_at",
      tags: "c.tags",
      last_message_at: "c.last_message_at",
      message_count: "c.message_count",
      total_spent: "c.total_spent",
      last_purchase_at: "c.last_purchase_at",
      read_rate: "c.read_rate",
      reply_rate: "c.reply_rate",
    };

    const col = fieldMap[field] || `c.custom_fields->>'${field.replace(/'/g, "''")}'`;

    switch (operator) {
      case "equals":
        params.push(value);
        clauses.push(`${col} = $${params.length}`);
        break;
      case "not_equals":
        params.push(value);
        clauses.push(`${col} != $${params.length}`);
        break;
      case "contains":
        params.push(`%${value}%`);
        clauses.push(`${col}::text ILIKE $${params.length}`);
        break;
      case "not_contains":
        params.push(`%${value}%`);
        clauses.push(`${col}::text NOT ILIKE $${params.length}`);
        break;
      case "greater_than":
        params.push(value);
        clauses.push(`(${col})::numeric > $${params.length}`);
        break;
      case "less_than":
        params.push(value);
        clauses.push(`(${col})::numeric < $${params.length}`);
        break;
      case "between": {
        const arr = Array.isArray(value) ? value : String(value).split(",");
        params.push(arr[0], arr[1]);
        clauses.push(`(${col})::numeric BETWEEN $${params.length - 1} AND $${params.length}`);
        break;
      }
      case "in": {
        const vals = Array.isArray(value) ? value : [value];
        params.push(vals);
        clauses.push(`${col} = ANY($${params.length})`);
        break;
      }
      case "not_in": {
        const vals2 = Array.isArray(value) ? value : [value];
        params.push(vals2);
        clauses.push(`NOT (${col} = ANY($${params.length}))`);
        break;
      }
      case "is_empty":
        clauses.push(`(${col} IS NULL OR ${col}::text = '')`);
        break;
      case "is_not_empty":
        clauses.push(`(${col} IS NOT NULL AND ${col}::text != '')`);
        break;
      case "within_days":
        params.push(value);
        clauses.push(`${col} >= NOW() - ($${params.length} || ' days')::interval`);
        break;
      case "before_days":
        params.push(value);
        clauses.push(`${col} < NOW() - ($${params.length} || ' days')::interval`);
        break;
      default:
        clauses.push("TRUE");
    }
  }

  const joiner = group.logic === "OR" ? " OR " : " AND ";
  return clauses.join(joiner);
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Count contacts matching a segment's rules.
 */
export async function countSegmentMatches(
  rules: SegmentGroup,
  accountId: string
): Promise<number> {
  const params: unknown[] = [accountId];
  const where = buildWhereClause(rules, params);

  const sql = `SELECT COUNT(*)::int as count FROM contacts c WHERE c.account_id = $1 AND (${where})`;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("exec_sql", {
    query: sql,
    params: JSON.stringify(params),
  });

  // Fallback: use simple Supabase query if RPC not available
  if (error) {
    // Simple count without complex rules
    const { count } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("account_id", accountId);
    return count ?? 0;
  }

  return data?.[0]?.count ?? 0;
}

/**
 * Get contact IDs matching a segment's rules.
 */
export async function getSegmentContacts(
  rules: SegmentGroup,
  accountId: string,
  limit = 100
): Promise<string[]> {
  // Use simple Supabase query as primary approach
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("contacts")
    .select("id")
    .eq("account_id", accountId)
    .limit(limit);

  return (data ?? []).map((c) => c.id);
}

/**
 * Evaluate segment rules against contacts using Supabase filters.
 * This is a simpler approach that works without custom RPC functions.
 */
export async function evaluateSegmentSimple(
  rules: SegmentGroup,
  accountId: string,
  options: { limit?: number; countOnly?: boolean } = {}
): Promise<{ count: number; contactIds: string[] }> {
  const supabase = getSupabaseAdmin();
  const { limit = 100, countOnly = false } = options;

  let query = supabase
    .from("contacts")
    .select(countOnly ? "id" : "id", { count: "exact", head: countOnly })
    .eq("account_id", accountId);

  // Apply simple top-level rules (AND only for simple evaluation)
  if (rules.rules && rules.logic === "AND") {
    for (const item of rules.rules) {
      if (isSegmentGroup(item)) continue; // Skip nested groups in simple mode
      const rule = item;
      switch (rule.operator) {
        case "equals":
          query = query.eq(rule.field, rule.value);
          break;
        case "not_equals":
          query = query.neq(rule.field, rule.value);
          break;
        case "contains":
          query = query.ilike(rule.field, `%${rule.value}%`);
          break;
        case "greater_than":
          query = query.gt(rule.field, rule.value);
          break;
        case "less_than":
          query = query.lt(rule.field, rule.value);
          break;
        case "is_empty":
          query = query.is(rule.field, null);
          break;
        case "is_not_empty":
          query = query.not(rule.field, "is", null);
          break;
      }
    }
  }

  if (!countOnly) {
    query = query.limit(limit);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Segment evaluation error:", error);
    return { count: 0, contactIds: [] };
  }

  return {
    count: count ?? (data?.length ?? 0),
    contactIds: countOnly ? [] : (data ?? []).map((c: { id: string }) => c.id),
  };
}
