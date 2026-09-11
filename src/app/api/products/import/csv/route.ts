import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

interface ParsedProduct {
  name: string;
  price: number;
  category?: string;
  description?: string;
  short_pitch?: string;
  cost?: number;
  sku?: string;
  image_url?: string;
  status?: string;
  unit_of_measure?: string;
  track_inventory?: boolean;
  stock_quantity?: number;
  reorder_point?: number;
  supplier_name?: string;
  supplier_phone?: string;
  tags?: string[];
}

interface ImportResult {
  products: ParsedProduct[];
  warnings: string[];
  errors: string[];
  total: number;
  skipped: number;
}

const MAX_PRODUCTS = 500;

const COLUMN_MAP: Record<string, keyof ParsedProduct> = {
  name: 'name',
  product_name: 'name',
  'product name': 'name',
  title: 'name',
  price: 'price',
  amount: 'price',
  'unit price': 'price',
  'unit_price': 'price',
  category: 'category',
  type: 'category',
  description: 'description',
  desc: 'description',
  short_pitch: 'short_pitch',
  pitch: 'short_pitch',
  tagline: 'short_pitch',
  cost: 'cost',
  'cost price': 'cost',
  cost_price: 'cost',
  sku: 'sku',
  'product code': 'sku',
  product_code: 'sku',
  code: 'sku',
  image_url: 'image_url',
  image: 'image_url',
  photo: 'image_url',
  picture: 'image_url',
  'image url': 'image_url',
  'photo url': 'image_url',
  status: 'status',
  unit_of_measure: 'unit_of_measure',
  unit: 'unit_of_measure',
  uom: 'unit_of_measure',
  track_inventory: 'track_inventory',
  stock_quantity: 'stock_quantity',
  stock: 'stock_quantity',
  quantity: 'stock_quantity',
  qty: 'stock_quantity',
  reorder_point: 'reorder_point',
  'reorder point': 'reorder_point',
  supplier_name: 'supplier_name',
  supplier: 'supplier_name',
  supplier_phone: 'supplier_phone',
  'supplier phone': 'supplier_phone',
  tags: 'tags',
};

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple CSV parser handling quoted fields
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

