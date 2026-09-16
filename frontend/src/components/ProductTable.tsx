'use client';

import type { Product } from '@/lib/types';
import { fmtCurrency } from '@/lib/inventory';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { useInventory } from '@/store/useInventory';

export default function ProductTable({
  products,
  emptyState,
  onRowClick
}: {
  products: Product[];
  emptyState: { title: string; subtitle?: string };
  onRowClick?: (p: Product) => void;
}) {
  const { openProduct } = useInventory();
  if (!products.length) {
    return <EmptyState title={emptyState.title} subtitle={emptyState.subtitle} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="table-shell">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th className="text-right">Stock</th>
            <th className="text-right">Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.sku} onClick={() => (onRowClick ? onRowClick(p) : openProduct(p))}>
              <td>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-500">
                    {(p.product_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="font-medium text-slate-800">{p.product_name}</div>
                </div>
              </td>
              <td className="font-mono text-[12px] text-slate-500">{p.sku}</td>
              <td className="text-slate-500">{p.category || '—'}</td>
              <td className="text-right font-medium text-slate-700">{p.current_stock}</td>
              <td className="text-right text-slate-600">{fmtCurrency(p.selling_price)}</td>
              <td>
                <StatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}