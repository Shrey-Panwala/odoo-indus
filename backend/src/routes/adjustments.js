const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── List Adjustments ────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, locationId } = req.query;
    let sql = `
      SELECT a.*, l.name AS location_name, w.name AS warehouse_name,
             u.full_name AS created_by_name
      FROM stock_adjustments a
      LEFT JOIN locations l ON l.id = a.location_id
      LEFT JOIN warehouses w ON w.id = l.warehouse_id
      LEFT JOIN users u ON u.id = a.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND a.status = $${idx++}`; params.push(status); }
    if (locationId) { sql += ` AND a.location_id = $${idx++}`; params.push(locationId); }

    sql += ' ORDER BY a.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List adjustments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Create Adjustment ────────────
router.post('/', auth, async (req, res) => {
  try {
    const { locationId, reason, lines } = req.body;
    if (!locationId || !lines || lines.length === 0) {
      return res.status(400).json({ error: 'locationId and at least one line item are required' });
    }

    const id = uuidv4();
    const reference = `ADJ-${Date.now().toString(36).toUpperCase()}`;

    await pool.query(
      `INSERT INTO stock_adjustments (id, reference, location_id, reason, status, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5)`,
      [id, reference, locationId, reason || null, req.user.id]
    );

    for (const line of lines) {
      // Get current system quantity
      const slResult = await pool.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [line.productId, locationId]
      );
      const systemQty = slResult.rows.length > 0 ? slResult.rows[0].quantity : 0;
      const difference = line.countedQty - systemQty;

      await pool.query(
        `INSERT INTO adjustment_lines (id, adjustment_id, product_id, counted_qty, system_qty, difference)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), id, line.productId, line.countedQty, systemQty, difference]
      );
    }

    res.status(201).json({ ok: true, id, reference });
  } catch (err) {
    console.error('Create adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Validate Adjustment → Update Stock ────────────
router.post('/:id/validate', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adjustment = await client.query(
      'SELECT * FROM stock_adjustments WHERE id = $1 AND status = $2',
      [req.params.id, 'draft']
    );
    if (adjustment.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Adjustment not found or already applied' });
    }

    const adj = adjustment.rows[0];
    const lines = await client.query('SELECT * FROM adjustment_lines WHERE adjustment_id = $1', [req.params.id]);

    for (const line of lines.rows) {
      // Set stock to counted quantity
      await client.query(
        `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = $4, updated_at = NOW()`,
        [uuidv4(), line.product_id, adj.location_id, line.counted_qty]
      );

      // Log to ledger
      await client.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after)
         VALUES ($1, $2, $3, 'adjustment', $4, $5, $6)`,
        [uuidv4(), line.product_id, adj.location_id, adj.reference, line.difference, line.counted_qty]
      );
    }

    await client.query(
      "UPDATE stock_adjustments SET status = 'done' WHERE id = $1",
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, message: 'Adjustment applied. Stock updated.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Validate adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
