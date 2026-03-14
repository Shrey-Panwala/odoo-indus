const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SQL_FILE_PATH = path.join(__dirname, 'mock_data_50_rows.sql');

// Helpers for realistic mock data
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];

const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Aaryan', 'Dhruv', 'Kabir', 'Rishi', 'Karan', 'Rohan', 'Neha', 'Priya', 'Riya', 'Aisha', 'Ananya', 'Diya', 'Kavya', 'Avni', 'Gauri', 'Isha', 'Myra', 'Aadhya', 'Suhana'];
const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Das', 'Kaur', 'Gupta', 'Reddy', 'Bhat', 'Rao', 'Yadav', 'Verma', 'Jain', 'Mishra', 'Pandey', 'Choudhary', 'Thakur', 'Nair', 'Menon', 'Iyer', 'Bannerjee', 'Ghosh', 'Bose', 'Sengupta'];
const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal'];
const productTypes = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam', 'Microphone', 'Docking Station', 'Printer', 'Cable', 'Charger', 'Adapter', 'Router', 'Switch', 'Server Rack', 'UPS', 'Hard Drive', 'SSD', 'RAM', 'GPU'];
const brands = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'Logitech', 'Razer', 'Corsair', 'Samsung', 'LG', 'BenQ', 'Sony', 'Bose', 'Jabra', 'Intel', 'AMD', 'Nvidia', 'Kingston', 'Crucial', 'Seagate', 'WD', 'Cisco', 'TP-Link', 'Netgear'];
const streets = ['MG Road', 'Linking Road', 'Brigade Road', 'Commercial Street', 'FC Road', 'Park Street', 'Connaught Place', 'South Ex', 'Indiranagar', 'Koramangala', 'Jayanagar', 'Viman Nagar', 'Bandra', 'Andheri'];

const generateName = () => `${pick(firstNames)} ${pick(lastNames)}`;
const generateCompany = () => `${pick(firstNames)} ${pick(['Tech', 'Industries', 'Corp', 'Solutions', 'Enterprises', 'Trading', 'Logistics'])} Pvt Ltd`;
const generateAddress = () => `${randInt(1, 999)}, ${pick(streets)}, ${pick(cities)}`;
const generatePhone = () => `+91-${randInt(6, 9)}${String(randInt(0, 999999999)).padStart(9, '0')}`;
const generateEmail = (name) => `${name.toLowerCase().replace(/ /g, '.')}.${Math.random().toString(36).substring(7)}@example.com`;

let refCounter = 0;
const ref = (prefix) => { refCounter++; return `${prefix}-${Date.now().toString(36).toUpperCase()}${String(refCounter).padStart(4, '0')}`; };
const pastDateStr = (daysBack) => {
  const d = new Date();
  d.setDate(d.getDate() - randInt(1, daysBack));
  d.setHours(randInt(6, 20), randInt(0, 59));
  return d.toISOString();
};

