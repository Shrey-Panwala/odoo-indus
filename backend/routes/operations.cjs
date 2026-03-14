const express = require('express')
const { getPool, withTransaction } = require('../pg.cjs')

const router = express.Router()

function toInt(value, fallback = 0) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.trunc(num)
}

function parsePage(req) {
  const page = Math.max(toInt(req.query.page, 1), 1)
  const pageSize = Math.min(Math.max(toInt(req.query.pageSize, 10), 1), 100)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function normalizeSort(value, allowed, fallback) {
  const raw = String(value || '').trim().toLowerCase()
  if (allowed.includes(raw)) return raw
  return fallback
}

function statusToApiError(error, res) {
  if (error.code === 'PG_NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message })
  }
  if (error.code === 'VALIDATION') {
    return res.status(400).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: 'Internal server error' })
}

async function queryList(query, values) {
  const pool = getPool()
  if (!pool) {
    const error = new Error('PostgreSQL is not configured. Set DATABASE_URL and install pg.')
    error.code = 'PG_NOT_CONFIGURED'
    throw error
  }

  const { rows } = await pool.query(query, values)
  return rows
}

router.get('/master/suppliers', async (_req, res) => {
  try {
    const rows = await queryList(
      'SELECT id, name FROM suppliers ORDER BY name ASC',
      [],
    )
    return res.json(rows)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/master/warehouses', async (_req, res) => {
  try {
    const rows = await queryList(
      'SELECT id, name, default_location_id FROM warehouses ORDER BY name ASC',
      [],
    )
    return res.json(rows)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/master/products', async (_req, res) => {
  try {
    const rows = await queryList(
      'SELECT id, name, sku FROM products ORDER BY name ASC',
      [],
    )
    return res.json(rows)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/master/locations', async (req, res) => {
  const warehouseId = toInt(req.query.warehouseId)

  try {
    if (warehouseId > 0) {
      const rows = await queryList(
        'SELECT id, name, warehouse_id FROM locations WHERE warehouse_id = $1 ORDER BY name ASC',
        [warehouseId],
      )
      return res.json(rows)
    }

    const rows = await queryList(
      'SELECT id, name, warehouse_id FROM locations ORDER BY name ASC',
      [],
    )
    return res.json(rows)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/ledger', async (req, res) => {
  const { page, pageSize, offset } = parsePage(req)
  const productId = toInt(req.query.productId)
  const warehouseId = toInt(req.query.warehouseId)
  const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : null
  const dateTo = req.query.dateTo ? String(req.query.dateTo) : null

  const where = []
  const values = []

  if (productId > 0) {
    values.push(productId)
    where.push(`sl.product_id = $${values.length}`)
  }
  if (warehouseId > 0) {
    values.push(warehouseId)
    where.push(`loc.warehouse_id = $${values.length}`)
  }
  if (dateFrom) {
    values.push(dateFrom)
    where.push(`sl.created_at >= $${values.length}`)
  }
  if (dateTo) {
    values.push(dateTo)
    where.push(`sl.created_at <= $${values.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const countRows = await queryList(
      `SELECT COUNT(1)::int AS total
       FROM stock_ledger sl
       LEFT JOIN locations loc ON loc.id = sl.location_id
       ${whereSql}`,
      values,
    )

    const total = countRows[0]?.total || 0

    values.push(pageSize)
    values.push(offset)

    const rows = await queryList(
      `SELECT sl.id, sl.product_id, p.name AS product_name, sl.location_id, loc.name AS location_name,
              sl.txn_type, sl.txn_ref, sl.qty_change, sl.qty_after, sl.created_at
       FROM stock_ledger sl
       LEFT JOIN products p ON p.id = sl.product_id
       LEFT JOIN locations loc ON loc.id = sl.location_id
       ${whereSql}
       ORDER BY sl.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    return res.json({ rows, page, pageSize, total })
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/receipts', async (req, res) => {
  const { page, pageSize, offset } = parsePage(req)
  const search = String(req.query.search || '').trim()
  const status = String(req.query.status || '').trim()
  const sortBy = normalizeSort(req.query.sortBy, ['reference', 'status', 'created_at'], 'created_at')
  const sortDir = normalizeSort(req.query.sortDir, ['asc', 'desc'], 'desc')

  const where = []
  const values = []

  if (search) {
    values.push(`%${search}%`)
    where.push(`(r.reference ILIKE $${values.length} OR s.name ILIKE $${values.length})`)
  }
  if (status) {
    values.push(status)
    where.push(`r.status = $${values.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const countRows = await queryList(
      `SELECT COUNT(1)::int AS total
       FROM receipts r
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       ${whereSql}`,
      values,
    )

    values.push(pageSize)
    values.push(offset)

    const rows = await queryList(
      `SELECT r.id, r.reference, r.supplier_id, s.name AS supplier_name, r.warehouse_id, w.name AS warehouse_name,
              r.status, r.created_by, r.created_at, r.validated_at
       FROM receipts r
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       LEFT JOIN warehouses w ON w.id = r.warehouse_id
       ${whereSql}
       ORDER BY r.${sortBy} ${sortDir}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    return res.json({ rows, page, pageSize, total: countRows[0]?.total || 0 })
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.post('/receipts', async (req, res) => {
  const body = req.body || {}
  const supplierId = toInt(body.supplier_id)
  const warehouseId = toInt(body.warehouse_id)
  const createdBy = String(body.created_by || 'system')
  const lines = Array.isArray(body.lines) ? body.lines : []

  try {
    if (supplierId <= 0 || warehouseId <= 0 || lines.length === 0) {
      const error = new Error('Supplier, warehouse and at least one line are required')
      error.code = 'VALIDATION'
      throw error
    }

    const data = await withTransaction(async (client) => {
      for (const line of lines) {
        if (toInt(line.product_id) <= 0 || Number(line.expected_qty) <= 0 || Number(line.received_qty) < 0) {
          const error = new Error('Invalid receipt line payload')
          error.code = 'VALIDATION'
          throw error
        }
        if (Number(line.received_qty) > Number(line.expected_qty)) {
          const error = new Error('Received quantity cannot exceed expected quantity')
          error.code = 'VALIDATION'
          throw error
        }
      }

      const referenceResult = await client.query(
        `SELECT CONCAT('RCPT-', TO_CHAR(NOW(), 'YYYYMMDD'), '-', LPAD((FLOOR(RANDOM() * 9999) + 1)::text, 4, '0')) AS ref`,
      )
      const reference = referenceResult.rows[0].ref

      const receiptResult = await client.query(
        `INSERT INTO receipts (reference, supplier_id, warehouse_id, status, created_by, created_at)
         VALUES ($1, $2, $3, 'Draft', $4, NOW())
         RETURNING id`,
        [reference, supplierId, warehouseId, createdBy],
      )

      const receiptId = receiptResult.rows[0].id

      for (const line of lines) {
        await client.query(
          `INSERT INTO receipt_lines (receipt_id, product_id, expected_qty, received_qty)
           VALUES ($1, $2, $3, $4)`,
          [receiptId, toInt(line.product_id), Number(line.expected_qty), Number(line.received_qty)],
        )
      }

      return { id: receiptId, reference }
    })

    return res.status(201).json(data)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/receipts/:id', async (req, res) => {
  const id = toInt(req.params.id)
  try {
    const rows = await queryList(
      `SELECT r.id, r.reference, r.supplier_id, s.name AS supplier_name, r.warehouse_id, w.name AS warehouse_name,
              r.status, r.created_by, r.created_at, r.validated_at
       FROM receipts r
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       LEFT JOIN warehouses w ON w.id = r.warehouse_id
       WHERE r.id = $1`,
      [id],
    )

    if (!rows[0]) return res.status(404).json({ error: 'Receipt not found' })

    const lines = await queryList(
      `SELECT rl.id, rl.product_id, p.name AS product_name, p.sku, rl.expected_qty, rl.received_qty
       FROM receipt_lines rl
       LEFT JOIN products p ON p.id = rl.product_id
       WHERE rl.receipt_id = $1
       ORDER BY rl.id ASC`,
      [id],
    )

    return res.json({ ...rows[0], lines })
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.post('/receipts/:id/validate', async (req, res) => {
  const id = toInt(req.params.id)

  try {
    const response = await withTransaction(async (client) => {
      const receiptRows = await client.query('SELECT * FROM receipts WHERE id = $1 FOR UPDATE', [id])
      const receipt = receiptRows.rows[0]

      if (!receipt) {
        const error = new Error('Receipt not found')
        error.code = 'VALIDATION'
        throw error
      }

      if (String(receipt.status).toLowerCase() === 'done' || receipt.validated_at) {
        const error = new Error('Receipt is already validated')
        error.code = 'VALIDATION'
        throw error
      }

      const linesResult = await client.query('SELECT * FROM receipt_lines WHERE receipt_id = $1 ORDER BY id ASC', [id])
      if (!linesResult.rows.length) {
        const error = new Error('Receipt lines are required')
        error.code = 'VALIDATION'
        throw error
      }

      const locResult = await client.query(
        `SELECT w.default_location_id, (
           SELECT id FROM locations WHERE warehouse_id = w.id ORDER BY id ASC LIMIT 1
         ) AS fallback_location
         FROM warehouses w
         WHERE w.id = $1`,
        [receipt.warehouse_id],
      )

      const locationId = locResult.rows[0]?.default_location_id || locResult.rows[0]?.fallback_location
      if (!locationId) {
        const error = new Error('No warehouse location found for receipt validation')
        error.code = 'VALIDATION'
        throw error
      }

      for (const line of linesResult.rows) {
        const expectedQty = Number(line.expected_qty)
        const receivedQty = Number(line.received_qty)

        if (receivedQty < 0 || expectedQty <= 0 || receivedQty > expectedQty) {
          const error = new Error('Received quantity cannot exceed expected quantity')
          error.code = 'VALIDATION'
          throw error
        }

        const stockUpdate = await client.query(
          `INSERT INTO stock_levels (product_id, location_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, location_id)
           DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
           RETURNING quantity`,
          [line.product_id, locationId, receivedQty],
        )

        const qtyAfter = Number(stockUpdate.rows[0].quantity)

        await client.query(
          `INSERT INTO stock_ledger (product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
           VALUES ($1, $2, 'RECEIPT', $3, $4, $5, NOW())`,
          [line.product_id, locationId, receipt.reference, receivedQty, qtyAfter],
        )
      }

      await client.query("UPDATE receipts SET status = 'Done', validated_at = NOW() WHERE id = $1", [id])
      return { ok: true }
    })

    return res.json(response)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/deliveries', async (req, res) => {
  const { page, pageSize, offset } = parsePage(req)
  const search = String(req.query.search || '').trim()
  const status = String(req.query.status || '').trim()

  const where = []
  const values = []

  if (search) {
    values.push(`%${search}%`)
    where.push(`(d.reference ILIKE $${values.length} OR d.customer_name ILIKE $${values.length})`)
  }
  if (status) {
    values.push(status)
    where.push(`d.status = $${values.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const countRows = await queryList(
      `SELECT COUNT(1)::int AS total FROM delivery_orders d ${whereSql}`,
      values,
    )

    values.push(pageSize)
    values.push(offset)

    const rows = await queryList(
      `SELECT d.id, d.reference, d.customer_name, d.warehouse_id, w.name AS warehouse_name, d.status, d.created_at, d.validated_at
       FROM delivery_orders d
       LEFT JOIN warehouses w ON w.id = d.warehouse_id
       ${whereSql}
       ORDER BY d.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    return res.json({ rows, page, pageSize, total: countRows[0]?.total || 0 })
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.post('/deliveries', async (req, res) => {
  const body = req.body || {}
  const customerName = String(body.customer_name || '').trim()
  const warehouseId = toInt(body.warehouse_id)
  const lines = Array.isArray(body.lines) ? body.lines : []

  try {
    if (!customerName || warehouseId <= 0 || lines.length === 0) {
      const error = new Error('Customer name, warehouse and at least one line are required')
      error.code = 'VALIDATION'
      throw error
    }

    const data = await withTransaction(async (client) => {
      for (const line of lines) {
        if (toInt(line.product_id) <= 0 || Number(line.quantity) <= 0) {
          const error = new Error('Invalid delivery line payload')
          error.code = 'VALIDATION'
          throw error
        }
      }

      const ref = await client.query(
        `SELECT CONCAT('DO-', TO_CHAR(NOW(), 'YYYYMMDD'), '-', LPAD((FLOOR(RANDOM() * 9999) + 1)::text, 4, '0')) AS ref`,
      )

      const deliveryResult = await client.query(
        `INSERT INTO delivery_orders (reference, customer_name, warehouse_id, status, created_at)
         VALUES ($1, $2, $3, 'Draft', NOW())
         RETURNING id`,
        [ref.rows[0].ref, customerName, warehouseId],
      )

      const deliveryId = deliveryResult.rows[0].id

      for (const line of lines) {
        await client.query(
          `INSERT INTO delivery_lines (delivery_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [deliveryId, toInt(line.product_id), Number(line.quantity)],
        )
      }

      return { id: deliveryId, reference: ref.rows[0].ref }
    })

    return res.status(201).json(data)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/deliveries/:id', async (req, res) => {
  const id = toInt(req.params.id)

  try {
    const rows = await queryList(
      `SELECT d.id, d.reference, d.customer_name, d.warehouse_id, w.name AS warehouse_name,
              d.status, d.created_at, d.validated_at
       FROM delivery_orders d
       LEFT JOIN warehouses w ON w.id = d.warehouse_id
       WHERE d.id = $1`,
      [id],
    )

    if (!rows[0]) return res.status(404).json({ error: 'Delivery order not found' })

    const lines = await queryList(
      `SELECT dl.id, dl.product_id, p.name AS product_name, p.sku, dl.quantity
       FROM delivery_lines dl
       LEFT JOIN products p ON p.id = dl.product_id
       WHERE dl.delivery_id = $1
       ORDER BY dl.id ASC`,
      [id],
    )

    return res.json({ ...rows[0], lines })
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.post('/deliveries/:id/validate', async (req, res) => {
  const id = toInt(req.params.id)

  try {
    const response = await withTransaction(async (client) => {
      const dRows = await client.query('SELECT * FROM delivery_orders WHERE id = $1 FOR UPDATE', [id])
      const delivery = dRows.rows[0]

      if (!delivery) {
        const error = new Error('Delivery order not found')
        error.code = 'VALIDATION'
        throw error
      }

      if (String(delivery.status).toLowerCase() === 'done' || delivery.validated_at) {
        const error = new Error('Delivery order is already validated')
        error.code = 'VALIDATION'
        throw error
      }

      const locResult = await client.query(
        `SELECT w.default_location_id, (
           SELECT id FROM locations WHERE warehouse_id = w.id ORDER BY id ASC LIMIT 1
         ) AS fallback_location
         FROM warehouses w
         WHERE w.id = $1`,
        [delivery.warehouse_id],
      )
      const locationId = locResult.rows[0]?.default_location_id || locResult.rows[0]?.fallback_location
      if (!locationId) {
        const error = new Error('No warehouse location found for delivery validation')
        error.code = 'VALIDATION'
        throw error
      }

      const linesResult = await client.query('SELECT * FROM delivery_lines WHERE delivery_id = $1 ORDER BY id ASC', [id])
      if (!linesResult.rows.length) {
        const error = new Error('Delivery lines are required')
        error.code = 'VALIDATION'
        throw error
      }

      for (const line of linesResult.rows) {
        const qty = Number(line.quantity)
        if (qty <= 0) {
          const error = new Error('Quantity must be positive')
          error.code = 'VALIDATION'
          throw error
        }

        const stockRows = await client.query(
          'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
          [line.product_id, locationId],
        )

        const currentQty = Number(stockRows.rows[0]?.quantity || 0)
        if (currentQty < qty) {
          const error = new Error('Insufficient stock for product')
          error.code = 'VALIDATION'
          throw error
        }

        const nextQty = currentQty - qty
        await client.query(
          'UPDATE stock_levels SET quantity = $1 WHERE product_id = $2 AND location_id = $3',
          [nextQty, line.product_id, locationId],
        )

        await client.query(
          `INSERT INTO stock_ledger (product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
           VALUES ($1, $2, 'DELIVERY', $3, $4, $5, NOW())`,
          [line.product_id, locationId, delivery.reference, -qty, nextQty],
        )
      }

      await client.query("UPDATE delivery_orders SET status = 'Done', validated_at = NOW() WHERE id = $1", [id])
      return { ok: true }
    })

    return res.json(response)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/adjustments', async (req, res) => {
  const { page, pageSize, offset } = parsePage(req)
  const search = String(req.query.search || '').trim()
  const status = String(req.query.status || '').trim()

  const where = []
  const values = []

  if (search) {
    values.push(`%${search}%`)
    where.push(`(a.reference ILIKE $${values.length} OR a.reason ILIKE $${values.length})`)
  }
  if (status) {
    values.push(status)
    where.push(`a.status = $${values.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const countRows = await queryList(
      `SELECT COUNT(1)::int AS total FROM stock_adjustments a ${whereSql}`,
      values,
    )

    values.push(pageSize)
    values.push(offset)

    const rows = await queryList(
      `SELECT a.id, a.reference, a.location_id, loc.name AS location_name, a.reason, a.status, a.created_at
       FROM stock_adjustments a
       LEFT JOIN locations loc ON loc.id = a.location_id
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    return res.json({ rows, page, pageSize, total: countRows[0]?.total || 0 })
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.post('/adjustments', async (req, res) => {
  const body = req.body || {}
  const locationId = toInt(body.location_id)
  const reason = String(body.reason || '').trim()
  const lines = Array.isArray(body.lines) ? body.lines : []

  try {
    if (locationId <= 0 || !reason || lines.length === 0) {
      const error = new Error('Location, reason and at least one line are required')
      error.code = 'VALIDATION'
      throw error
    }

    const data = await withTransaction(async (client) => {
      for (const line of lines) {
        if (toInt(line.product_id) <= 0 || Number(line.counted_qty) < 0) {
          const error = new Error('Invalid adjustment line payload')
          error.code = 'VALIDATION'
          throw error
        }
      }

      const ref = await client.query(
        `SELECT CONCAT('ADJ-', TO_CHAR(NOW(), 'YYYYMMDD'), '-', LPAD((FLOOR(RANDOM() * 9999) + 1)::text, 4, '0')) AS ref`,
      )

      const adjustmentResult = await client.query(
        `INSERT INTO stock_adjustments (reference, location_id, reason, status, created_at)
         VALUES ($1, $2, $3, 'Draft', NOW())
         RETURNING id`,
        [ref.rows[0].ref, locationId, reason],
      )

      const adjustmentId = adjustmentResult.rows[0].id

      for (const line of lines) {
        const currentStock = await client.query(
          'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
          [toInt(line.product_id), locationId],
        )
        const systemQty = Number(currentStock.rows[0]?.quantity || 0)
        const countedQty = Number(line.counted_qty)
        const difference = countedQty - systemQty

        await client.query(
          `INSERT INTO adjustment_lines (adjustment_id, product_id, system_qty, counted_qty, difference)
           VALUES ($1, $2, $3, $4, $5)`,
          [adjustmentId, toInt(line.product_id), systemQty, countedQty, difference],
        )
      }

      return { id: adjustmentId, reference: ref.rows[0].ref }
    })

    return res.status(201).json(data)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.get('/adjustments/:id', async (req, res) => {
  const id = toInt(req.params.id)

  try {
    const rows = await queryList(
      `SELECT a.id, a.reference, a.location_id, loc.name AS location_name, a.reason, a.status, a.created_at
       FROM stock_adjustments a
       LEFT JOIN locations loc ON loc.id = a.location_id
       WHERE a.id = $1`,
      [id],
    )

    if (!rows[0]) return res.status(404).json({ error: 'Adjustment not found' })

    const lines = await queryList(
      `SELECT al.id, al.product_id, p.name AS product_name, p.sku, al.system_qty, al.counted_qty, al.difference
       FROM adjustment_lines al
       LEFT JOIN products p ON p.id = al.product_id
       WHERE al.adjustment_id = $1
       ORDER BY al.id ASC`,
      [id],
    )

    return res.json({ ...rows[0], lines })
  } catch (error) {
    return statusToApiError(error, res)
  }
})

router.post('/adjustments/:id/validate', async (req, res) => {
  const id = toInt(req.params.id)

  try {
    const response = await withTransaction(async (client) => {
      const aRows = await client.query('SELECT * FROM stock_adjustments WHERE id = $1 FOR UPDATE', [id])
      const adjustment = aRows.rows[0]
      if (!adjustment) {
        const error = new Error('Adjustment not found')
        error.code = 'VALIDATION'
        throw error
      }
      if (String(adjustment.status).toLowerCase() === 'done') {
        const error = new Error('Adjustment already validated')
        error.code = 'VALIDATION'
        throw error
      }

      const linesResult = await client.query('SELECT * FROM adjustment_lines WHERE adjustment_id = $1 ORDER BY id ASC', [id])
      if (!linesResult.rows.length) {
        const error = new Error('Adjustment lines are required')
        error.code = 'VALIDATION'
        throw error
      }

      for (const line of linesResult.rows) {
        const countedQty = Number(line.counted_qty)
        if (countedQty < 0) {
          const error = new Error('Counted quantity must be non-negative')
          error.code = 'VALIDATION'
          throw error
        }

        const lockedStock = await client.query(
          'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
          [line.product_id, adjustment.location_id],
        )

        if (!lockedStock.rows[0]) {
          await client.query(
            'INSERT INTO stock_levels (product_id, location_id, quantity) VALUES ($1, $2, $3)',
            [line.product_id, adjustment.location_id, countedQty],
          )
        } else {
          await client.query(
            'UPDATE stock_levels SET quantity = $1 WHERE product_id = $2 AND location_id = $3',
            [countedQty, line.product_id, adjustment.location_id],
          )
        }

        await client.query(
          `INSERT INTO stock_ledger (product_id, location_id, txn_type, txn_ref, qty_change, qty_after, created_at)
           VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5, NOW())`,
          [line.product_id, adjustment.location_id, adjustment.reference, Number(line.difference), countedQty],
        )
      }

      await client.query("UPDATE stock_adjustments SET status = 'Done' WHERE id = $1", [id])
      return { ok: true }
    })

    return res.json(response)
  } catch (error) {
    return statusToApiError(error, res)
  }
})

module.exports = router
