/**
 * CoreInventory — Synthetic Data Seed Script
 *
 * Creates realistic demo data: users, categories, warehouses, locations,
 * suppliers, products, receipts, deliveries, transfers, adjustments,
 * stock levels, and stock ledger entries.
 *
 * Usage: cd backend && node src/db/seed.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./pool');

// ── Helper ──────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
let refCounter = 0;
function ref(prefix) { refCounter++; return `${prefix}-${Date.now().toString(36).toUpperCase()}${String(refCounter).padStart(4, '0')}`; }
function pastDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(1, daysBack));
  d.setHours(randInt(6, 20), randInt(0, 59));
  return d.toISOString();
}

async function seed() {
  console.log('🗄️  Running schema migration first...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
  console.log('✅ Schema ready.\n');

  // ── Clean existing data ────────────────────────────────
  console.log('🧹 Clearing existing data...');
  await pool.query(`
    TRUNCATE stock_ledger, adjustment_lines, stock_adjustments,
             transfer_lines, internal_transfers,
             delivery_lines, delivery_orders,
             receipt_lines, receipts,
             stock_levels, products, locations, warehouses,
             suppliers, categories, password_resets, users
    CASCADE
  `);

  // ══════════════════════════════════════════════════════════
  // 1. USERS
  // ══════════════════════════════════════════════════════════
  console.log('👤 Seeding users...');
  const passwordHash = await bcrypt.hash('Test@1234', 10);

  const users = [
    { id: uuidv4(), full_name: 'Admin User',     email: 'admin@coreinventory.com',    phone_number: '+91-9876543210', role: 'inventory_manager', organization: 'CoreInventory HQ' },
    { id: uuidv4(), full_name: 'Priya Sharma',   email: 'priya@coreinventory.com',    phone_number: '+91-9876543211', role: 'inventory_manager', organization: 'CoreInventory HQ' },
    { id: uuidv4(), full_name: 'Rahul Patel',    email: 'rahul@coreinventory.com',    phone_number: '+91-9876543212', role: 'warehouse_staff',   organization: 'CoreInventory HQ' },
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, full_name, email, phone_number, password_hash, role, organization)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [u.id, u.full_name, u.email, u.phone_number, passwordHash, u.role, u.organization]
    );
  }

  // ══════════════════════════════════════════════════════════
  // 2. CATEGORIES
  // ══════════════════════════════════════════════════════════
  console.log('📂 Seeding categories...');
  const categories = [
    { id: uuidv4(), name: 'Raw Materials',    description: 'Steel, wood, plastic and other raw inputs' },
    { id: uuidv4(), name: 'Finished Goods',   description: 'Market-ready products' },
    { id: uuidv4(), name: 'Packaging',        description: 'Cartons, wraps, labels' },
    { id: uuidv4(), name: 'Spare Parts',      description: 'Machine and equipment spare parts' },
    { id: uuidv4(), name: 'Office Supplies',  description: 'Paper, pens, toner etc.' },
  ];

  for (const c of categories) {
    await pool.query('INSERT INTO categories (id, name, description) VALUES ($1, $2, $3)', [c.id, c.name, c.description]);
  }

  // ══════════════════════════════════════════════════════════
  // 3. SUPPLIERS
  // ══════════════════════════════════════════════════════════
  console.log('🏭 Seeding suppliers...');
  const suppliers = [
    { id: uuidv4(), name: 'Tata Steel Ltd',           email: 'orders@tatasteel.in',     phone: '+91-22-66658282' },
    { id: uuidv4(), name: 'Ambuja Cements',            email: 'supply@ambujacements.com', phone: '+91-11-25559000' },
    { id: uuidv4(), name: 'Asian Paints Supply',       email: 'bulk@asianpaints.com',     phone: '+91-22-39818000' },
    { id: uuidv4(), name: 'Godrej Packaging Solutions', email: 'packaging@godrej.com',     phone: '+91-22-25185000' },
    { id: uuidv4(), name: 'Office Mart India',          email: 'sales@officemart.in',      phone: '+91-80-41234567' },
  ];

  for (const s of suppliers) {
    await pool.query('INSERT INTO suppliers (id, name, email, phone) VALUES ($1, $2, $3, $4)', [s.id, s.name, s.email, s.phone]);
  }

  // ══════════════════════════════════════════════════════════
  // 4. WAREHOUSES & LOCATIONS
  // ══════════════════════════════════════════════════════════
  console.log('🏢 Seeding warehouses & locations...');
  const warehouses = [
    { id: uuidv4(), name: 'Main Warehouse',       address: 'Plot 12, GIDC, Ahmedabad, Gujarat' },
    { id: uuidv4(), name: 'North Warehouse',       address: 'Sector 62, Noida, Uttar Pradesh' },
    { id: uuidv4(), name: 'South Distribution Hub', address: 'Whitefield, Bengaluru, Karnataka' },
    { id: uuidv4(), name: 'West Logistics Center',  address: 'Bhiwandi, Thane, Maharashtra' },
  ];

  for (const w of warehouses) {
    await pool.query('INSERT INTO warehouses (id, name, address) VALUES ($1, $2, $3)', [w.id, w.name, w.address]);
  }

  const locationDefs = [
    { zone: 'Receiving', names: ['Receiving Dock A', 'Receiving Dock B'] },
    { zone: 'Storage',   names: ['Rack A', 'Rack B', 'Rack C'] },
    { zone: 'Production', names: ['Production Floor'] },
    { zone: 'Shipping',  names: ['Shipping Bay 1', 'Shipping Bay 2'] },
    { zone: 'Quality',   names: ['QC Zone'] },
  ];

  const locations = [];
  for (const wh of warehouses) {
    for (const def of locationDefs) {
      for (const name of def.names) {
        const loc = { id: uuidv4(), warehouse_id: wh.id, name: `${name}`, zone: def.zone };
        locations.push(loc);
        await pool.query('INSERT INTO locations (id, warehouse_id, name, zone) VALUES ($1, $2, $3, $4)', [loc.id, loc.warehouse_id, loc.name, loc.zone]);
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // 5. PRODUCTS (50 products)
  // ══════════════════════════════════════════════════════════
  console.log('📦 Seeding 50 products...');
  const productTemplates = [
    // Raw Materials
    { name: 'Steel Rod 12mm',     sku: 'RM-STL-001', cat: 0, uom: 'kg',    rp: 100, rq: 500 },
    { name: 'Steel Rod 8mm',      sku: 'RM-STL-002', cat: 0, uom: 'kg',    rp: 80,  rq: 400 },
    { name: 'Steel Plate 5mm',    sku: 'RM-STL-003', cat: 0, uom: 'kg',    rp: 50,  rq: 200 },
    { name: 'Copper Wire 2mm',    sku: 'RM-COP-001', cat: 0, uom: 'meters',rp: 200, rq: 1000 },
    { name: 'Aluminium Sheet',    sku: 'RM-ALU-001', cat: 0, uom: 'kg',    rp: 60,  rq: 300 },
    { name: 'Plastic Granules',   sku: 'RM-PLS-001', cat: 0, uom: 'kg',    rp: 150, rq: 500 },
    { name: 'Rubber Compound',    sku: 'RM-RUB-001', cat: 0, uom: 'kg',    rp: 40,  rq: 200 },
    { name: 'Wood Plank Teak',    sku: 'RM-WOD-001', cat: 0, uom: 'pieces',rp: 30,  rq: 100 },
    { name: 'Glass Sheet 4mm',    sku: 'RM-GLS-001', cat: 0, uom: 'pieces',rp: 20,  rq: 80 },
    { name: 'Cement Portland 50kg', sku: 'RM-CEM-001', cat: 0, uom: 'bags', rp: 50, rq: 200 },
    // Finished Goods
    { name: 'Office Chair Ergonomic', sku: 'FG-CHR-001', cat: 1, uom: 'units', rp: 15, rq: 50 },
    { name: 'Office Chair Standard',  sku: 'FG-CHR-002', cat: 1, uom: 'units', rp: 20, rq: 60 },
    { name: 'Steel Table 4x2',       sku: 'FG-TBL-001', cat: 1, uom: 'units', rp: 10, rq: 30 },
    { name: 'Wooden Desk Executive',  sku: 'FG-DSK-001', cat: 1, uom: 'units', rp: 8,  rq: 20 },
    { name: 'Metal Shelf Rack',       sku: 'FG-SHF-001', cat: 1, uom: 'units', rp: 12, rq: 40 },
    { name: 'Filing Cabinet 3-drawer', sku: 'FG-CAB-001', cat: 1, uom: 'units', rp: 10, rq: 25 },
    { name: 'Bookshelf Wall-mount',   sku: 'FG-BSH-001', cat: 1, uom: 'units', rp: 8,  rq: 30 },
    { name: 'Conference Table 8-seat', sku: 'FG-CNF-001', cat: 1, uom: 'units', rp: 3,  rq: 10 },
    { name: 'Standing Desk Motorized', sku: 'FG-STD-001', cat: 1, uom: 'units', rp: 5,  rq: 15 },
    { name: 'Reception Counter',      sku: 'FG-RCP-001', cat: 1, uom: 'units', rp: 2,  rq: 5 },
    // Packaging
    { name: 'Cardboard Box Large',     sku: 'PK-BOX-001', cat: 2, uom: 'units', rp: 200, rq: 1000 },
    { name: 'Cardboard Box Medium',    sku: 'PK-BOX-002', cat: 2, uom: 'units', rp: 300, rq: 1500 },
    { name: 'Cardboard Box Small',     sku: 'PK-BOX-003', cat: 2, uom: 'units', rp: 400, rq: 2000 },
    { name: 'Bubble Wrap Roll',        sku: 'PK-BWR-001', cat: 2, uom: 'rolls',rp: 50,  rq: 200 },
    { name: 'Stretch Film Roll',       sku: 'PK-SFR-001', cat: 2, uom: 'rolls',rp: 40,  rq: 150 },
    { name: 'Shipping Label A4',       sku: 'PK-LBL-001', cat: 2, uom: 'packs',rp: 100, rq: 500 },
    { name: 'Packing Tape Brown',      sku: 'PK-TPE-001', cat: 2, uom: 'rolls',rp: 80,  rq: 300 },
    { name: 'Foam Insert Custom',      sku: 'PK-FOM-001', cat: 2, uom: 'units', rp: 60,  rq: 200 },
    { name: 'Pallet Wrap Clear',       sku: 'PK-PLW-001', cat: 2, uom: 'rolls',rp: 30,  rq: 100 },
    { name: 'Corrugated Sheet',        sku: 'PK-CRS-001', cat: 2, uom: 'units', rp: 150, rq: 600 },
    // Spare Parts
    { name: 'Bearing SKF 6205',        sku: 'SP-BRG-001', cat: 3, uom: 'units', rp: 20, rq: 50 },
    { name: 'Belt V-Type A68',         sku: 'SP-BLT-001', cat: 3, uom: 'units', rp: 15, rq: 40 },
    { name: 'Motor 5HP 3-Phase',       sku: 'SP-MTR-001', cat: 3, uom: 'units', rp: 3,  rq: 10 },
    { name: 'Gear Assembly Set',       sku: 'SP-GER-001', cat: 3, uom: 'sets',  rp: 5,  rq: 15 },
    { name: 'Hydraulic Cylinder',      sku: 'SP-HYD-001', cat: 3, uom: 'units', rp: 4,  rq: 12 },
    { name: 'O-Ring Set Assorted',     sku: 'SP-ORI-001', cat: 3, uom: 'packs', rp: 25, rq: 80 },
    { name: 'Limit Switch',           sku: 'SP-LSW-001', cat: 3, uom: 'units', rp: 10, rq: 30 },
    { name: 'Contactor 40A',          sku: 'SP-CNT-001', cat: 3, uom: 'units', rp: 8,  rq: 20 },
    { name: 'Filter Cartridge Oil',    sku: 'SP-FLT-001', cat: 3, uom: 'units', rp: 12, rq: 40 },
    { name: 'Coupling Flexible',       sku: 'SP-CPL-001', cat: 3, uom: 'units', rp: 6,  rq: 20 },
    // Office Supplies
    { name: 'A4 Paper Ream',           sku: 'OS-PAP-001', cat: 4, uom: 'reams', rp: 50, rq: 200 },
    { name: 'Ballpoint Pen Box',       sku: 'OS-PEN-001', cat: 4, uom: 'boxes', rp: 20, rq: 80 },
    { name: 'Printer Toner Black',     sku: 'OS-TNR-001', cat: 4, uom: 'units', rp: 10, rq: 30 },
    { name: 'Sticky Notes Pack',       sku: 'OS-STK-001', cat: 4, uom: 'packs', rp: 30, rq: 100 },
    { name: 'File Folder Set',         sku: 'OS-FLD-001', cat: 4, uom: 'sets',  rp: 25, rq: 80 },
    { name: 'Whiteboard Marker Set',   sku: 'OS-WBM-001', cat: 4, uom: 'sets',  rp: 15, rq: 50 },
    { name: 'Stapler Heavy Duty',      sku: 'OS-STP-001', cat: 4, uom: 'units', rp: 10, rq: 30 },
    { name: 'Paper Clip Box',          sku: 'OS-PCL-001', cat: 4, uom: 'boxes', rp: 20, rq: 60 },
    { name: 'Binder Clip Set',         sku: 'OS-BND-001', cat: 4, uom: 'sets',  rp: 15, rq: 50 },
    { name: 'Envelope A4 Brown',       sku: 'OS-ENV-001', cat: 4, uom: 'packs', rp: 40, rq: 150 },
  ];

  const products = [];
  for (const t of productTemplates) {
    const id = uuidv4();
    products.push({ id, ...t });
    await pool.query(
      `INSERT INTO products (id, name, sku, category_id, unit_of_measure, reorder_point, reorder_qty, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, t.name, t.sku, categories[t.cat].id, t.uom, t.rp, t.rq, pastDate(60)]
    );
  }

  // ══════════════════════════════════════════════════════════
  // 6. INITIAL STOCK LEVELS + RECEIPTS (20 receipts)
  // ══════════════════════════════════════════════════════════
  console.log('📥 Seeding 20 receipts & initial stock...');

  // Helper to get storage locations for each warehouse
  const storageLocs = {};
  for (const wh of warehouses) {
    storageLocs[wh.id] = locations.filter(l => l.warehouse_id === wh.id && l.zone === 'Storage');
  }

  // Track stock levels in memory for ledger accuracy
  const stockMap = {}; // key: `${productId}_${locationId}` => quantity

  function getStock(pid, lid) { return stockMap[`${pid}_${lid}`] || 0; }
  function setStock(pid, lid, qty) { stockMap[`${pid}_${lid}`] = qty; }

  for (let i = 0; i < 20; i++) {
    const wh = warehouses[i % warehouses.length];
    const supplier = pick(suppliers);
    const user = pick(users);
    const receiptId = uuidv4();
    const reference = ref('REC');
    const createdAt = pastDate(30);

    await pool.query(
      `INSERT INTO receipts (id, reference, supplier_id, warehouse_id, status, created_by, created_at, validated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [receiptId, reference, supplier.id, wh.id, 'done', user.id, createdAt, createdAt]
    );

    // Pick 2-5 random products for this receipt
    const lineCount = randInt(2, 5);
    const used = new Set();
    for (let j = 0; j < lineCount; j++) {
      let product;
      do { product = pick(products); } while (used.has(product.id));
      used.add(product.id);

      const qty = randInt(20, 200);
      const loc = pick(storageLocs[wh.id]);

      await pool.query(
        `INSERT INTO receipt_lines (id, receipt_id, product_id, expected_qty, received_qty)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), receiptId, product.id, qty, qty]
      );

      // Update stock
      const prevQty = getStock(product.id, loc.id);
      const newQty = prevQty + qty;
      setStock(product.id, loc.id, newQty);

      await pool.query(
        `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = stock_levels.quantity + $4, updated_at = NOW()`,
        [uuidv4(), product.id, loc.id, qty]
      );

      await pool.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
         VALUES ($1, $2, $3, 'receipt', $4, $5, $6, $7)`,
        [uuidv4(), product.id, loc.id, reference, qty, newQty, createdAt]
      );
    }
  }

  // ══════════════════════════════════════════════════════════
  // 7. DELIVERY ORDERS (15 deliveries)
  // ══════════════════════════════════════════════════════════
  console.log('📤 Seeding 15 delivery orders...');
  const customerNames = ['ABC Industries', 'XYZ Corp', 'DEF Manufacturing', 'GHI Solutions', 'JKL Enterprises', 'MNO Trading', 'PQR Logistics'];

  for (let i = 0; i < 15; i++) {
    const wh = warehouses[i % warehouses.length];
    const user = pick(users);
    const deliveryId = uuidv4();
    const reference = ref('DEL');
    const isDone = i < 12; // 12 done, 3 draft
    const createdAt = pastDate(20);

    await pool.query(
      `INSERT INTO delivery_orders (id, reference, customer_name, warehouse_id, status, created_by, created_at, validated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [deliveryId, reference, pick(customerNames), wh.id, isDone ? 'done' : 'draft', user.id, createdAt, isDone ? createdAt : null]
    );

    const lineCount = randInt(1, 3);
    const used = new Set();
    for (let j = 0; j < lineCount; j++) {
      let product;
      do { product = pick(products); } while (used.has(product.id));
      used.add(product.id);

      const qty = randInt(5, 30);

      await pool.query(
        `INSERT INTO delivery_lines (id, delivery_id, product_id, qty)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), deliveryId, product.id, qty]
      );

      if (isDone) {
        const loc = pick(storageLocs[wh.id]);
        const prevQty = getStock(product.id, loc.id);
        const newQty = Math.max(0, prevQty - qty);
        setStock(product.id, loc.id, newQty);

        await pool.query(
          `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (product_id, location_id)
           DO UPDATE SET quantity = GREATEST(0, stock_levels.quantity - $5), updated_at = NOW()`,
          [uuidv4(), product.id, loc.id, newQty, qty]
        );

        await pool.query(
          `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
           VALUES ($1, $2, $3, 'delivery', $4, $5, $6, $7)`,
          [uuidv4(), product.id, loc.id, reference, -qty, newQty, createdAt]
        );
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // 8. INTERNAL TRANSFERS (10 transfers)
  // ══════════════════════════════════════════════════════════
  console.log('🔄 Seeding 10 internal transfers...');
  for (let i = 0; i < 10; i++) {
    const fromLoc = pick(locations.filter(l => l.zone === 'Storage'));
    let toLoc;
    do { toLoc = pick(locations); } while (toLoc.id === fromLoc.id);

    const user = pick(users);
    const transferId = uuidv4();
    const reference = ref('TRF');
    const isDone = i < 8;
    const createdAt = pastDate(15);

    await pool.query(
      `INSERT INTO internal_transfers (id, reference, from_location, to_location, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [transferId, reference, fromLoc.id, toLoc.id, isDone ? 'done' : 'draft', user.id, createdAt]
    );

    const product = pick(products);
    const qty = randInt(5, 30);

    await pool.query(
      `INSERT INTO transfer_lines (id, transfer_id, product_id, qty)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), transferId, product.id, qty]
    );

    if (isDone) {
      // Source decrease
      const srcPrev = getStock(product.id, fromLoc.id);
      const srcNew = Math.max(0, srcPrev - qty);
      setStock(product.id, fromLoc.id, srcNew);

      await pool.query(
        `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = GREATEST(0, stock_levels.quantity - $5), updated_at = NOW()`,
        [uuidv4(), product.id, fromLoc.id, srcNew, qty]
      );

      // Destination increase
      const destPrev = getStock(product.id, toLoc.id);
      const destNew = destPrev + qty;
      setStock(product.id, toLoc.id, destNew);

      await pool.query(
        `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = stock_levels.quantity + $5, updated_at = NOW()`,
        [uuidv4(), product.id, toLoc.id, destNew, qty]
      );

      // Ledger entries
      await pool.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
         VALUES ($1, $2, $3, 'transfer_out', $4, $5, $6, $7)`,
        [uuidv4(), product.id, fromLoc.id, reference, -qty, srcNew, createdAt]
      );
      await pool.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
         VALUES ($1, $2, $3, 'transfer_in', $4, $5, $6, $7)`,
        [uuidv4(), product.id, toLoc.id, reference, qty, destNew, createdAt]
      );
    }
  }

  // ══════════════════════════════════════════════════════════
  // 9. STOCK ADJUSTMENTS (8 adjustments)
  // ══════════════════════════════════════════════════════════
  console.log('📋 Seeding 8 stock adjustments...');
  const adjReasons = ['Damaged goods', 'Shrinkage', 'Physical count mismatch', 'Expired items', 'Inventory audit correction'];

  for (let i = 0; i < 8; i++) {
    const loc = pick(locations.filter(l => l.zone === 'Storage'));
    const user = pick(users);
    const adjId = uuidv4();
    const reference = ref('ADJ');
    const isDone = i < 6;
    const createdAt = pastDate(10);

    await pool.query(
      `INSERT INTO stock_adjustments (id, reference, location_id, reason, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adjId, reference, loc.id, pick(adjReasons), isDone ? 'done' : 'draft', user.id, createdAt]
    );

    const product = pick(products);
    const systemQty = getStock(product.id, loc.id);
    const countedQty = Math.max(0, systemQty - randInt(1, 10));
    const difference = countedQty - systemQty;

    await pool.query(
      `INSERT INTO adjustment_lines (id, adjustment_id, product_id, counted_qty, system_qty, difference)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), adjId, product.id, countedQty, systemQty, difference]
    );

    if (isDone) {
      setStock(product.id, loc.id, countedQty);

      await pool.query(
        `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = $4, updated_at = NOW()`,
        [uuidv4(), product.id, loc.id, countedQty]
      );

      await pool.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
         VALUES ($1, $2, $3, 'adjustment', $4, $5, $6, $7)`,
        [uuidv4(), product.id, loc.id, reference, difference, countedQty, createdAt]
      );
    }
  }

  // ══════════════════════════════════════════════════════════
  // DONE
  // ══════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════');
  console.log('✅ Seed complete! Summary:');
  console.log(`   👤 Users:        ${users.length} (password: Test@1234)`);
  console.log(`   📂 Categories:   ${categories.length}`);
  console.log(`   🏭 Suppliers:    ${suppliers.length}`);
  console.log(`   🏢 Warehouses:   ${warehouses.length}`);
  console.log(`   📍 Locations:    ${locations.length}`);
  console.log(`   📦 Products:     ${products.length}`);
  console.log(`   📥 Receipts:     20`);
  console.log(`   📤 Deliveries:   15`);
  console.log(`   🔄 Transfers:    10`);
  console.log(`   📋 Adjustments:  8`);
  console.log('════════════════════════════════════════════\n');
  console.log('Login credentials:');
  for (const u of users) {
    console.log(`   ${u.email} / Test@1234 (${u.role})`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
