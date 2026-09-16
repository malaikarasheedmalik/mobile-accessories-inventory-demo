'use client';

import { useEffect, useRef, useState } from 'react';
import { useInventory } from '@/store/useInventory';
import EmptyState from '@/components/EmptyState';

interface TxnRow {
  id: string;
  product: string;
  action: string;
  qty: number;
  when: string;
  note: string;
}

export default function TransactionsPage() {
  const { sendChat, connection } = useInventory();
  const [rows, setRows] = useState<TxnRow[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const r = await sendChat('Show recent transactions');
        setMessage(r.meta.text || r.message || '');
        // Only render rows if the backend actually returned parseable transaction data.
        setRows(null);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    })();
  }, [sendChat]);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Transactions</h3>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
            {connection === 'connected' ? 'Live' : 'Offline'}
          </span>
        </div>

        {status === 'loading' ? (
          <div className="px-5 py-10 text-center text-[13px] text-slate-400">Loading transactions...</div>
        ) : rows && rows.length ? (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Action</th>
                  <th className="text-right">Quantity</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium text-slate-800">{r.product}</td>
                    <td>{r.action}</td>
                    <td className="text-right">{r.qty}</td>
                    <td className="text-slate-500">{r.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No recent transactions available."
            subtitle={
              message ||
              'The current inventory API records stock changes but does not expose a transaction history endpoint. '
            }
          />
        )}
      </div>
    </div>
  );
}