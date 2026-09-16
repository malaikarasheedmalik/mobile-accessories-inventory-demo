import type { AppConfig, ContractResult } from '@/lib/types';

const DEFAULT_CONFIG: AppConfig = {
  brand: { name: 'Mobile Inventory', sub: 'Mobile Accessories Inventory System', tagline: 'AI-Powered Inventory Management' },
  api: { webhookUrl: 'http://localhost:5678/webhook/mobile-inventory', timeoutMs: 90000 },
  dashboard: { recentProductCount: 6, lowStockCount: 6 },
  assistant: { title: 'Inventory AI', subtitle: 'Ask anything about your inventory', badges: ['Gemini AI', 'n8n'], suggestions: [] },
  quickActions: [],
  settings: { showWebhookEditor: true, connectionLabel: { connected: 'n8n Connected', connecting: 'Connecting...', disconnected: 'n8n Unavailable' } }
};

let configCache: AppConfig | null = null;
let configError: string | null = null;

/** Live-edit: fetch /app-config.json on every call (cache-busted). */
export async function getAppConfig(): Promise<AppConfig> {
  try {
    const res = await fetch(`/app-config.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    configCache = (await res.json()) as AppConfig;
    configError = null;
  } catch (err) {
    configError = err instanceof Error ? err.message : 'Unknown error';
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function getConfigError(): string | null {
  return configError;
}

export interface ChatApiResponse extends ContractResult {
  source: 'normalized' | 'n8n' | 'fallback';
}

/**
 * Send a plain-language command to the backend contract endpoint (/api/chat).
 * Never throws for n8n/JSON problems — always returns a structured result.
 */
export async function sendInventoryCommand(message: string): Promise<ChatApiResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const raw = await res.text();
  if (!raw || !raw.trim()) {
    return {
      success: false, message: 'Unable to process the inventory response. Please try again.',
      data: [], error: 'EMPTY_RESPONSE', source: 'fallback',
      meta: { text: '', cls: 'error' }
    };
  }
  let parsed: ChatApiResponse;
  try {
    parsed = JSON.parse(raw) as ChatApiResponse;
  } catch {
    return {
      success: false, message: 'Unable to process the inventory response. Please try again.',
      data: [], error: 'INVALID_JSON', source: 'fallback',
      meta: { text: raw, cls: 'error' }
    };
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.meta === 'undefined') {
    return {
      success: false, message: 'Unable to process the inventory response. Please try again.',
      data: [], error: 'BAD_CONTRACT', source: 'fallback',
      meta: { text: '', cls: 'error' }
    };
  }
  return parsed;
}

export async function loadInventory(): Promise<ContractResult> {
  return sendInventoryCommand('Show all products');
}

export async function saveWebhookUrl(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl })
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}