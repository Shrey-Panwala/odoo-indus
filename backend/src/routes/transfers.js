const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── List Internal Transfers ────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT t.*,
             fl.name AS from_location_name, fw.name AS from_warehouse_name,
             tl.name AS to_location_name, tw.name AS to_warehouse_name,
             u.full_name AS created_by_name
      FROM internal_transfers t
      LEFT JOIN locations fl ON fl.id = t.from_location
      LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
      LEFT JOIN locations tl ON tl.id = t.to_location
      LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
      LEFT JOIN users u ON u.id = t.created_by
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ` AND t.status = $1`; params.push(status); }
    sql += ' ORDER BY t.created_at DESC';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List transfers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Create Transfer ────────────
router.post('/', auth, async (req, res) => {
  try {
    const { fromLocation, toLocation, lines } = req.body;
    if (!fromLocation || !toLocation || !lines || lines.length === 0) {
      return res.status(400).json({ error: 'fromLocation, toLocation, and lines are required' });
    }

    const id = uuidv4();
    const reference = `TRF-${Date.now().toString(36).toUpperCase()}`;

    await pool.query(
      `INSERT INTO internal_transfers (id, reference, from_location, to_location, status, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5)`,
      [id, reference, fromLocation, toLocation, req.user.id]
    );

    for (const line of lines) {
      await pool.query(
        `INSERT INTO transfer_lines (id, transfer_id, product_id, qty)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), id, line.productId, line.qty || 0]
      );
    }

    res.status(201).json({ ok: true, id, reference });
  } catch (err) {
    console.error('Create transfer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Validate Transfer → Move Stock ────────────
router.post('/:id/validate', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transfer = await client.query(
      'SELECT * FROM internal_transfers WHERE id = $1 AND status = $2',
      [req.params.id, 'draft']
    );
    if (transfer.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transfer not found or already completed' });
    }

    const t = transfer.rows[0];
    const lines = await client.query('SELECT * FROM transfer_lines WHERE transfer_id = $1', [req.params.id]);

    for (const line of lines.rows) {
      // Check source stock
      const srcCheck = await client.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [line.product_id, t.from_location]
      );
      const srcQty = srcCheck.rows.length > 0 ? srcCheck.rows[0].quantity : 0;
      if (srcQty < line.qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock at source for product ${line.product_id}. Available: ${srcQty}, Requested: ${line.qty}`
        });
      }

      // Decrease source
      await client.query(
        `UPDATE stock_levels SET quantity = quantity - $1, updated_at = NOW()
         WHERE product_id = $2 AND location_id = $3`,
        [line.qty, line.product_id, t.from_location]
      );

      // Increase destination
      await client.query(
        `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = stock_levels.quantity + $4, updated_at = NOW()`,
        [uuidv4(), line.product_id, t.to_location, line.qty]
      );

      // Ledger entries
      const srcResult = await client.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [line.product_id, t.from_location]
      );
      const destResult = await client.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [line.product_id, t.to_location]
      );

      await client.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after)
         VALUES ($1, $2, $3, 'transfer_out', $4, $5, $6)`,
        [uuidv4(), line.product_id, t.from_location, t.reference, -line.qty, srcResult.rows[0].quantity]
      );
      await client.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after)
         VALUES ($1, $2, $3, 'transfer_in', $4, $5, $6)`,
        [uuidv4(), line.product_id, t.to_location, t.reference, line.qty, destResult.rows[0].quantity]
      );
    }

    await client.query(
      "UPDATE internal_transfers SET status = 'done' WHERE id = $1",
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, message: 'Transfer completed. Stock moved.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Validate transfer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
