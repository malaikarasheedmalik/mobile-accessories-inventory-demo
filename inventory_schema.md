# Mobile Accessories Inventory — Data Schema

## Storage

This workflow uses **PostgreSQL** as its storage backend via the n8n Postgres node (`n8n-nodes-base.postgres`, typeVersion 2.3).

**Why Postgres over SQLite or Airtable?**
- **SQLite**: In n8n Cloud, the file system is ephemeral — data does not persist across workflow deployments. Unsuitable for production inventory.
- **Airtable**: Works well but its filter/formula syntax adds unnecessary complexity for this use-case. Postgres gives full SQL control with zero syntax surprises.
- **Postgres**: Free tiers are available from Neon and Supabase. The n8n Postgres node's `executeQuery` operation with `$1,$2...` parameter binding is well-documented and stable across node versions.

### Current development database

The live system runs inside a Docker container:

- Host `localhost:5432`, database `anomaly_radar`, user `anomaly`
- Query it with: `docker exec -i anomaly-postgres psql -U anomaly -d anomaly_radar`

```sql
SELECT sku, product_name, current_stock, selling_price, status FROM products ORDER BY sku;
```

## Table: products

```sql
CREATE TABLE IF NOT EXISTS products (
    sku            TEXT PRIMARY KEY,
    product_name   TEXT NOT NULL,
    category       TEXT NOT NULL DEFAULT 'Other',
    brand          TEXT DEFAULT '',
    compatibility  TEXT DEFAULT '',
    color          TEXT DEFAULT '',
    cost_price     NUMERIC(12,2) DEFAULT 0,
    selling_price  NUMERIC(12,2) DEFAULT 0,
    current_stock  INTEGER DEFAULT 0,
    reorder_level  INTEGER DEFAULT 5,
    supplier       TEXT DEFAULT '',
    location       TEXT DEFAULT '',
    status         TEXT DEFAULT 'IN_STOCK'
                   CHECK (status IN ('IN_STOCK','LOW_STOCK','OUT_OF_STOCK')),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: speed up stock-level queries
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_low    ON products (current_stock, reorder_level);
```

### Column names (snake_case)

| Column | Type | Description |
|---|---|---|
| sku | TEXT (PK) | Stock Keeping Unit, unique identifier |
| product_name | TEXT | Full product name |
| category | TEXT | One of the standard categories below |
| brand | TEXT | Manufacturer brand |
| compatibility | TEXT | Device compatibility (e.g. "iPhone 15") |
| color | TEXT | Product color |
| cost_price | NUMERIC(12,2) | Unit cost in PKR |
| selling_price | NUMERIC(12,2) | Unit selling price in PKR |
| current_stock | INTEGER | Current available quantity |
| reorder_level | INTEGER | Minimum stock before low-stock alert |
| supplier | TEXT | Supplier name |
| location | TEXT | Warehouse / storage location |
| status | TEXT | Computed by stock-change queries |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

### Standard categories

Mobile Covers, Screen Protectors, Chargers, USB Cables, Lightning Cables,
Power Banks, Earbuds, Handsfree, Mobile Holders, Smart Watches,
Memory Cards, OTG, Adapters, Other

---

## Table: transactions

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id                SERIAL PRIMARY KEY,
    transaction_id    TEXT UNIQUE NOT NULL,
    sku               TEXT NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
    product_name      TEXT NOT NULL,
    transaction_type  TEXT NOT NULL CHECK (transaction_type IN ('STOCK_IN','STOCK_OUT','SALE','ADJUSTMENT')),
    quantity          INTEGER NOT NULL,
    previous_stock    INTEGER NOT NULL,
    new_stock         INTEGER NOT NULL,
    unit_price        NUMERIC(12,2) DEFAULT 0,
    total_amount      NUMERIC(12,2) DEFAULT 0,
    supplier_customer TEXT DEFAULT '',
    notes             TEXT DEFAULT '',
    timestamp         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_sku      ON transactions (sku);
