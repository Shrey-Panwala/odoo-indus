const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── Full Stock Ledger with Filters ────────────
router.get('/', auth, async (req, res) => {
  try {
    const { productId, locationId, txnType, startDate, endDate, limit } = req.query;
    let sql = `
      SELECT sl.*, p.name AS product_name, p.sku,
             l.name AS location_name, w.name AS warehouse_name
      FROM stock_ledger sl
      JOIN products p ON p.id = sl.product_id
      JOIN locations l ON l.id = sl.location_id
      JOIN warehouses w ON w.id = l.warehouse_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (productId) { sql += ` AND sl.product_id = $${idx++}`; params.push(productId); }
    if (locationId) { sql += ` AND sl.location_id = $${idx++}`; params.push(locationId); }
    if (txnType) { sql += ` AND sl.txn_type = $${idx++}`; params.push(txnType); }
    if (startDate) { sql += ` AND sl.created_at >= $${idx++}`; params.push(startDate); }
    if (endDate) { sql += ` AND sl.created_at <= $${idx++}`; params.push(endDate); }

    sql += ` ORDER BY sl.created_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit) || 100);

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Ledger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
