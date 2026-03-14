const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── List Receipts ────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, warehouseId } = req.query;
    let sql = `
      SELECT r.*, s.name AS supplier_name, w.name AS warehouse_name,
             u.full_name AS created_by_name
      FROM receipts r
      LEFT JOIN suppliers s ON s.id = r.supplier_id
      LEFT JOIN warehouses w ON w.id = r.warehouse_id
      LEFT JOIN users u ON u.id = r.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND r.status = $${idx++}`; params.push(status); }
    if (warehouseId) { sql += ` AND r.warehouse_id = $${idx++}`; params.push(warehouseId); }

    sql += ' ORDER BY r.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List receipts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Get Receipt with Lines ────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const receipt = await pool.query(
      `SELECT r.*, s.name AS supplier_name, w.name AS warehouse_name
       FROM receipts r
       LEFT JOIN suppliers s ON s.id = r.supplier_id
       LEFT JOIN warehouses w ON w.id = r.warehouse_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (receipt.rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });

    const lines = await pool.query(
      `SELECT rl.*, p.name AS product_name, p.sku
       FROM receipt_lines rl
       JOIN products p ON p.id = rl.product_id
       WHERE rl.receipt_id = $1`,
      [req.params.id]
    );

    res.json({ ...receipt.rows[0], lines: lines.rows });
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Create Draft Receipt ────────────
router.post('/', auth, async (req, res) => {
  try {
    const { supplierId, warehouseId, lines } = req.body;
    if (!warehouseId || !lines || lines.length === 0) {
      return res.status(400).json({ error: 'warehouseId and at least one line item are required' });
    }

    const id = uuidv4();
    const reference = `REC-${Date.now().toString(36).toUpperCase()}`;

    await pool.query(
      `INSERT INTO receipts (id, reference, supplier_id, warehouse_id, status, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5)`,
      [id, reference, supplierId || null, warehouseId, req.user.id]
    );

    for (const line of lines) {
      await pool.query(
        `INSERT INTO receipt_lines (id, receipt_id, product_id, expected_qty, received_qty)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), id, line.productId, line.expectedQty || 0, line.receivedQty || 0]
      );
    }

    res.status(201).json({ ok: true, id, reference });
  } catch (err) {
    console.error('Create receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Update Draft Receipt ────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { supplierId, lines } = req.body;
    const receipt = await pool.query('SELECT * FROM receipts WHERE id = $1 AND status = $2', [req.params.id, 'draft']);
    if (receipt.rows.length === 0) return res.status(404).json({ error: 'Draft receipt not found' });

    if (supplierId !== undefined) {
      await pool.query('UPDATE receipts SET supplier_id = $1 WHERE id = $2', [supplierId, req.params.id]);
    }

    if (lines) {
      await pool.query('DELETE FROM receipt_lines WHERE receipt_id = $1', [req.params.id]);
      for (const line of lines) {
        await pool.query(
          `INSERT INTO receipt_lines (id, receipt_id, product_id, expected_qty, received_qty)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), req.params.id, line.productId, line.expectedQty || 0, line.receivedQty || 0]
        );
      }
    }

    res.json({ ok: true, message: 'Receipt updated' });
  } catch (err) {
    console.error('Update receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Validate Receipt → Increase Stock ────────────
router.post('/:id/validate', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const receipt = await client.query('SELECT * FROM receipts WHERE id = $1 AND status = $2', [req.params.id, 'draft']);
    if (receipt.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Receipt not found or already validated' });
    }

    const lines = await client.query('SELECT * FROM receipt_lines WHERE receipt_id = $1', [req.params.id]);

    // Get a default location for this warehouse
    const locResult = await client.query(
      'SELECT id FROM locations WHERE warehouse_id = $1 LIMIT 1',
      [receipt.rows[0].warehouse_id]
    );
    if (locResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No location found for this warehouse' });
    }
    const locationId = locResult.rows[0].id;

    for (const line of lines.rows) {
      const qty = line.received_qty || line.expected_qty;

      // Upsert stock level
      await client.query(
        `INSERT INTO stock_levels (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = stock_levels.quantity + $4, updated_at = NOW()`,
        [uuidv4(), line.product_id, locationId, qty]
      );

      // Get new quantity for ledger
      const slResult = await client.query(
        'SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [line.product_id, locationId]
      );

      // Log to stock ledger
      await client.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, txn_type, txn_ref, qty_change, qty_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), line.product_id, locationId, 'receipt', receipt.rows[0].reference, qty, slResult.rows[0].quantity]
      );
    }

    await client.query(
      'UPDATE receipts SET status = $1, validated_at = NOW() WHERE id = $2',
      ['done', req.params.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, message: 'Receipt validated. Stock increased.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Validate receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