function validateImageUrl(url: string): { valid: boolean; warning?: string } {
  if (!url) return { valid: true };
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, warning: `Invalid image URL protocol: ${url}` };
    }
    const ext = parsed.pathname.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    if (ext && !validExts.includes(ext)) {
      return { valid: true, warning: `Image URL may not be an image: ${url}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, warning: `Invalid image URL: ${url}` };
  }
}

function parseProducts(content: string): ImportResult {
  const rows = parseCSV(content);
  if (rows.length < 2) {
    return { products: [], warnings: [], errors: ['File must have a header row and at least one data row'], total: 0, skipped: 0 };
  }

  const headerRow = rows[0];
  const columnMapping: (keyof ParsedProduct | null)[] = headerRow.map((h) => {
    const normalized = h.toLowerCase().trim();
    return COLUMN_MAP[normalized] ?? null;
  });

  if (!columnMapping.includes('name')) {
    return { products: [], warnings: [], errors: ['CSV must have a "name" or "product_name" column'], total: 0, skipped: 0 };
  }

  const products: ParsedProduct[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let skipped = 0;

  const unmapped = headerRow.filter((_, i) => !columnMapping[i]);
  if (unmapped.length > 0) {
    warnings.push(`Unmapped columns (ignored): ${unmapped.join(', ')}`);
  }

  const dataRows = rows.slice(1, MAX_PRODUCTS + 1);
  if (rows.length - 1 > MAX_PRODUCTS) {
    warnings.push(`File has ${rows.length - 1} rows. Only the first ${MAX_PRODUCTS} were processed.`);
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // 1-indexed, skip header
    const raw: Record<string, string> = {};

    for (let j = 0; j < columnMapping.length; j++) {
      const key = columnMapping[j];
      if (key && row[j]) {
        raw[key] = row[j];
      }
    }

    // Validate required fields
    if (!raw.name?.trim()) {
      warnings.push(`Row ${rowNum}: Missing product name, skipped`);
      skipped++;
      continue;
    }

    const product: ParsedProduct = {
      name: raw.name.trim(),
      price: 0,
    };

    // Parse price
    if (raw.price) {
      const cleaned = raw.price.replace(/[^\d.,-]/g, '').replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed >= 0) {
        product.price = parsed;
      } else {
        warnings.push(`Row ${rowNum}: Invalid price "${raw.price}", defaulting to 0`);
      }
    } else {
      warnings.push(`Row ${rowNum}: No price for "${product.name}", defaulting to 0`);
    }

    // Optional string fields
    if (raw.category) product.category = raw.category.trim();
    if (raw.description) product.description = raw.description.trim();
    if (raw.short_pitch) product.short_pitch = raw.short_pitch.trim();
    if (raw.sku) product.sku = raw.sku.trim();
    if (raw.supplier_name) product.supplier_name = raw.supplier_name.trim();
    if (raw.supplier_phone) product.supplier_phone = raw.supplier_phone.trim();
    if (raw.unit_of_measure) product.unit_of_measure = raw.unit_of_measure.trim();

    // Image URL with validation
    if (raw.image_url) {
      const imgResult = validateImageUrl(raw.image_url.trim());
      if (imgResult.valid) {
        product.image_url = raw.image_url.trim();
      }
      if (imgResult.warning) {
        warnings.push(`Row ${rowNum}: ${imgResult.warning}`);
      }
    }

    // Numeric fields
    if (raw.cost) {
      const cleaned = raw.cost.replace(/[^\d.,-]/g, '').replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) product.cost = parsed;
    }
    if (raw.stock_quantity) {
      const parsed = parseInt(raw.stock_quantity, 10);
      if (!isNaN(parsed)) {
        product.stock_quantity = parsed;
        product.track_inventory = true;
      }
    }
    if (raw.reorder_point) {
      const parsed = parseInt(raw.reorder_point, 10);
      if (!isNaN(parsed)) product.reorder_point = parsed;
    }

    // Status
    if (raw.status) {
      const s = raw.status.toLowerCase().trim();
      if (['active', 'discontinued', 'seasonal'].includes(s)) {
        product.status = s;
      }
    }

    // Track inventory
    if (raw.track_inventory) {
      const v = raw.track_inventory.toLowerCase().trim();
      product.track_inventory = ['true', 'yes', '1', 'y'].includes(v);
    }

    // Tags
    if (raw.tags) {
      product.tags = raw.tags.split(/[;|]/).map((t) => t.trim()).filter(Boolean);
    }

    products.push(product);
  }

  return { products, warnings, errors, total: products.length, skipped };
}

// GET: Download CSV template
export async function GET() {
  const template = [
    'name,price,category,description,short_pitch,cost,sku,image_url,status,unit_of_measure,stock_quantity,reorder_point,supplier_name,supplier_phone,tags',
    'Jollof Rice Spice Mix,2500,Spices,Premium jollof rice seasoning blend,The secret to perfect party jollof,800,JRS-001,https://example.com/jollof-spice.jpg,active,pieces,100,20,Mama Spice Ltd,08012345678,spices;cooking;popular',
    'Ankara Fabric (6 yards),15000,Fabrics,Premium quality ankara fabric,Vibrant prints for every occasion,8000,ANK-006,,active,pieces,50,10,Lagos Textile Market,08098765432,fabric;ankara;fashion',
  ].join('\n');

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="product-import-template.csv"',
    },
  });
}

// POST: Parse and validate CSV
export async function POST(req: NextRequest) {
  try {
    const rlIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`productImport:${rlIp}`, RATE_LIMITS.contactImport);
    if (!rl.success) return rateLimitResponse(rl);

    await requireRole('admin');

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content (string) is required' },
        { status: 400 },
      );
    }

    const result = parseProducts(content);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], errors: result.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({
      products: result.products,
      warnings: result.warnings,
      total: result.total,
      skipped: result.skipped,
      source: 'csv',
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
