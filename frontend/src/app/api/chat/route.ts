import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { classifyText, parseProducts, parseReport } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readLiveConfig() {
  try {
    const p = path.join(process.cwd(), 'public', 'app-config.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')) as { api?: { webhookUrl?: string; timeoutMs?: number } };
  } catch {
    return {};
  }
}

function contract(success: boolean, message: string, data: unknown[], error: string | null, text: string, cls?: string) {
  return NextResponse.json(
    {
      success,
      message,
      data,
      error,
      meta: { text, cls: cls ?? classifyText(text) }
    },
    { status: 200 }
  );
}

/**
 * POST /api/chat  { message: string }
 * Normalizes the request, forwards it to the n8n webhook and ALWAYS returns
 * the stable contract: { success, message, data, error }.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return contract(false, 'Please enter an inventory request.', [], 'EMPTY_MESSAGE', '');
  }

  const raw = (body as { message?: unknown } | null)?.message;
  const message = typeof raw === 'string' ? raw.trim() : '';

  if (!message) {
    return contract(false, 'Please enter an inventory request.', [], 'EMPTY_MESSAGE', '');
  }

  const config = readLiveConfig();
  const webhookUrl = config.api?.webhookUrl || 'http://localhost:5678/webhook/mobile-inventory';
  const timeoutMs = config.api?.timeoutMs || 90000;

  let res: Response;
  try {
    res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: message }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === 'TimeoutError' ? 'n8n did not respond in time.' : 'n8n is not reachable. Start n8n and activate the workflow.';
    return contract(false, 'Unable to connect to n8n. ' + reason, [], 'N8N_UNAVAILABLE', '');
  }

  if (!res.ok) {
    return contract(false, `The inventory request could not be completed (HTTP ${res.status}).`, [], res.status >= 500 ? 'N8N_ERROR' : 'N8N_HTTP', '');
  }

  const rawText = await res.text();
  if (!rawText || !rawText.trim()) {
    return contract(false, 'Unable to process the inventory response. Please try again.', [], 'EMPTY_RESPONSE', '');
  }

  let parsed: Record<string, unknown> | null = null;
  let text = rawText;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      const candidate = parsed.response ?? parsed.chatOutput ?? parsed.output;
      if (typeof candidate === 'string' && candidate.trim()) text = candidate.trim();
    }
  } catch {
    text = rawText;
  }
  if (!text) return contract(false, 'Unable to process the inventory response. Please try again.', [], 'EMPTY_RESPONSE', '');

  const cls = classifyText(text);

  if (cls === 'products') {
    return contract(true, text.split('\n')[0] || 'Products', parseProducts(text), null, text, cls);
  }
  if (cls === 'report') {
    return contract(true, 'Inventory report', [parseReport(text)], null, text, cls);
  }
  if (cls === 'error') {
    return contract(false, text.replace(/^ERROR:\s*/i, ''), [], 'INVENTORY_REQUEST_FAILED', text, cls);
  }
  if (cls === 'empty') {
    return contract(true, text, [], null, text, cls);
  }
  // success / info
  return contract(true, text, [], null, text, cls);
}