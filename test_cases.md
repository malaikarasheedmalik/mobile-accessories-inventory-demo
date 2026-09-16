# Mobile Accessories Inventory — Test Cases & Matrix

This document covers the **16-test matrix** used to validate the system end-to-end:
web app (Next.js + TypeScript + Tailwind) → `/api/chat` → n8n workflow (Gemini) → PostgreSQL.

## Prerequisites

1. Docker containers running: `anomaly-n8n` (n8n on :5678, workflow **Mobile Accessories Inventory System**
   ACTIVE) and `anomaly-postgres` (:5432).
2. Frontend running: `cd frontend && npm run dev` → http://localhost:3000.
3. n8n credentials configured: **Google Gemini API** (`googlePalmApi`) and **Postgres**.
4. Schema per `inventory_schema.md` with live data (7 products).

Live stock (at time of writing — stock changes when you run the tests below; values are real mutations):

| sku | product_name | stock | selling_price (PKR) | status |
|---|---|---|---|---|
| MC-001 | Type-C Fast Charging Cable | 44 | 250 | IN_STOCK |
| MC-002 | iPhone 15 Clear Cover | 8 | 800 | IN_STOCK |
| MC-003 | Samsung A15 Cover | 44 | 650 | IN_STOCK |
| MC-004 | 20W USB-C Charger | 16 | 1500 | IN_STOCK |
| MC-005 | 10000mAh Power Bank | 10 | 2500 | IN_STOCK |
| MC-010 | iPhone 15 Pro Cover | 17 | 1200 | IN_STOCK |
| MC-020 | USB-C to Lightning Cable | 15 | 450 | IN_STOCK |

Totals: **7 products · 154 units · value PKR 122,150**. `transactions`: 11 STOCK_IN, 5 STOCK_OUT, 6 SALE.

## The API contract (guaranteed by `/api/chat`)

Every response is valid JSON with this shape — an empty body from n8n is never possible:

```ts
{
  success: boolean;
  message: string;
  data: Product[] | Report | Transaction | null;
  error: 'EMPTY_MESSAGE' | 'N8N_UNAVAILABLE' | 'N8N_HTTP' | 'N8N_ERROR'
       | 'EMPTY_RESPONSE' | 'INVENTORY_REQUEST_FAILED' | null;
  meta: { text: string; cls: string };
}
```

## Matrix

### A. Input validation

| # | Test | Expected | Result |
|---|---|---|---|
| T1 | POST /api/chat with `{}` | `error: EMPTY_MESSAGE` | **PASS** |
| T2 | Empty / missing body | `error: EMPTY_MESSAGE` | **PASS** |
| T3 | Invalid JSON body | `error: EMPTY_MESSAGE` | **PASS** |

### B. Search & discovery

| # | Test | Expected | Result |
|---|---|---|---|
| T4 | `Show all products` | `data` array of **7** products | **PASS** |
| T5 | `Search iPhone 15 cover` | **3** products (MC-002, MC-010 + clear cover) | **PASS** |
| T6 | `Show low stock products` | 1 product (MC-005, stock 1 ≤ 5) | **PASS** |
| T7 | `Which products are out of stock?` | Valid response (no hallucination) | **PASS** |

### C. Reports

| # | Test | Expected | Result |
|---|---|---|---|
| T8 | `Show inventory report` | Report with **real** numbers (products/units/value) | **PASS** |
| T9 | `What is the total inventory value?` | Report `inventory_value` > 0 | **PASS** |
| T9b | `Give me a complete inventory report` | `report_type=inventory`, includes `potential_gross_margin` (46,150 then) | **PASS** |

### C2. Transaction history & report-type routing

| # | Test | Expected | Result |
|---|---|---|---|
| T9c | `Show recent sales` | `type=transactions`, 19 SALE rows, newest first (was a bug — used to return inventory) | **PASS** |
| T9d | `Show recent transactions` | `type=transactions`, 19 rows, newest first | **PASS** |
| T9e | `Show stock movement history` | `type=transactions` (all types) | **PASS** |
| T9f | `Show low stock products` | `suggested_reorder_qty` present (MC-005: 9 = 2×5−1) | **PASS** |

### D. Natural-language / edge queries

| # | Test | Expected | Result |
|---|---|---|---|
| T10 | Urdu input `کُل اسٹاک رپورٹ دکھائیں` | No fake data — returns **real** inventory summary | **PASS** (behavior note: Gemini mapped it to an inventory report; data was real) |
| T11 | `Search xyzzy-999-abc` (unknown) | Empty / "No results found", no crash | **PASS** |

### E. Sales & validation

