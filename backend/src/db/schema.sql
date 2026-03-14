-- ============================================================
-- CoreInventory — PostgreSQL Schema
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone_number  VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'inventory_manager',
  organization  VARCHAR(120) NOT NULL DEFAULT 'Main Inventory',
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id    UUID PRIMARY KEY,
  name  VARCHAR(150) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30)
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id        UUID PRIMARY KEY,
  name      VARCHAR(120) NOT NULL,
  address   TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Locations (zones / racks inside a warehouse)
CREATE TABLE IF NOT EXISTS locations (
  id           UUID PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name         VARCHAR(120) NOT NULL,
  zone         VARCHAR(60)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  sku             VARCHAR(60)  NOT NULL UNIQUE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'units',
  reorder_point   INT NOT NULL DEFAULT 10,
  reorder_qty     INT NOT NULL DEFAULT 50,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock levels (quantity of a product at a specific location)
CREATE TABLE IF NOT EXISTS stock_levels (
  id          UUID PRIMARY KEY,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- ============================================================
-- Operations: Receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
  id           UUID PRIMARY KEY,
  reference    VARCHAR(30)  NOT NULL UNIQUE,
  supplier_id  UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  status       VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS receipt_lines (
  id           UUID PRIMARY KEY,
  receipt_id   UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id),
  expected_qty INT NOT NULL DEFAULT 0,
  received_qty INT NOT NULL DEFAULT 0
);

-- ============================================================
-- Operations: Delivery Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_orders (
  id            UUID PRIMARY KEY,
  reference     VARCHAR(30)  NOT NULL UNIQUE,
  customer_name VARCHAR(200),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS delivery_lines (
  id          UUID PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  qty         INT NOT NULL DEFAULT 0
);

-- ============================================================
-- Operations: Internal Transfers
-- ============================================================
CREATE TABLE IF NOT EXISTS internal_transfers (
  id              UUID PRIMARY KEY,
  reference       VARCHAR(30) NOT NULL UNIQUE,
  from_location   UUID NOT NULL REFERENCES locations(id),
  to_location     UUID NOT NULL REFERENCES locations(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_lines (
  id          UUID PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES internal_transfers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  qty         INT NOT NULL DEFAULT 0
);

-- ============================================================
-- Operations: Stock Adjustments
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id          UUID PRIMARY KEY,
  reference   VARCHAR(30)  NOT NULL UNIQUE,
  location_id UUID NOT NULL REFERENCES locations(id),
  reason      TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adjustment_lines (
  id            UUID PRIMARY KEY,
  adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  counted_qty   INT NOT NULL DEFAULT 0,
  system_qty    INT NOT NULL DEFAULT 0,
  difference    INT NOT NULL DEFAULT 0
);

-- ============================================================
-- Audit: Stock Ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_ledger (
  id          UUID PRIMARY KEY,
  product_id  UUID NOT NULL REFERENCES products(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  txn_type    VARCHAR(30)  NOT NULL,
  txn_ref     VARCHAR(30)  NOT NULL,
  qty_change  INT NOT NULL,
  qty_after   INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Password Reset OTPs
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  otp        VARCHAR(10)  NOT NULL,
  verified   BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_location ON stock_levels(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created ON stock_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_status ON internal_transfers(status);
