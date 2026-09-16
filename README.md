# Mobile Accessories Inventory System

An AI-powered **Mobile Accessories Inventory System** with a rich **Next.js + TypeScript + Tailwind** web app
frontend and a full **n8n AI workflow** (Gemini) backed by **PostgreSQL** in Docker.

You can chat in natural language — *"Sell 3 iPhone 15 covers"*, *"Show low stock products"*,
*"What is the total inventory value?"* — and the AI agent routes the request to the correct inventory
operation against the database. No data is ever invented: every KPI, chart, and product line on the
dashboard comes from the live workflow response.

---

## Architecture

```
Browser (Next.js + TypeScript + Tailwind, port 3000)
        │  POST /api/chat   { message }
        ▼
Next.js Route Handler  /api/chat  (normalizes message, safe fetch, guaranteed JSON contract)
        │  POST http://localhost:5678/webhook/mobile-inventory   { chatInput }
        ▼
n8n workflow "Mobile Accessories Inventory System"  (ACTIVE)
   Chat Input (Webhook)
        ↓
   Inventory AI Agent (Gemini Chat Model)     ← Google Gemini credential (type googlePalmApi)
        ↓
   Extract Intent (Code)                       ← parses AI output into operation + parameters
        ↓  (fan-out)
   Route Search │ Route Add │ Route Stock In │ Route Stock Out │ Route Report │ Route Low Stock
        ↓            ↓              ↓                ↓               ↓               ↓
   Search DB │ Add DB │ Get Product Stock DB │ Get Product Stock DB │ Get All Products │ Get Low Stock
        ↓            ↓              ↓                ↓                    ↓                   ↓
   Stock Operation Processor (validate, compute, prevent negative) ──> Stock Check (IF)
        ↓            ↓              ↓                ↓                    (error → Response)
   Update Stock DB │ Create Transaction DB
        ↓
   Response Formatter (always returns non-empty text)
        ↓
   Chat Response (Webhook Response)  →  {"response": "…", "type": "…", "data": […]}
        ▼
Next.js normalizes into  { success, message, data, error, meta }
        ▼
Dashboard / Inventory / Products / Transactions / Reports / Assistant / Settings
```

### n8n canvas sections (left → right)

**INPUT / CHAT → AI INVENTORY ASSISTANT → PRODUCT MANAGEMENT (Search / Add) →
STOCK IN / STOCK OUT → LOW STOCK → REPORTS → RESPONSE** with clearly named nodes
(Chat Input, Gemini Chat Model, Inventory AI Agent, Route *, * DB, Stock Operation Processor,
Stock Check, Response Formatter, Chat Response).

---

## Repository layout

| Path | Purpose |
|---|---|
| `frontend/` | Next.js + TypeScript + Tailwind v4 web app (primary deliverable) |
| `frontend/public/app-config.json` | **Live-editable JSON config** (brand, webhook URL, suggestions, quick actions, settings) |
| `n8n_mobile_inventory_workflow.json` | The n8n workflow source of truth (matches the active published version) |
| `inventory_schema.md` | PostgreSQL schema, DDL, sample data |
| `test_cases.md` | Test matrix (16 tests) and results |
| `FINAL_REPORT.md` | Final client report (verified live state, tests, honest findings) |
| `N8N_CLIENT_DEMO_SETUP.md` | Full client demo setup guide (deployment, testing, troubleshooting) |
| `index.html` / `app.js` / `styles.css` / `server.js` | Legacy static demo (see note below) |

---

## Prerequisites

- Node.js 18+ (built against Node 24)
- Docker with the `anomaly-n8n` (n8n on :5678) and `anomaly-postgres` (:5432) containers
- n8n credentials: **Google Gemini API** (`googlePalmApi`) and **Postgres**

## Run the frontend (development)

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

Production build:

```bash
cd frontend
npm run build
npm run start      # or deploy ./frontend as a standard Next.js app
```

> Legacy static demo (optional): `node "F:\mobile inventory system\server.js"` → http://localhost:8080.
> It served the earlier HTML/CSS/JS prototype and is kept for reference only.

## Run / verify the workflow in n8n

1. Open http://localhost:5678 → Workflows → **Mobile Accessories Inventory System** (ID `GokO8WzcHnMvQGyh`).
2. Confirm the toggle is **Active**. Active published version `e8deaff9-…` (versionCounter 137).
3. Quick smoke test in n8n: **Execute workflow** on `Chat Input` with `{"chatInput": "Show all products"}`,
   or from your shell:

```bash
curl -X POST http://localhost:5678/webhook/mobile-inventory \
  -H "Content-Type: application/json" \
  -d '{"chatInput": "Show low stock products"}'
```

The webhook always returns valid JSON with **both** a legacy text `response` (parsed by the frontend)
and structured fields (`success`, `operation`, `type`, `report_type`, `message`, `data`, `alerts`):

```json
{
  "success": true,
  "operation": "report",
  "type": "transactions",
  "report_type": "transactions",
  "message": "19 recent transaction(s) found.",
  "data": [ ... ],
  "response": "RECENT TRANSACTIONS\nTXN-... | SALE | ..."
}
```

### How the frontend talks to n8n

`frontend/src/app/api/chat/route.ts` is the only bridge to n8n. It:

1. Normalizes the user message (`trim`, collapse whitespace).
2. Calls the webhook URL from `public/app-config.json` with a safety timeout.
3. **Always** returns the guaranteed contract below — never a raw n8n string, never an empty body.

