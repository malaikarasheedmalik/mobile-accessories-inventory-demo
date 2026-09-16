export default function EmptyState({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      </div>
      <div className="text-[15px] font-semibold text-slate-700">{title}</div>
      {subtitle ? <div className="max-w-sm text-[13px] text-slate-400">{subtitle}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}