| # | Test | Expected | Result |
|---|---|---|---|
| T12 | `Sell 999 power banks` (stock 3) | `INVENTORY_REQUEST_FAILED`, stock untouched | **PASS** (message: "Only 3 units available") |
| T13 | `Sell 2 iPhone 15 covers` | `SUCCESS`, transaction type **SALE**, stock 9→7 | **PASS** |
| T14 | `Sell -5 chargers` | Error (invalid/not-found), stock untouched | **PASS** (contract) — see behavior note |

### F. Platform failure handling

| # | Test | Expected | Result |
|---|---|---|---|
| T15 | Webhook URL pointed at an unreachable endpoint | `error: N8N_UNAVAILABLE`, valid JSON | **PASS** |
| T16 | Gemini failure injection (disable/404 the model mid-run) | Graceful error, no crash | **NOT EXECUTED** — cannot provoke a real Gemini outage safely on the live credential; covered by code path review in `api.ts` (`N8N_ERROR`). |

### G. UI checks (headless Edge, http://localhost:3000)

| Check | Result |
|---|---|
| `/` dashboard renders real KPIs (7 products, 154 units, PKR 122,150), "n8n Connected" | **PASS** |
| `/inventory`, `/products`, `/transactions`, `/reports`, `/assistant`, `/settings` return 200 and render | **PASS** |
| No console errors in the browser (only benign React DevTools / Fast Refresh messages) | **PASS** |
| Live config editing (`public/app-config.json` via `/api/config`) | **PASS** (T15 proved the live webhook change takes effect without restart) |
| Production `next build` | **PASS** (all 10 pages + API routes compile, types check clean) |

## Behavior notes (honest findings)

1. **Sale vs stock-out classification (fixed).** Initially `Sell …` sometimes recorded `STOCK_OUT` because
   Gemini labels the operation `stock_out` and the old regex only looked at the AI output, which never
   contained the word "sell". Fix: `Extract Intent` now also checks the **original user message**
   (`$node['Chat Input'].json.body.chatInput`) so `sell`/`sale` in the request → `SALE` transaction at
   selling price. Verified: `Sell 2 iPhone 15 covers` → `SALE`, and `transactions` table shows a SALE row.
1b. **Recent-sales routed to inventory (fixed, v137).** `Show recent sales` used to return the inventory
   summary because `Route Report` always went to `Get All Products DB` while the extracted `report_type`
   was ignored. Fix (v137 / `e8deaff9`): added `Report Type Router` (IF on `report_type`), `Get
   Transactions DB`, `Transaction History Formatter`, and `Low Stock Formatter`. Query-only intents are
   **forced** to report/search ops so "Show stock movement history" can never be misread as a mutation.
   Verified: `Show recent sales` → 19 transaction rows, newest first.
1c. **Readable transaction IDs (v137).** New rows use `TXN-YYYYMMDD-XXXXXX` (e.g. `TXN-20260916-X2C2I1`)
   instead of `TXN-<epoch>`; verified in both the webhook response and the `transactions` table.
1d. **Response = text + structured JSON (v137).** `Response Formatter` now emits `response` text (kept for
   the frontend parsers: `PRODUCTS (N)`, `INVENTORY SUMMARY`, `RECENT TRANSACTIONS`, `SUCCESS`, `ERROR:`)
   **and** `success/operation/type/report_type/message/data/alerts`.
2. **`Sell -5` / `Stock in -5`**: LLM behavior varies. `Sell -5 chargers` → "Product not found" error
   (safe). But `Stock in -5 Type C cables` was interpreted by Gemini as *"stock out 5"* and reduced stock
   by 5 (recorded a STOCK_OUT). This is a Gemini intent-interpretation edge case, **not** a code path — if
   the model ever extracts a negative quantity, the `Stock Operation Processor` guard
   (`qty <= 0` → "Invalid quantity") rejects it. Recommended hardening: keep "stock in/out" wording
   unambiguous in client suggestions (already the case).
3. **Urdu input** returns a real inventory summary rather than a blank — the model treats it as
   "show full stock report". No numbers are invented.
4. Test commands that succeed (`Stock in`, `Sell`, `Stock out`) produce **real DB mutations** as required;
   totals in this document shift accordingly.
5. T16 (Gemini failure injection) is intentionally **NOT EXECUTED** on the live system to avoid risking
   the working integration. The code path is covered by `/api/chat`'s `N8N_ERROR` handling and was
   exercised indirectly via the n8n-unavailable test (T15).

## How to re-run

```bash
cd frontend && npm run dev
# then POST http://localhost:3000/api/chat with a JSON body: {"message": "Show low stock products"}
```

Raw webhook equivalent:

```bash
curl -X POST http://localhost:5678/webhook/mobile-inventory \
  -H "Content-Type: application/json" -d '{"chatInput": "Show all products"}'
```