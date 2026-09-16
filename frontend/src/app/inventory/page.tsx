import { Suspense } from 'react';
import InventoryClient from './InventoryClient';

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="card flex items-center justify-center p-16 text-[13px] text-slate-400">Loading inventory...</div>
      }
    >
      <InventoryClient />
    </Suspense>
  );
}