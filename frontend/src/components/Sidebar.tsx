'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInventory } from '@/store/useInventory';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { href: '/inventory', label: 'Inventory', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
  { href: '/products', label: 'Products', icon: 'M16 3h5v5M8 3H3v5M21 16v5h-5M3 16v5h5' },
  { href: '/transactions', label: 'Transactions', icon: 'M8 7h12M8 12h12M8 17h12' },
  { href: '/reports', label: 'Reports', icon: 'M18 20V10M12 20V4M6 20v-6' },
  { href: '/assistant', label: 'AI Assistant', icon: 'M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93M8.24 9.93C6.4 9.58 5 7.95 5 6a4 4 0 0 1 8 0M12 18v4M8 22h8M12 10a6 6 0 0 1 6 6' },
  { href: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }
];

const dotClass = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-400 animate-pulse',
  disconnected: 'bg-red-500'
};

export default function Sidebar() {
  const pathname = usePathname();
  const { connection, config } = useInventory();
  const open = true;
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar text-slate-300 lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
        </div>
        <div>
          <div className="text-[15px] font-semibold leading-tight text-white">{config?.brand.name ?? 'Mobile Inventory'}</div>
          <div className="text-[11px] leading-tight text-slate-400">Mobile Accessories</div>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {navItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? 'bg-sidebar-soft text-white' : 'text-slate-400 hover:bg-sidebar-soft/60 hover:text-slate-200'
              }`}
            >
              <svg className="icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {item.icon.split('M').slice(1).map((seg, i) => (
                  <path key={i} d={'M' + seg} />
                ))}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
          <span className="text-[12px] text-slate-300">n8n</span>
          <span className={`h-2 w-2 rounded-full ${dotClass[connection]}`} />
        </div>
      </div>
    </aside>
  );
}