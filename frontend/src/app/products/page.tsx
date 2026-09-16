'use client';

import { useMemo, useState } from 'react';
import { useInventory } from '@/store/useInventory';
import { fmtCurrency, statusOf } from '@/lib/inventory';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { SkeletonRows } from '@/components/Skeletons';

export default function ProductsPage() {
  const { products, loaded, openProduct, openStockAction } = useInventory();
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = products.slice();
    if (s) {
      return l.filter(
        p =>
          (p.product_name || '').toLowerCase().includes(s) ||
          (p.sku || '').toLowerCase().includes(s) ||
          (p.category || '').toLowerCase().includes(s)
      );
    }
    return l;
  }, [products, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <svg className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products, SKU, category..."
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <span className="shrink-0 text-[12px] text-slate-400">{loaded ? `${list.length} products` : 'Loading...'}</span>
      </div>

      {!loaded ? (
        <div className="card"><SkeletonRows rows={6} /></div>
      ) : !list.length ? (
        <div className="card">
          <EmptyState title="No products found" subtitle="Try another product name or SKU." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(p => (
            <div key={p.sku} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[14px] font-bold text-slate-500">
                    {(p.product_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <button onClick={() => openProduct(p)} className="text-left text-[14px] font-semibold text-slate-800 hover:text-blue-700">
                      {p.product_name}
                    </button>
                    <div className="font-mono text-[11px] text-slate-400">{p.sku}</div>
                  </div>
                </div>
                <StatusBadge status={statusOf(p)} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                <div>
                  <div className="text-[15px] font-semibold text-slate-800">{p.current_stock}</div>
                  <div className="text-[11px] text-slate-400">Stock</div>
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-slate-800">{fmtCurrency(p.selling_price)}</div>
                  <div className="text-[11px] text-slate-400">Price</div>
                </div>
                <div>
                  <div className="truncate text-[15px] text-slate-700">{p.category || '—'}</div>
                  <div className="text-[11px] text-slate-400">Category</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => openStockAction(p, 'add')} className="flex-1 rounded-md border border-emerald-200 bg-emerald-50 py-2 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100">
                  Add Stock
                </button>
                <button onClick={() => openStockAction(p, 'sale')} className="flex-1 rounded-md bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700">
                  Record Sale
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}