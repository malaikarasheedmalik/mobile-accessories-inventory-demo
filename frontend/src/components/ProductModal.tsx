'use client';

import { fmtCurrency } from '@/lib/inventory';
import StatusBadge from '@/components/StatusBadge';
import { useInventory } from '@/store/useInventory';

export default function ProductModal() {
  const { modalProduct, openProduct, openStockAction } = useInventory();
  if (!modalProduct) return null;
  const p = modalProduct;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={() => openProduct(null)}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-500">
              {(p.product_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-[15px] font-semibold text-slate-800">{p.product_name}</div>
              <div className="font-mono text-[12px] text-slate-400">{p.sku}</div>
            </div>
          </div>
          <button onClick={() => openProduct(null)} className="rounded-md p-1 text-slate-400 hover:text-slate-600" aria-label="Close">
            <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Current Stock</div>
            <div className="mt-1 text-[16px] font-semibold text-slate-800">{p.current_stock} units</div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Status</div>
            <div className="mt-1.5"><StatusBadge status={p.status} /></div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Selling Price</div>
            <div className="mt-1 text-[16px] font-semibold text-slate-800">{fmtCurrency(p.selling_price)}</div>
          </div>
          {p.category ? (
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Category</div>
              <div className="mt-1 text-[14px] font-medium text-slate-700">{p.category}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
          Stock movement history is not exposed by the current inventory API.
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => openStockAction(p, 'add')}
            className="flex-1 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Add Stock
          </button>
          <button
            onClick={() => openStockAction(p, 'sale')}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-700"
          >
            Record Sale
          </button>
        </div>
      </div>
    </div>
  );
}