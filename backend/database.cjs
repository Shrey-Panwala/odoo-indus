const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const DB_PATH = path.join(__dirname, 'inventory.db')
const db = new sqlite3.Database(DB_PATH)

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      sku TEXT,
      category TEXT,
      stock INTEGER,
      location TEXT,
      unit_cost REAL DEFAULT 0,
      reserved_qty INTEGER DEFAULT 0
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      quantity INTEGER,
      status TEXT,
      schedule_date TEXT
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      quantity INTEGER,
      status TEXT,
      schedule_date TEXT
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      difference INTEGER,
      reason TEXT
    )`)

    db.all('PRAGMA table_info(products)', (columnsError, columns = []) => {
      if (columnsError) {
        console.error(columnsError)
        return
      }

      const names = new Set(columns.map((column) => column.name))
      if (!names.has('unit_cost')) {
        db.run('ALTER TABLE products ADD COLUMN unit_cost REAL DEFAULT 0')
      }
      if (!names.has('reserved_qty')) {
        db.run('ALTER TABLE products ADD COLUMN reserved_qty INTEGER DEFAULT 0')
      }

      db.run('UPDATE products SET unit_cost = 0 WHERE unit_cost IS NULL')
      db.run('UPDATE products SET reserved_qty = 0 WHERE reserved_qty IS NULL')

      db.get('SELECT COUNT(1) AS count FROM products', (error, row) => {
        if (error) {
          console.error(error)
          return
        }

        if (row?.count !== 0) {
          return
        }

        const insertProduct = db.prepare(
          'INSERT INTO products (name, sku, category, stock, location, unit_cost, reserved_qty) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        const products = [
          ['Apple - Gala', 'APL-GAL', 'Fruits', 120, 'A1', 110, 8],
          ['Banana - Cavendish', 'BNA-CAV', 'Fruits', 40, 'A1', 65, 4],
          ['Milk 1L', 'MLK-1L', 'Dairy', 8, 'B2', 58, 2],
          ['Rice 5kg', 'RCE-5KG', 'Grocery', 200, 'C3', 420, 15],
          ['Tomato', 'TMT-01', 'Vegetables', 6, 'A2', 35, 1],
        ]

        products.forEach((product) => insertProduct.run(product))
        insertProduct.finalize()

        const insertReceipt = db.prepare('INSERT INTO receipts (product_id, quantity, status, schedule_date) VALUES (?, ?, ?, ?)')
        insertReceipt.run(2, 50, 'waiting', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())
        insertReceipt.run(3, 20, 'late', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        insertReceipt.finalize()

        const insertDelivery = db.prepare('INSERT INTO deliveries (product_id, quantity, status, schedule_date) VALUES (?, ?, ?, ?)')
        insertDelivery.run(4, 10, 'waiting', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        insertDelivery.run(5, 5, 'late', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        insertDelivery.finalize()
      })
    })
  })
}

module.exports = { db, init }