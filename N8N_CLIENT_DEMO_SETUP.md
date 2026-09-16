# Mobile Accessories Inventory System — Client Demo Setup Guide

A complete, client-ready guide to run and demonstrate the
**Mobile Accessories Inventory System** (Next.js + TypeScript + Tailwind frontend, n8n + Gemini backend,
PostgreSQL storage).

## 1. What the client sees

- A modern dashboard with **real KPIs** (products, units, inventory value, low stock) — no fake data.
- A live, filterable **Inventory** grid and **Products** cards.
- **Transactions** and **Reports** pages.
- An **AI Assistant** you can type any command into — English or Urdu:
  - `Show low stock products`
  - `Search iPhone 15 cover`
  - `Sell 3 iPhone 15 covers`
  - `Stock in 20 Type C cables`
  - `What is the total inventory value?`
- A **Settings** page to change the n8n webhook URL live (edits `public/app-config.json` on disk).

## 2. Components

| Component | How to run |
|---|---|
| n8n + PostgreSQL | Docker containers `anomaly-n8n` (:5678) and `anomaly-postgres` (:5432) |
| n8n workflow | `Mobile Accessories Inventory System` (ID `GokO8WzcHnMvQGyh`), ACTIVE |
| Webhook | `POST http://localhost:5678/webhook/mobile-inventory` body `{"chatInput":"..."}` |
| Frontend | `cd frontend && npm install && npm run dev` → http://localhost:3000 |
| Web app API | `POST http://localhost:3000/api/chat` body `{"message":"..."}` (guaranteed JSON contract) |

## 3. Step-by-step to demo

1. **Start backend** (if not running):
   ```bash
   docker start anomaly-postgres anomaly-n8n
   ```
   Wait ~10s, confirm the workflow is active:
   ```bash
   docker logs anomaly-n8n 2>&1 | Select-String "Activated workflow"
   ```
2. **Smoke-test the webhook**:
   ```bash
   curl -X POST http://localhost:5678/webhook/mobile-inventory -H "Content-Type: application/json" -d '{"chatInput":"Show low stock products"}'
   ```
   Expect: `{"response":"PRODUCT\nMC-005 | 10000mAh Power Bank | Stock: 1 | ... LOW_STOCK"}`
3. **Start the frontend**:
   ```bash
   cd frontend
   npm install        # first time only
   npm run dev        # → http://localhost:3000
   ```
4. **Open http://localhost:3000** and walk through:
   - Dashboard → KPI cards, category/value charts, recent products, low-stock panel.
   - Inventory → search/filter/sort (or visit `/inventory?q=iphone`).
   - Products → card grid with status badges.
   - Assistant → click a suggestion or type a command; watch the real reply.
   - Settings → change the webhook URL and save; the app uses it live (back up the original first).
5. **Demo a sale end-to-end** and show it changed the DB:
   ```bash
   curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"Sell 1 iPhone 15 cover"}'
   # then query the DB
   docker exec -i anomaly-postgres psql -U anomaly -d anomaly_radar -c "SELECT * FROM transactions ORDER BY id DESC LIMIT 3;"
   ```

## 4. Data & integrity rules (tell the client)

- PostgreSQL `anomaly_radar` DB: `products` + `transactions` tables (schema in `inventory_schema.md`).
- Every valid `Sell` records a `SALE`, `Stock in` records `STOCK_IN`, `Stock out` records `STOCK_OUT`.
- Negative stock is impossible: the `Stock Operation Processor` rejects quantities above available stock.
- Search/adjustments never invent products; unknown products / SKUs return a clear "Product not found".
- Status auto-updates: `IN_STOCK` / `LOW_STOCK` (`stock ≤ reorder_level`) / `OUT_OF_STOCK` (`stock = 0`).
- All SQL is parameterized — no injection.

## 5. Configuration

- **Live config file**: `frontend/public/app-config.json` (brand, `webhookUrl`, `timeoutMs`, dashboard
  counts, assistant suggestions, quick actions, labels). Read from disk on every request — edit live, no
  rebuild. See `frontend/src/app/api/config/route.ts`.
- **Backups**: the file is small — back it up before editing:
  `Copy-Item frontend\public\app-config.json app-config.bak.json`.

## 6. Testing before/after

- Run the full matrix (16 tests) from `test_cases.md`.
- Production build: `cd frontend && npm run build` (all routes + API compile, types green).
- Browser check: open each page in Edge/Chrome DevTools → Network tab → all 2xx, no console errors.

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Assistant replies with Webhook error | n8n container down → `docker start anomaly-n8n`; workflow inactive → toggle **Active** in n8n UI |
| `Cannot POST /webhook/mobile-inventory` | Workflow not activated on this restart → check `docker logs anomaly-n8n` for "Activated workflow" |
| Dashboard shows "n8n Unavailable" | `webhookUrl` wrong in `app-config.json`/Settings page (restore the working URL `http://localhost:5678/webhook/mobile-inventory`) |
| Slow first reply | Gemini model cold start / network — allow up to `timeoutMs` (90s default) |
| Gemini 404 on model | Model retired — in n8n open `Gemini Chat Model` and pick a current flash model |
| Port 3000 busy | Stop the dev server (`npm run dev`), or change the port (`-p 3001`) |

## 8. Legacy static demo

`index.html` + `app.js` + `styles.css` served by `server.js` (port 8080) is the earlier HTML/CSS prototype
and remains for reference only. The Next.js app on :3000 is the primary deliverable.