function generateSQL() {
  let sql = `-- ============================================================
-- CoreInventory Mock Data (50+ rows per table)
-- Generated on: ${new Date().toISOString()}
-- ============================================================

`;

  // 1. Users (50)
  sql += `-- 1. USERS\n`;
  const users = [];
  // Hardcoded admin for access
  users.push({ id: uuidv4(), name: 'Admin Operations', email: 'admin@coreinventory.com', phone: generatePhone(), role: 'inventory_manager' });
  for (let i = 1; i < 50; i++) {
    const name = generateName();
    users.push({ id: uuidv4(), name, email: generateEmail(name), phone: generatePhone(), role: pick(['inventory_manager', 'warehouse_staff']) });
  }
  
  // Test@1234 hashed
  const pwdHash = '$2a$10$w8T9/Iu8C1Cg6xR7N0p0/uO.9hE03l.D0E69v8iH.e/.kE2g13z9q'; 
  users.forEach(u => {
    sql += `INSERT INTO users (id, full_name, email, phone_number, password_hash, role, organization) VALUES ('${u.id}', '${u.name.replace(/'/g, "''")}', '${u.email}', '${u.phone}', '${pwdHash}', '${u.role}', 'CoreInventory HQ');\n`;
  });
  sql += '\n';

  // 2. Categories (20)
  sql += `-- 2. CATEGORIES\n`;
  const categories = [];
  const catNames = ['Electronics', 'Accessories', 'Peripherals', 'Networking', 'Storage', 'Components', 'Cables', 'Power', 'Audio', 'Visual', 'Printing', 'Servers', 'Smart Home', 'Wearables', 'Security', 'Cooling', 'Tools', 'Furniture', 'Software', 'Services'];
  for (let i = 0; i < 20; i++) {
    categories.push({ id: uuidv4(), name: catNames[i] });
  }
  categories.forEach(c => {
    sql += `INSERT INTO categories (id, name, description) VALUES ('${c.id}', '${c.name}', '${c.name} Category Description');\n`;
  });
  sql += '\n';

  // 3. Suppliers (50)
  sql += `-- 3. SUPPLIERS\n`;
  const suppliers = [];
  for (let i = 0; i < 50; i++) {
    const name = generateCompany();
    suppliers.push({ id: uuidv4(), name });
    sql += `INSERT INTO suppliers (id, name, email, phone) VALUES ('${suppliers[i].id}', '${name.replace(/'/g, "''")}', '${generateEmail(name)}', '${generatePhone()}');\n`;
  }
  sql += '\n';

  // 4. Warehouses (10)
  sql += `-- 4. WAREHOUSES\n`;
  const warehouses = [];
  for (let i = 0; i < 10; i++) {
    warehouses.push({ id: uuidv4(), name: `Warehouse ${cities[i % cities.length]}`, address: generateAddress() });
    sql += `INSERT INTO warehouses (id, name, address, is_active) VALUES ('${warehouses[i].id}', '${warehouses[i].name}', '${warehouses[i].address}', true);\n`;
  }
  sql += '\n';

  // 5. Locations (5 per warehouse = 50 locations)
  sql += `-- 5. LOCATIONS\n`;
  const locations = [];
  warehouses.forEach(wh => {
    const zones = ['Receiving', 'Storage', 'Storage', 'Shipping', 'Quality'];
    zones.forEach((zone, idx) => {
      const loc = { id: uuidv4(), whId: wh.id, name: `${zone} Zone ${idx+1}`, zone };
      locations.push(loc);
      sql += `INSERT INTO locations (id, warehouse_id, name, zone) VALUES ('${loc.id}', '${wh.id}', '${loc.name}', '${loc.zone}');\n`;
    });
  });
  sql += '\n';

  // 6. Products (50)
  sql += `-- 6. PRODUCTS\n`;
  const products = [];
  for (let i = 0; i < 50; i++) {
    const type = pick(productTypes);
    const brand = pick(brands);
    const name = `${brand} ${type} Model ${randInt(100, 999)}`;
    products.push({ id: uuidv4(), name });
    const cat = pick(categories);
    const uom = pick(['units', 'boxes', 'pieces']);
    sql += `INSERT INTO products (id, name, sku, category_id, unit_of_measure, reorder_point, reorder_qty, created_at) VALUES ('${products[i].id}', '${name.replace(/'/g, "''")}', 'SKU-${randInt(10000, 99999)}', '${cat.id}', '${uom}', ${randInt(5, 20)}, ${randInt(20, 100)}, '${pastDateStr(360)}');\n`;
  }
  sql += '\n';

  // 7. Initial Stock Levels
  // Let's populate 50 stock levels
  sql += `-- 7. STOCK LEVELS\n`;
  const stockLevelsMap = {}; // pid_lid => qty
  const getStock = (pid, lid) => stockLevelsMap[`${pid}_${lid}`] || 0;
  const setStock = (pid, lid, q) => { stockLevelsMap[`${pid}_${lid}`] = q; };
  
  for (let i = 0; i < 50; i++) {
    const p = pick(products);
    const l = pick(locations.filter(loc => loc.zone === 'Storage'));
    const qty = randInt(50, 500);
    setStock(p.id, l.id, qty);
    
    sql += `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at) VALUES ('${uuidv4()}', '${p.id}', '${l.id}', ${qty}, '${pastDateStr(30)}') ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;\n`;
  }
  sql += '\n';

  // 8. Receipts + Lines + Ledger (50)
  sql += `-- 8. RECEIPTS & LINES & LEDGER\n`;
  for(let i = 0; i < 50; i++) {
    const recId = uuidv4();
    const sup = pick(suppliers);
    const wh = pick(warehouses);
    const u = pick(users);
    const date = pastDateStr(60);
    const status = i < 40 ? 'done' : pick(['draft', 'ready']); // mostly done
    
    sql += `INSERT INTO receipts (id, reference, supplier_id, warehouse_id, status, created_by, created_at, validated_at) VALUES ('${recId}', '${ref('REC')}', '${sup.id}', '${wh.id}', '${status}', '${u.id}', '${date}', ${status === 'done' ? `'${date}'` : 'NULL'});\n`;

    const numLines = randInt(1, 3);
    for(let j=0; j<numLines; j++) {
      const p = pick(products);
      const qty = randInt(10, 100);
      sql += `INSERT INTO receipt_lines (id, receipt_id, product_id, expected_qty, received_qty) VALUES ('${uuidv4()}', '${recId}', '${p.id}', ${qty}, ${status === 'done' ? qty : 0});\n`;
      
      if (status === 'done') {
        const strgLoc = pick(locations.filter(l => l.whId === wh.id && l.zone === 'Storage')) || locations[0];
        const newQ = getStock(p.id, strgLoc.id) + qty;
        setStock(p.id, strgLoc.id, newQ);
        
        sql += `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at) VALUES ('${uuidv4()}', '${p.id}', '${strgLoc.id}', ${newQ}, '${date}') ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;\n`;
        sql += `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at) VALUES ('${uuidv4()}', '${p.id}', '${strgLoc.id}', 'receipt', '${ref('REC')}', ${qty}, ${newQ}, '${date}');\n`;
      }
    }
  }
  sql += '\n';

  // 9. Deliveries + Lines + Ledger (50)
  sql += `-- 9. DELIVERIES & LINES & LEDGER\n`;
  for(let i = 0; i < 50; i++) {
    const delId = uuidv4();
    const wh = pick(warehouses);
    const u = pick(users);
    const date = pastDateStr(30);
    const status = i < 40 ? 'done' : pick(['draft', 'ready']); // mostly done
    const cust = generateCompany();
    
    sql += `INSERT INTO delivery_orders (id, reference, customer_name, warehouse_id, status, created_by, created_at, validated_at) VALUES ('${delId}', '${ref('DEL')}', '${cust.replace(/'/g, "''")}', '${wh.id}', '${status}', '${u.id}', '${date}', ${status === 'done' ? `'${date}'` : 'NULL'});\n`;

    const numLines = randInt(1, 3);
    for(let j=0; j<numLines; j++) {
      const p = pick(products);
      const qty = randInt(5, 50);
      sql += `INSERT INTO delivery_lines (id, delivery_id, product_id, qty) VALUES ('${uuidv4()}', '${delId}', '${p.id}', ${qty});\n`;
      
      if (status === 'done') {
        const strgLoc = pick(locations.filter(l => l.whId === wh.id && l.zone === 'Storage')) || locations[0];
        const prev = getStock(p.id, strgLoc.id);
        const newQ = Math.max(0, prev - qty);
        setStock(p.id, strgLoc.id, newQ);
        
        sql += `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at) VALUES ('${uuidv4()}', '${p.id}', '${strgLoc.id}', ${newQ}, '${date}') ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;\n`;
        sql += `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at) VALUES ('${uuidv4()}', '${p.id}', '${strgLoc.id}', 'delivery', '${ref('DEL')}', ${-qty}, ${newQ}, '${date}');\n`;
      }
    }
  }
  sql += '\n';

  // 10. Transfers + Lines + Ledger (50)
  sql += `-- 10. TRANSFERS & LINES & LEDGER\n`;
  for(let i = 0; i < 50; i++) {
    const tId = uuidv4();
    const l1 = pick(locations);
    let l2 = pick(locations);
    while(l1.id === l2.id) l2 = pick(locations);
    const u = pick(users);
    const date = pastDateStr(20);
    const status = i < 40 ? 'done' : 'draft';
    
    sql += `INSERT INTO internal_transfers (id, reference, from_location, to_location, status, created_by, created_at) VALUES ('${tId}', '${ref('TRF')}', '${l1.id}', '${l2.id}', '${status}', '${u.id}', '${date}');\n`;

    const numLines = randInt(1, 2);
    for(let j=0; j<numLines; j++) {
      const p = pick(products);
      const qty = randInt(2, 20);
      sql += `INSERT INTO transfer_lines (id, transfer_id, product_id, qty) VALUES ('${uuidv4()}', '${tId}', '${p.id}', ${qty});\n`;
      
      if (status === 'done') {
        const prev1 = getStock(p.id, l1.id);
        const new1 = Math.max(0, prev1 - qty);
        setStock(p.id, l1.id, new1);
        sql += `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at) VALUES ('${uuidv4()}', '${p.id}', '${l1.id}', ${new1}, '${date}') ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;\n`;
        sql += `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at) VALUES ('${uuidv4()}', '${p.id}', '${l1.id}', 'transfer_out', '${ref('TRF')}', ${-qty}, ${new1}, '${date}');\n`;

        const prev2 = getStock(p.id, l2.id);
        const new2 = prev2 + qty;
        setStock(p.id, l2.id, new2);
        sql += `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at) VALUES ('${uuidv4()}', '${p.id}', '${l2.id}', ${new2}, '${date}') ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;\n`;
        sql += `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at) VALUES ('${uuidv4()}', '${p.id}', '${l2.id}', 'transfer_in', '${ref('TRF')}', ${qty}, ${new2}, '${date}');\n`;
      }
    }
  }
  sql += '\n';

  // 11. Adjustments + Lines + Ledger (50)
  sql += `-- 11. ADJUSTMENTS & LINES & LEDGER\n`;
  for(let i = 0; i < 50; i++) {
    const aId = uuidv4();
    const loc = pick(locations.filter(l => l.zone === 'Storage'));
    const u = pick(users);
    const date = pastDateStr(10);
    const status = i < 40 ? 'done' : 'draft';
    const reason = pick(['Cycle count', 'Damaged goods', 'Shrinkage', 'Audit correction']);
    
    sql += `INSERT INTO stock_adjustments (id, reference, location_id, reason, status, created_by, created_at) VALUES ('${aId}', '${ref('ADJ')}', '${loc.id}', '${reason}', '${status}', '${u.id}', '${date}');\n`;

    const numLines = randInt(1, 2);
    for(let j=0; j<numLines; j++) {
      const p = pick(products);
      const system_qty = getStock(p.id, loc.id);
      const counted_qty = Math.max(0, system_qty + randInt(-10, 10));
      const diff = counted_qty - system_qty;
      
      sql += `INSERT INTO adjustment_lines (id, adjustment_id, product_id, counted_qty, system_qty, difference) VALUES ('${uuidv4()}', '${aId}', '${p.id}', ${counted_qty}, ${system_qty}, ${diff});\n`;
      
      if (status === 'done') {
        setStock(p.id, loc.id, counted_qty);
        sql += `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at) VALUES ('${uuidv4()}', '${p.id}', '${loc.id}', ${counted_qty}, '${date}') ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;\n`;
        sql += `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at) VALUES ('${uuidv4()}', '${p.id}', '${loc.id}', 'adjustment', '${ref('ADJ')}', ${diff}, ${counted_qty}, '${date}');\n`;
      }
    }
  }
  sql += '\n';

  fs.writeFileSync(SQL_FILE_PATH, sql);
  console.log('✅ Generated 50+ rows per table to:', SQL_FILE_PATH);
}

generateSQL();
