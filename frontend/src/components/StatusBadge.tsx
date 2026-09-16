import type { Status } from '@/lib/types';

const styles: Record<Status, { cls: string; dot: string; label: string }> = {
  IN_STOCK: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'In Stock' },
  LOW_STOCK: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Low Stock' },
  OUT_OF_STOCK: { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Out of Stock' }
};

export default function StatusBadge({ status }: { status?: string }) {
  const s: Status = status === 'OUT_OF_STOCK' || status === 'LOW_STOCK' ? status : 'IN_STOCK';
  const st = styles[s];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
}