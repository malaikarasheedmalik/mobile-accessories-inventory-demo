import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const configPath = () => path.join(process.cwd(), 'public', 'app-config.json');

export async function GET() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { webhookUrl?: string };
    const url = (body.webhookUrl || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: 'A valid HTTP(S) webhook URL is required.' }, { status: 400 });
    }
    const p = configPath();
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    cfg.api.webhookUrl = url;
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}