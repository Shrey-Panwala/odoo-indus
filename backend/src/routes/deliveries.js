const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── List Delivery Orders ────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, warehouseId } = req.query;
    let sql = `
      SELECT d.*, w.name AS warehouse_name, u.full_name AS created_by_name
      FROM delivery_orders d
      LEFT JOIN warehouses w ON w.id = d.warehouse_id
      LEFT JOIN users u ON u.id = d.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND d.status = $${idx++}`; params.push(status); }
    if (warehouseId) { sql += ` AND d.warehouse_id = $${idx++}`; params.push(warehouseId); }

    sql += ' ORDER BY d.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List deliveries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Get Delivery with Lines ────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const delivery = await pool.query(
      `SELECT d.*, w.name AS warehouse_name
       FROM delivery_orders d
       LEFT JOIN warehouses w ON w.id = d.warehouse_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (delivery.rows.length === 0) return res.status(404).json({ error: 'Delivery not found' });

    const lines = await pool.query(
      `SELECT dl.*, p.name AS product_name, p.sku
       FROM delivery_lines dl
       JOIN products p ON p.id = dl.product_id
       WHERE dl.delivery_id = $1`,
      [req.params.id]
    );

    res.json({ ...delivery.rows[0], lines: lines.rows });
  } catch (err) {
    console.error('Get delivery error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Create Draft Delivery ────────────
router.post('/', auth, async (req, res) => {
  try {
    const { customerName, warehouseId, lines } = req.body;
    if (!warehouseId || !lines || lines.length === 0) {
      return res.status(400).json({ error: 'warehouseId and at least one line item are required' });
    }

    const id = uuidv4();
    const reference = `DEL-${Date.now().toString(36).toUpperCase()}`;

    await pool.query(
      `INSERT INTO delivery_orders (id, reference, customer_name, warehouse_id, status, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5)`,
      [id, reference, customerName || null, warehouseId, req.user.id]
    );

    for (const line of lines) {
      await pool.query(
        `INSERT INTO delivery_lines (id, delivery_id, product_id, qty)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), id, line.productId, line.qty || 0]
      );
    }

    res.status(201).json({ ok: true, id, reference });
  } catch (err) {
    console.error('Create delivery error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Validate Delivery → Decrease Stock ────────────
router.post('/:id/validate', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const delivery = await client.query(
      'SELECT * FROM delivery_orders WHERE id = $1 AND status = $2',
      [req.params.id, 'draft']
    );
    if (delivery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Delivery not found or already validated' });
    }

    const lines = await client.query('SELECT * FROM delivery_lines WHERE delivery_id = $1', [req.params.id]);

    const locResult = await client.query(
      'SELECT id FROM locations WHERE warehouse_id = $1 LIMIT 1',
      [delivery.rows[0].warehouse_id]
    );
    if (locResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No location found for this warehouse' });
    }
    const locationId = locResult.rows[0].id;

    for (const line of lines.rows) {
      // Check sufficient stock
      const slCheck = await client.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [line.product_id, locationId]
      );
      const currentQty = slCheck.rows.length > 0 ? slCheck.rows[0].quantity : 0;
      if (currentQty < line.qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock for product ${line.product_id}. Available: ${currentQty}, Requested: ${line.qty}`
        });
      }

      // Decrease stock
      await client.query(
        `UPDATE stock_levels SET quantity = quantity - $1, updated_at = NOW()
         WHERE product_id = $2 AND location_id = $3`,
        [line.qty, line.product_id, locationId]
      );

      const slResult = await client.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [line.product_id, locationId]
      );

      // Log to stock ledger
      await client.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), line.product_id, locationId, 'delivery', delivery.rows[0].reference, -line.qty, slResult.rows[0].quantity]
      );
    }

    await client.query(
      'UPDATE delivery_orders SET status = $1, validated_at = NOW() WHERE id = $2',
      ['done', req.params.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, message: 'Delivery validated. Stock decreased.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Validate delivery error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
