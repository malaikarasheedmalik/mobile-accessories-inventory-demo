'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInventory } from '@/store/useInventory';

const pages: Record<string, [string, string]> = {
  '/': ['Dashboard', 'Overview of your mobile accessories inventory'],
  '/inventory': ['Inventory', 'Browse, search, filter and manage your products'],
  '/products': ['Products', 'Your mobile accessories catalog'],
  '/transactions': ['Transactions', 'Recent stock activity'],
  '/reports': ['Reports', 'Inventory statistics and analytics'],
  '/assistant': ['AI Assistant', 'Ask anything about your inventory'],
  '/settings': ['Settings', 'Connection and configuration']
};

const dotClass = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-400 animate-pulse',
  disconnected: 'bg-red-500'
};
const labelFor = {
  connected: 'n8n Connected',
  connecting: 'Connecting...',
  disconnected: 'n8n Unavailable'
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { connection, setConnection } = useInventory();
  const [time, setTime] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }) +
          ' · ' +
          now.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })
      );
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // keep mobile menu in sync with navigation
    setMenuOpen(false);
  }, [pathname]);

  const meta = pages[pathname] ?? pages['/'];

  const onGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = (e.target as HTMLInputElement).value.trim();
      router.push('/inventory?q=' + encodeURIComponent(q));
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{meta[0]}</h1>
            <p className="hidden text-[12px] text-slate-500 sm:block">{meta[1]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <svg className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              onKeyDown={onGlobalSearch}
              placeholder="Search products, SKU, category..."
              className="w-56 rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${dotClass[connection]}`} />
            <span className="text-[12px] font-medium text-slate-600">{labelFor[connection]}</span>
          </div>
          <div className="hidden text-[12px] text-slate-400 lg:block">{time}</div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar text-slate-300">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
                </div>
                <div className="text-sm font-semibold text-white">Mobile Inventory</div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="text-slate-400" aria-label="Close menu">
                <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 px-3">
              {Object.entries(pages).map(([href, [label]]) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium ${active ? 'bg-sidebar-soft text-white' : 'text-slate-400'}`}>
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/5 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-300">n8n</span>
                <span className={`h-2 w-2 rounded-full ${dotClass[connection]}`} />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}