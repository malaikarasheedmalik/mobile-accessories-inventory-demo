'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/types';
import { fmtCurrency, fmtNum } from '@/lib/inventory';
import StatusBadge from '@/components/StatusBadge';
import { useInventory } from '@/store/useInventory';

function ProductCard({ sku, product_name, current_stock, selling_price, status }: { sku: string; product_name: string; current_stock: number; selling_price: number; status?: string }) {
  const { openProduct } = useInventory();
  return (
    <button
      type="button"
      onClick={() => openProduct({ sku, product_name, current_stock, selling_price, status })}
      className="w-full rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:shadow-sm"
    >
      <div className="text-[13px] font-semibold text-slate-800">{product_name}</div>
      <div className="mt-0.5 font-mono text-[11px] text-slate-400">{sku}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-[12px] text-slate-500">
          <b className="text-slate-700">Stock:</b> {current_stock} · <b className="text-slate-700">Price:</b> {fmtCurrency(selling_price)}
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-2 text-[11px] font-medium text-blue-600">View Product →</div>
    </button>
  );
}

function ReportPanel({ msg }: { msg: ChatMessage }) {
  const r = msg.report;
  if (!r) return null;
  const rows: [string, string][] = [
    ['Total Products', fmtNum(r.products)],
    ['Total Units', fmtNum(r.units)],
    ['Inventory Value', fmtCurrency(r.inventory_value)],
    ['Inventory Cost', fmtCurrency(r.inventory_cost)],
    ['Low Stock', fmtNum(r.low_stock)],
    ['Out of Stock', fmtNum(r.out_of_stock)]
  ];
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {rows.map(([label, val]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
          <div className="text-[11px] text-slate-400">{label}</div>
          <div className="text-[14px] font-semibold text-slate-700">{val}</div>
        </div>
      ))}
    </div>
  );
}

function BotMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">AI</div>
      <div
        className={`max-w-[85%] rounded-lg rounded-bl-sm border px-3.5 py-2.5 text-[13px] leading-relaxed ${
          msg.cls === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : msg.cls === 'empty'
              ? 'border-slate-200 bg-slate-50 text-slate-600'
              : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        {msg.text ? <div className="whitespace-pre-wrap">{msg.text}</div> : null}
        {msg.products && msg.products.length ? (
          <div className="mt-2 space-y-2">
            {msg.products.map(p => (
              <ProductCard key={p.sku} {...p} />
            ))}
          </div>
        ) : null}
        {msg.cls === 'report' ? <ReportPanel msg={msg} /> : null}
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg rounded-br-sm bg-blue-600 px-3.5 py-2.5 text-[13px] text-white">{msg.text}</div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">AI</div>
      <div className="flex items-center gap-1 rounded-lg rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
      </div>
    </div>
  );
}

export default function AiChat({
  suggestions,
  compact = false
}: {
  suggestions?: string[];
  compact?: boolean;
}) {
  const { messages, chatBusy, sendChat, config, setConnection } = useInventory();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, chatBusy]);

  const submit = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || chatBusy) return;
    setInput('');
    setConnection('connecting');
    await sendChat(t);
  };

  const suggestionList = suggestions ?? config?.assistant.suggestions ?? [];
  const empty = !messages.length;

  return (
    <div className="flex flex-col" style={{ height: compact ? 'calc(100vh - 280px)' : 'calc(100vh - 210px)', minHeight: 400 }}>
      {!compact && (
        <div className="flex items-center gap-2 px-5 pt-4">
          {config?.assistant.badges.map(b => (
            <span key={b} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
              {b}
            </span>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {empty ? (
          <div className="flex flex-col items-start gap-4 px-1 pt-2">
            <p className="max-w-lg text-[13px] leading-relaxed text-slate-500">
              Ask your inventory anything — I can search products, check stock, record sales, restock items, generate reports and more.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestionList.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  disabled={chatBusy}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(m => (m.role === 'user' ? <UserMessage key={m.id} msg={m} /> : <BotMessage key={m.id} msg={m} />))
        )}
        {chatBusy ? <Typing /> : null}
      </div>
      <div className="border-t border-slate-100 p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask your inventory anything..."
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={chatBusy || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
            aria-label="Send"
          >
            <svg className="icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}