'use client';

import { useState } from 'react';
import { useInventory } from '@/store/useInventory';

export default function StockModal() {
  const { stockAction, closeStockAction, sendChat, reload } = useInventory();
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!stockAction) return null;
  const { product, type } = stockAction;
  const isAdd = type === 'add';

  const submit = async () => {
    const n = parseInt(qty, 10);
    if (!n || n <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (!isAdd && n > product.current_stock) {
      setError(`Cannot sell ${n} units. Only ${product.current_stock} unit(s) available.`);
      return;
    }
    setError(null);
    setBusy(true);
    const cmd = isAdd ? `Stock in ${n} ${product.product_name}${note.trim() ? ', note ' + note.trim() : ''}` : `Sell ${n} ${product.product_name}`;
    await sendChat(cmd);
    setBusy(false);
    closeStockAction();
    await reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={() => !busy && closeStockAction()}>
      <div className="w-full overflow-y-auto rounded-t-xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-slate-800">{isAdd ? 'Add Stock' : 'Record Sale'}</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {product.product_name} <span className="font-mono">({product.sku})</span>
            </p>
          </div>
          <button onClick={() => closeStockAction()} className="rounded-md p-1 text-slate-400 hover:text-slate-600" aria-label="Close">
            <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px]">
          <span className="text-slate-500">Current stock</span>
          <span className="font-semibold text-slate-700">{product.current_stock} units</span>
        </div>

        <label className="mt-5 block text-[12px] font-medium text-slate-500">
          {isAdd ? 'Quantity to add' : 'Quantity to sell'}
          <input
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(e.target.value)}
            autoFocus
            className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="mt-4 block text-[12px] font-medium text-slate-500">
          Note <span className="font-normal text-slate-400">(optional)</span>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isAdd ? 'e.g. restock from supplier' : 'e.g. walk-in customer'}
            className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {error ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">{error}</div> : null}

        <div className="mt-5 flex gap-2">
          <button onClick={() => closeStockAction()} disabled={busy} className="flex-1 rounded-md border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className={`flex-1 rounded-md px-4 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-50 ${
              isAdd ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {busy ? 'Processing...' : isAdd ? 'Add Stock' : 'Record Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}