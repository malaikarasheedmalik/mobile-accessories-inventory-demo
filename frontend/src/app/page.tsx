'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useInventory } from '@/store/useInventory';
import { computeKpis, fmtCurrency, fmtNum, statusOf } from '@/lib/inventory';
import KpiCard, { kpiIcons } from '@/components/KpiCard';
import ProductTable from '@/components/ProductTable';
import CategoryChart from '@/components/CategoryChart';
import AiChat from '@/components/AiChat';
import { SkeletonChart, SkeletonRows } from '@/components/Skeletons';

export default function DashboardPage() {
  const { products, loaded, loadError, reload, config } = useInventory();
  const k = useMemo(() => computeKpis(products), [products]);

  const lowStock = useMemo(
    () =>
      products
        .filter(p => statusOf(p) === 'LOW_STOCK' || statusOf(p) === 'OUT_OF_STOCK')
        .sort((a, b) => a.current_stock - b.current_stock)
        .slice(0, config?.dashboard.lowStockCount ?? 6),
    [products, config]
  );

  const recent = useMemo(() => products.slice(0, config?.dashboard.recentProductCount ?? 6), [products, config]);

  return (
    <div className="space-y-5">
      {loadError ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-[13px] font-medium text-red-700">Unable to load inventory from n8n.</div>
          <div className="text-[12px] text-red-600">{loadError}</div>
          <button onClick={reload} className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard icon={kpiIcons.products} tone="blue" value={loaded ? fmtNum(k.products) : '...'} label="Total Products" />
        <KpiCard icon={kpiIcons.stock} tone="green" value={loaded ? fmtNum(k.units) : '...'} label="Total Stock Units" />
        <KpiCard icon={kpiIcons.low} tone="amber" value={loaded ? fmtNum(k.low) : '...'} label="Low Stock" />
        <KpiCard icon={kpiIcons.out} tone="red" value={loaded ? fmtNum(k.out) : '...'} label="Out of Stock" />
        <KpiCard icon={kpiIcons.value} tone="indigo" value={loaded ? fmtCurrency(k.value) : '...'} label="Inventory Value" wide />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Inventory Overview</h3>
              <Link href="/inventory" className="text-[12px] font-medium text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              {!loaded ? <SkeletonRows rows={4} /> : <ProductTable products={recent} emptyState={{ title: 'No products found' }} />}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Inventory Attention</h3>
              <Link href="/inventory#low" className="text-[12px] font-medium text-blue-600 hover:text-blue-700">
                View Low Stock
              </Link>
            </div>
            {!loaded ? (
              <SkeletonRows rows={3} />
            ) : lowStock.length ? (
              <ul className="divide-y divide-slate-100">
                {lowStock.map(p => (
                  <li key={p.sku} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-[13px] font-medium text-slate-700">{p.product_name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{p.sku}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-[15px] font-semibold ${p.current_stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.current_stock}</div>
                        <div className="text-[11px] text-slate-400">{p.current_stock <= 0 ? 'out of stock' : 'units left'}</div>
                      </div>
                      <div className={`h-2 w-2 rounded-full ${p.current_stock <= 0 ? 'bg-red-500' : 'bg-amber-500'}`} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center text-[13px] text-slate-400">All products are sufficiently stocked.</div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {(config?.quickActions ?? []).map(a => (
                <Link key={a.label} href={`/assistant?q=${encodeURIComponent(a.command)}`} className="rounded-md border border-slate-200 px-3 py-2.5 text-[12px] font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-700">
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Inventory by Category</h3>
            </div>
            {!loaded ? <SkeletonChart /> : <CategoryChart products={products} />}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{config?.assistant.title ?? 'Inventory AI'}</h3>
              {config?.assistant.badges.map(b => (
                <span key={b} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                  {b}
                </span>
              ))}
            </div>
            <AiChat compact />
          </div>
        </div>
      </div>
    </div>
  );
}