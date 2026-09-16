'use client';

import { useEffect, useRef, useState } from 'react';
import { useInventory } from '@/store/useInventory';
import { fmtCurrency, fmtNum, statusOf } from '@/lib/inventory';
import CategoryChart, { StockDistribution } from '@/components/CategoryChart';
import KpiCard, { kpiIcons } from '@/components/KpiCard';
import { SkeletonChart, SkeletonRows } from '@/components/Skeletons';

export default function ReportsPage() {
  const { products, loaded, sendChat } = useInventory();
  const [report, setReport] = useState<{ text: string; stats: [string, string][] } | null>(null);
  const [loading, setLoading] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !loaded) return;
    ran.current = true;
    (async () => {
      setLoading(true);
      try {
        const r = await sendChat('Show inventory report');
        const reportData = r.meta.cls === 'report' ? (((r as { data?: unknown[] }).data ?? [])[0] as Record<string, number | null> | undefined) : undefined;
        if (reportData) {
          const rows: [string, string][] = [
            ['Total Products', fmtNum(reportData.products)],
            ['Total Units', fmtNum(reportData.units)],
            ['Inventory Value', fmtCurrency(reportData.inventory_value)],
            ['Inventory Cost', fmtCurrency(reportData.inventory_cost)],
            ['Low Stock', fmtNum(reportData.low_stock)],
            ['Out of Stock', fmtNum(reportData.out_of_stock)]
          ];
          setReport({ text: r.meta.text || r.message, stats: rows });
        } else {
          setReport({ text: r.meta.text || r.message, stats: [] });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loaded, sendChat]);

  const lowCount = products.filter(p => statusOf(p) === 'LOW_STOCK').length;
  const outCount = products.filter(p => statusOf(p) === 'OUT_OF_STOCK').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard icon={kpiIcons.products} tone="blue" value={loaded ? fmtNum(products.length) : '...'} label="Total Products" />
        <KpiCard icon={kpiIcons.low} tone="amber" value={loaded ? fmtNum(lowCount) : '...'} label="Low Stock" />
        <KpiCard icon={kpiIcons.out} tone="red" value={loaded ? fmtNum(outCount) : '...'} label="Out of Stock" />
        <KpiCard icon={kpiIcons.value} tone="indigo" value={loaded ? 'Real-time' : '...'} label="Inventory Value" />
        <KpiCard icon={kpiIcons.stock} tone="green" value={loaded ? fmtNum(products.reduce((s, p) => s + (Number(p.current_stock) || 0), 0)) : '...'} label="Total Units" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Inventory Report</h3>
            {report?.stats.length ? null : <span className="text-[11px] text-slate-400">Generated from n8n + Gemini</span>}
          </div>
          {loading || !report ? (
            <SkeletonRows rows={6} />
          ) : report.stats.length ? (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-lg bg-slate-100 sm:grid-cols-3">
              {report.stats.map(([label, value]) => (
                <div key={label} className="bg-white p-4">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-[13px] text-slate-400">{report.text || 'No report data available.'}</div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Stock Distribution</h3>
          </div>
          {!loaded ? <SkeletonChart /> : <StockDistribution products={products} />}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Inventory by Category</h3>
        </div>
        {!loaded ? <SkeletonChart /> : <CategoryChart products={products} />}
      </div>
    </div>
  );
}