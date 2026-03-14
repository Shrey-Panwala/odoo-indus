const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── Dashboard KPIs ────────────
router.get('/kpis', auth, async (_req, res) => {
  try {
    const [products, lowStock, outOfStock, pendingReceipts, pendingDeliveries, scheduledTransfers] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM products WHERE is_deleted = FALSE`),
      pool.query(`
        SELECT COUNT(DISTINCT p.id)::int AS count
        FROM products p
        JOIN stock_levels sl ON sl.product_id = p.id
        WHERE p.is_deleted = FALSE
        GROUP BY p.id, p.reorder_point
        HAVING SUM(sl.quantity) <= p.reorder_point AND SUM(sl.quantity) > 0
      `),
      pool.query(`
        SELECT COUNT(DISTINCT p.id)::int AS count
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE p.is_deleted = FALSE
        GROUP BY p.id
        HAVING COALESCE(SUM(sl.quantity), 0) = 0
      `),
      pool.query(`SELECT COUNT(*)::int AS count FROM receipts WHERE status = 'draft'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM delivery_orders WHERE status = 'draft'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM internal_transfers WHERE status = 'draft'`),
    ]);

    res.json({
      totalProducts: products.rows[0].count,
      lowStockItems: lowStock.rows.length,
      outOfStockItems: outOfStock.rows.length,
      pendingReceipts: pendingReceipts.rows[0].count,
      pendingDeliveries: pendingDeliveries.rows[0].count,
      scheduledTransfers: scheduledTransfers.rows[0].count,
    });
  } catch (err) {
    console.error('Dashboard KPIs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Low Stock Alerts (built-in, replaces n8n) ────────────
router.get('/alerts', auth, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.sku, p.reorder_point, p.reorder_qty,
             c.name AS category_name,
             COALESCE(SUM(sl.quantity), 0)::int AS total_stock,
             CASE
               WHEN COALESCE(SUM(sl.quantity), 0) = 0 THEN 'out_of_stock'
               WHEN COALESCE(SUM(sl.quantity), 0) <= p.reorder_point THEN 'low_stock'
             END AS alert_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      WHERE p.is_deleted = FALSE
      GROUP BY p.id, p.name, p.sku, p.reorder_point, p.reorder_qty, c.name
      HAVING COALESCE(SUM(sl.quantity), 0) <= p.reorder_point
      ORDER BY COALESCE(SUM(sl.quantity), 0) ASC
    `);

    res.json({
      count: result.rows.length,
      alerts: result.rows,
    });
  } catch (err) {
    console.error('Dashboard alerts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Recent Activity (stock ledger last 20) ────────────
router.get('/recent-activity', auth, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT sl.*, p.name AS product_name, p.sku,
             l.name AS location_name, w.name AS warehouse_name
      FROM stock_ledger sl
      JOIN products p ON p.id = sl.product_id
      JOIN locations l ON l.id = sl.location_id
      JOIN warehouses w ON w.id = l.warehouse_id
      ORDER BY sl.created_at DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