```ts
interface ApiChatResponse {
  success: boolean;
  message: string;      // human-readable summary / formatted reply
  data: Product[] | Report | Transaction | null;
  error: string | null; // EMPTY_MESSAGE | N8N_UNAVAILABLE | N8N_HTTP | N8N_ERROR | EMPTY_RESPONSE | INVENTORY_REQUEST_FAILED | null
  meta: { text: string; cls: string }; // raw text + client CSS class
}
```

## Live-editable JSON config

`frontend/public/app-config.json` is read **from disk on every request**, so you can change it live
without rebuilding or restarting the app:

```jsonc
{
  "brand": { "name": "Mobile Inventory", "sub": "Mobile Accessories Inventory System", "tagline": "..." },
  "api": { "webhookUrl": "http://localhost:5678/webhook/mobile-inventory", "timeoutMs": 90000 },
  "dashboard": { "recentProductCount": 6, "lowStockCount": 6 },
  "assistant": { "title": "Inventory AI", "badges": ["Gemini AI", "n8n"], "suggestions": [...] },
  "quickActions": [ { "label": "Low Stock", "command": "Show low stock products" }, ... ],
  "settings": { "showWebhookEditor": true, "connectionLabel": { ... } }
}
```

You can also edit the webhook URL from the running app at **http://localhost:3000/settings**
(`POST /api/config`), which writes the file back to disk.

## Example chat commands

| Command | Result |
|---|---|
| `Show all products` | Lists every product |
| `Search iPhone 15 cover` | Matches by name/brand/category (3 products) |
| `Find product SKU MC-001` | Matches by SKU |
| `Add a new product, Samsung A25 cover, Category Mobile Covers, price 700, stock 10` | Upserts the product |
| `Stock in 20 Type C cables` | Increases stock, records STOCK_IN |
| `Sell 3 iPhone 15 covers` | Decreases stock, records SALE |
| `Stock out 5 chargers` | Decreases stock, records STOCK_OUT |
| `How many chargers are available?` | Product search with stock count |
| `Show low stock products` | `current_stock <= reorder_level`, adds `suggested_reorder_qty` |
| `Which products are out of stock?` | `current_stock = 0` |
| `What is the total inventory value?` | Inventory summary report (adds `potential_gross_margin`) |
| `Show recent sales` | Last 20 `transactions` rows (SALE) |
| `Show recent transactions` | Last 20 `transactions` rows (all types) |
| `Show stock movement history` | Last 20 `transactions` rows (all types) |

## Rules enforced by the workflow

- Products are never invented — the stock path searches the DB first and returns an ERROR if nothing matches.
- Negative stock is prevented — `Stock Operation Processor` rejects `Only N units available` before any write.
- Every stock change writes a `transactions` row (`Create Transaction DB`).
- `Sell` records `SALE`; `Stock out` records `STOCK_OUT`; `Stock in` records `STOCK_IN`.
- Transaction IDs use the format `TXN-YYYYMMDD-XXXXXX` (e.g. `TXN-20260916-A3F9B2`).
- `Extract Intent` sets `report_type` (`inventory`/`transactions`/`low_stock`/`none`) so a history/report request
  is **never** misinterpreted as a stock mutation (`Report Type Router`).
- Reporting commands that every instance responds to deterministically: stock movements, sales history,
  transaction log, low-stock, inventory summary.
- `Response Formatter` returns structured JSON (`type`, `report_type`, `data`, `alerts`) **and** keeps the
  `response` text contract (e.g. `RECENT TRANSACTIONS`, `LOW STOCK REPORT`) the frontend parsers rely on.
- Every response is `SUCCESS` / `ERROR:` / `INVENTORY SUMMARY` / `PRODUCTS (N)` / `RECENT TRANSACTIONS` /
  `LOW STOCK REPORT` — no plain-text or JSON-dump leaks to the chat.
- Status auto-updates to `LOW_STOCK` / `OUT_OF_STOCK` / `IN_STOCK` in the UPDATE SQL.
- Prices only change through the Add/Update (upsert) path, never silently.
- All SQL is parameterized (`$1, $2, ...` + `options.queryReplacement`) — no SQL injection.
- A search with no filters at all returns every product (`Show all products`).

## Current live data (PostgreSQL)

| sku | product | category | stock | price (PKR) | status |
|---|---|---|---|---|---|
| MC-001 | Type-C Fast Charging Cable | USB Cables | 44 | 250 | IN_STOCK |
| MC-002 | iPhone 15 Clear Cover | Mobile Covers | 8 | 800 | IN_STOCK |
| MC-003 | Samsung A15 Cover | Mobile Covers | 44 | 650 | IN_STOCK |
| MC-004 | 20W USB-C Charger | Chargers | 16 | 1500 | IN_STOCK |
| MC-005 | 10000mAh Power Bank | Power Banks | 10 | 2500 | IN_STOCK |
| MC-010 | iPhone 15 Pro Cover | Mobile Covers | 17 | 1200 | IN_STOCK |
| MC-020 | USB-C to Lightning Cable | Lightning Cables | 15 | 450 | IN_STOCK |

Totals: **7 products · 154 units · Inventory value PKR 122,150 (cost PKR 67,000 · margin 55,150) · 0 low stock · 0 out of stock**.
`transactions`: 11 × STOCK_IN (qty 77), 5 × STOCK_OUT (qty 13), 6 × SALE (qty 7).

## Testing

See `test_cases.md` for the full 16-test matrix (empty body, search, low stock, out of stock,
sales, invalid quantity, insufficient stock, unknown product, reports, n8n-unavailable, and the
headless-browser UI checks). See `N8N_CLIENT_DEMO_SETUP.md` for a client-ready demo walkthrough.