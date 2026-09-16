import type { Product } from '@/lib/types';
import { fmtNum } from '@/lib/inventory';

export default function CategoryChart({ products }: { products: Product[] }) {
  const byCat: Record<string, number> = {};
  for (const p of products) {
    const c = p.category || 'Other';
    byCat[c] = (byCat[c] || 0) + (Number(p.current_stock) || 0);
  }
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(e => e[1]), 1);
  const colors = ['#2563eb', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];
  return (
    <div className="space-y-3 p-5">
      {entries.map(([name, val], i) => (
        <div key={name} className="flex items-center gap-3">
          <span className="w-28 truncate text-[12px] text-slate-500" title={name}>
            {name}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all" style={{ width: Math.max(4, (val / max) * 100) + '%', background: colors[i % colors.length] }} />
          </div>
          <span className="w-12 text-right text-[12px] font-medium text-slate-600">{fmtNum(val)}</span>
        </div>
      ))}
    </div>
  );
}

export function StockDistribution({ products }: { products: Product[] }) {
  const counts = { IN_STOCK: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 };
  for (const p of products) {
    const s = (p.status || '').toUpperCase();
    if (s === 'LOW_STOCK' || s === 'OUT_OF_STOCK') counts[s]++;
    else counts.IN_STOCK++;
  }
  const labels: Record<string, string> = { IN_STOCK: 'In Stock', LOW_STOCK: 'Low Stock', OUT_OF_STOCK: 'Out of Stock' };
  const colors: Record<string, string> = { IN_STOCK: '#16a34a', LOW_STOCK: '#d97706', OUT_OF_STOCK: '#dc2626' };
  const max = Math.max(...Object.values(counts), 1);
  return (
    <div className="space-y-3 p-5">
      {Object.entries(counts).map(([key, val]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-20 text-[12px] text-slate-500">{labels[key]}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: Math.max(4, (val / max) * 100) + '%', background: colors[key] }} />
          </div>
          <span className="w-8 text-right text-[12px] font-medium text-slate-600">{val}</span>
        </div>
      ))}
    </div>
  );
}