import type { ChatClass, InventoryReport, Kpis, Product, Status } from '@/lib/types';

/** Classify an n8n text response into a renderable category. */
export function classifyText(t: string): ChatClass {
  if (!t) return 'empty';
  if (/^SUCCESS/i.test(t)) return 'success';
  if (/^ERROR/i.test(t)) return 'error';
  if (/INVENTORY SUMMARY/.test(t)) return 'report';
  if (/(^|\n)\s*PRODUCTS?(\s*\(|$)/im.test(t)) return 'products';
  if (/No results found/i.test(t)) return 'empty';
  return 'info';
}

/** Parse one formatted line: SKU | Name | Stock: N | Price: X PKR | Status: X */
export function parseProductLine(line: string): Product | null {
  const parts = line.split('|').map(p => p.trim());
  if (parts.length < 5) return null;
  const stockM = parts[2] && parts[2].match(/Stock:\s*([\d.]+)/i);
  const priceM = parts[3] && parts[3].match(/Price:\s*([\d.]+)/i);
  const statusM = parts[4] && parts[4].match(/Status:\s*([A-Z_]+)/i);
  const status = statusM ? statusM[1].toUpperCase() : (parts[4] || '').toUpperCase();
  return {
    sku: parts[0],
    product_name: parts[1],
    current_stock: stockM ? parseInt(stockM[1], 10) : 0,
    selling_price: priceM ? parseFloat(priceM[1]) : 0,
    status
  };
}

/** Parse a text response into product rows. Sloppy-tolerant. */
export function parseProducts(text: string): Product[] {
  if (!text) return [];
  const prods: Product[] = [];
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (/^PRODUCTS? \(|^INVENTORY|^SUCCESS|^ERROR/i.test(line)) continue;
    if (!line.includes('|')) continue;
    const p = parseProductLine(line);
    if (p && p.sku) prods.push(p);
  }
  return prods;
}

export function parseReport(text: string): InventoryReport {
  const out: InventoryReport = { products: null, units: null, inventory_cost: null, inventory_value: null, low_stock: null, out_of_stock: null };
  if (!text) return out;
  const m = (key: string) => {
    const r = text.match(new RegExp(key + ':\\s*([\\d.]+)'));
    return r ? parseFloat(r[1]) : null;
  };
  out.products = m('Products');
  out.units = m('Total units');
  out.inventory_cost = m('Inventory cost');
  out.inventory_value = m('Inventory value');
  out.low_stock = m('Low stock');
  out.out_of_stock = m('Out of stock');
  return out;
}

export function statusOf(p: { status?: string; current_stock: number }): Status {
  if (p.status) {
    const s = p.status.toUpperCase();
    if (s === 'LOW_STOCK' || s === 'OUT_OF_STOCK' || s === 'IN_STOCK') return s;
  }
  if (p.current_stock <= 0) return 'OUT_OF_STOCK';
  return 'IN_STOCK';
}

export function computeKpis(products: Product[]): Kpis {
  const k: Kpis = { products: products.length, units: 0, low: 0, out: 0, value: 0 };
  for (const p of products) {
    const stk = Number(p.current_stock) || 0;
    const rl = Number(p.reorder_level) || 5;
    k.units += stk;
    k.value += stk * (Number(p.selling_price) || 0);
    const s = statusOf(p);
    if (s === 'OUT_OF_STOCK') k.out++;
    else if (s === 'LOW_STOCK' || (rl > 0 && stk <= rl)) k.low++;
  }
  return k;
}

export function fmtCurrency(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'Unavailable';
  return 'PKR ' + Math.round(v).toLocaleString('en-PK');
}

export function fmtNum(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'Unavailable';
  return Number(v).toLocaleString('en-PK');
}

export function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}