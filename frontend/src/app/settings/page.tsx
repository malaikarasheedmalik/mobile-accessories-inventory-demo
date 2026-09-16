'use client';

import { useState } from 'react';
import { useInventory } from '@/store/useInventory';
import { saveWebhookUrl } from '@/lib/api';

export default function SettingsPage() {
  const { config, connection, reload } = useInventory();
  const [url, setUrl] = useState(config?.api.webhookUrl ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const v = url.trim();
    if (!v || !/^https?:\/\//i.test(v)) {
      setMsg({ ok: false, text: 'A valid HTTP(S) webhook URL is required.' });
      return;
    }
    setSaving(true);
    const r = await saveWebhookUrl(v);
    setSaving(false);
    setMsg(r.ok ? { ok: true, text: 'Webhook URL updated. Live config file saved.' } : { ok: false, text: r.error || 'Failed to save.' });
    if (r.ok) {
      await reload();
    }
  };

  const statusMap = {
    connected: ['bg-emerald-500', 'n8n Connected'],
    connecting: ['bg-amber-400', 'Connecting...'],
    disconnected: ['bg-red-500', 'n8n Unavailable']
  } as const;
  const [dot, label] = statusMap[connection];

  return (
    <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Connection</h3>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
            <span className="text-[13px] text-slate-500">Backend status</span>
            <span className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </span>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Webhook</div>
            <div className="mt-1 break-all font-mono text-[12px] text-slate-600">{config?.api.webhookUrl ?? '...'}</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">AI</div>
            <div className="mt-1 text-[13px] font-medium text-slate-700">Google Gemini (via n8n credential)</div>
          </div>
          <button onClick={reload} className="rounded-md border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50">
            Reconnect & Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Webhook URL (Live Config)</h3>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-[12px] leading-relaxed text-slate-400">
            Changes are written straight to <code className="font-mono text-slate-500">public/app-config.json</code> — the n8n workflow URL the frontend feeds
            all inventory requests through. No rebuild or restart is needed; edits to that JSON file apply on reload.
          </p>
          <label className="block text-[12px] font-medium text-slate-500">
            n8n webhook URL
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[13px] text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
          {msg ? (
            <div className={`rounded-md border px-3 py-2.5 text-[12px] ${msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          ) : null}
          <button onClick={save} disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Webhook URL'}
          </button>
          <button
            onClick={async () => {
              const r = await saveWebhookUrl(config?.api.webhookUrl ?? '');
              setMsg(r.ok ? { ok: true, text: 'Live config verified. Static server at :8080 serves the legacy demo; Next.js app runs on :3000.' } : { ok: false, text: r.error || 'Failed to save.' });
            }}
            className="rounded-md border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Verify Config
          </button>
        </div>
      </div>
    </div>
  );
}