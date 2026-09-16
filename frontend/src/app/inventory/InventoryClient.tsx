'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInventory } from '@/store/useInventory';
import { statusOf } from '@/lib/inventory';
import ProductTable from '@/components/ProductTable';
import { SkeletonRows } from '@/components/Skeletons';

type StatusFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

const pills: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'IN_STOCK', label: 'In Stock' },
  { id: 'LOW_STOCK', label: 'Low Stock' },
  { id: 'OUT_OF_STOCK', label: 'Out of Stock' }
];

export default function InventoryClient() {
  const { products, loaded } = useInventory();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('name');

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])).sort(), [products]);

  const list = useMemo(() => {
    let l = products.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      l = l.filter(
        p =>
          (p.product_name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          (p.compatibility || '').toLowerCase().includes(q)
      );
    }
    if (status !== 'ALL') l = l.filter(p => statusOf(p) === status);
    if (category) l = l.filter(p => p.category === category);
    if (sort === 'name') l.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
    else if (sort === 'stock-asc') l.sort((a, b) => a.current_stock - b.current_stock);
    else if (sort === 'stock-desc') l.sort((a, b) => b.current_stock - a.current_stock);
    else if (sort === 'price-asc') l.sort((a, b) => a.selling_price - b.selling_price);
    else if (sort === 'price-desc') l.sort((a, b) => b.selling_price - a.selling_price);
    return l;
  }, [products, search, status, category, sort]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <svg className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products, SKU, category..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-600 outline-none focus:border-blue-400">
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-600 outline-none focus:border-blue-400">
              <option value="name">Sort: Name</option>
              <option value="stock-desc">Stock: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="price-asc">Price: Low to High</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {pills.map(p => (
            <button
              key={p.id}
              onClick={() => setStatus(p.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                status === p.id ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-blue-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Products</h3>
          <span className="text-[12px] text-slate-400">
            {loaded ? `${list.length} product${list.length === 1 ? '' : 's'}` : 'Loading...'}
          </span>
        </div>
        {!loaded ? (
          <SkeletonRows rows={6} />
        ) : (
          <ProductTable
            products={list}
            emptyState={{
              title: search || status !== 'ALL' || category ? 'No matching products' : 'No products found',
              subtitle: search || status !== 'ALL' || category ? 'Try another product name, SKU, or category, or clear the filters.' : undefined
            }}
          />
        )}
      </div>
    </div>
  );
}