CREATE INDEX IF NOT EXISTS idx_txn_type     ON transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_txn_time     ON transactions (timestamp);
```

### Transaction types

| Type | Meaning | Effect on stock |
|---|---|---|
| STOCK_IN | Receiving stock from supplier | Increases |
| STOCK_OUT | Stock removal (non-sale) | Decreases |
| SALE | Product sale | Decreases |
| ADJUSTMENT | Manual count correction | Either |

---

## Sample data

| sku | product_name | category | current_stock | selling_price (PKR) | cost_price (PKR) |
|---|---|---|---|---|---|
| MC-001 | Type-C Fast Charging Cable | USB Cables | 25 | 250 | 150 |
| MC-002 | iPhone 15 Clear Cover | Mobile Covers | 12 | 800 | 500 |
| MC-003 | Samsung A15 Cover | Mobile Covers | 4 | 650 | 350 |
| MC-004 | 20W USB-C Charger | Chargers | 18 | 1500 | 800 |
| MC-005 | 10000mAh Power Bank | Power Banks | 3 | 2500 | 1500 |

### Insert sample data

Run the following SQL in your Postgres database after creating the tables:

```sql
INSERT INTO products (sku, product_name, category, brand, compatibility, color,
                      cost_price, selling_price, current_stock, reorder_level, supplier, status)
VALUES
  ('MC-001', 'Type-C Fast Charging Cable', 'USB Cables',    'Generic',  'Universal',  'Black',   150,  250, 25, 10, 'Shenzhen Tech',  'IN_STOCK'),
  ('MC-002', 'iPhone 15 Clear Cover',      'Mobile Covers', 'Generic',  'iPhone 15',  'Clear',   500,  800, 12,  5, 'Shenzhen Tech',  'IN_STOCK'),
  ('MC-003', 'Samsung A15 Cover',          'Mobile Covers', 'Generic',  'Samsung A15','Black',   350,  650,  4,  5, 'Samsung Parts',  'LOW_STOCK'),
  ('MC-004', '20W USB-C Charger',          'Chargers',      'Generic',  'Universal',  'White',   800, 1500, 18, 10, 'Shenzhen Tech',  'IN_STOCK'),
  ('MC-005', '10000mAh Power Bank',        'Power Banks',   'Generic',  'Universal',  'Black',  1500, 2500,  3,  5, 'Shenzhen Tech',  'LOW_STOCK')
ON CONFLICT (sku) DO NOTHING;
```

### Live data (as of last verification)

Two extra products were added while testing (MC-010, MC-020). Live totals:
**7 products · 145 units · value PKR 99,650 · cost PKR 53,500 · 1 low stock · 0 out of stock.**

| sku | product | category | current_stock | selling_price (PKR) | status |
|---|---|---|---|---|---|
| MC-001 | Type-C Fast Charging Cable | USB Cables | 44 | 250 | IN_STOCK |
| MC-002 | iPhone 15 Clear Cover | Mobile Covers | 8 | 800 | IN_STOCK |
| MC-003 | Samsung A15 Cover | Mobile Covers | 44 | 650 | IN_STOCK |
| MC-004 | 20W USB-C Charger | Chargers | 16 | 1500 | IN_STOCK |
| MC-005 | 10000mAh Power Bank | Power Banks | 1 | 2500 | LOW_STOCK |
| MC-010 | iPhone 15 Pro Cover | Mobile Covers | 17 | 1200 | IN_STOCK |
| MC-020 | USB-C to Lightning Cable | Lightning Cables | 15 | 450 | IN_STOCK |

`transactions` (live): 9 × STOCK_IN (qty 67), 5 × STOCK_OUT (qty 13), 5 × SALE (qty 6).

> Note: stock changes through test commands (`Stock in`, `Sell`, `Stock out`) are real DB mutations as
> required — the workflow never simulates values.
