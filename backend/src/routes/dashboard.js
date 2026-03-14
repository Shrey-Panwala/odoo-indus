const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

const OP_STATUS_ORDER = ['draft', 'waiting', 'ready', 'done', 'canceled'];
const DOC_TYPE_TO_TXN = {
  receipts: ['receipt'],
  deliveries: ['delivery'],
  transfers: ['transfer_in', 'transfer_out'],
  adjustments: ['adjustment'],
};

function mapStatusRows(rows) {
  const statusMap = new Map((rows || []).map((row) => [row.status, Number(row.count || 0)]));
  return OP_STATUS_ORDER.map((status) => ({ status, count: statusMap.get(status) || 0 }));
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function countStatuses(rows) {
  const counts = new Map();
  for (const row of rows || []) {
    counts.set(row.status, (counts.get(row.status) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

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

// ──────────── Dashboard Analytics (for charts) ────────────
router.get('/analytics', auth, async (req, res) => {
  try {
    const documentType = req.query.documentType || 'all';
    const warehouse = req.query.warehouse || 'all';
    const category = req.query.category || 'all';
    const movementType = req.query.movementType || 'all';
    const parsedDays = Number.parseInt(req.query.dayWindow, 10);
    const dayWindow = Number.isNaN(parsedDays) ? 14 : Math.max(7, Math.min(parsedDays, 30));

    const selectedTxnTypes = movementType !== 'all'
      ? [movementType]
      : (documentType !== 'all' ? (DOC_TYPE_TO_TXN[documentType] || []) : []);

    const [
      stockRows,
      receiptDocs,
      deliveryDocs,
      transferDocs,
      adjustmentDocs,
      ledgerRows,
    ] = await Promise.all([
      pool.query(`
        SELECT p.id AS product_id,
               p.name AS product,
               p.sku,
               COALESCE(c.name, 'Uncategorized') AS category,
               w.name AS warehouse,
               l.name AS location,
               COALESCE(sl.quantity, 0)::int AS quantity
        FROM stock_levels sl
        JOIN products p ON p.id = sl.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        JOIN locations l ON l.id = sl.location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        WHERE p.is_deleted = FALSE
      `),
      pool.query(`
        SELECT r.id,
               r.status,
               w.name AS warehouse,
               r.created_at,
               COALESCE(
                 ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(c.name, 'Uncategorized')), NULL),
                 ARRAY[]::text[]
               ) AS categories
        FROM receipts r
        JOIN warehouses w ON w.id = r.warehouse_id
        LEFT JOIN receipt_lines rl ON rl.receipt_id = r.id
        LEFT JOIN products p ON p.id = rl.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        GROUP BY r.id, r.status, w.name, r.created_at
      `),
      pool.query(`
        SELECT d.id,
               d.status,
               w.name AS warehouse,
               d.created_at,
               COALESCE(
                 ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(c.name, 'Uncategorized')), NULL),
                 ARRAY[]::text[]
               ) AS categories
        FROM delivery_orders d
        JOIN warehouses w ON w.id = d.warehouse_id
        LEFT JOIN delivery_lines dl ON dl.delivery_id = d.id
        LEFT JOIN products p ON p.id = dl.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        GROUP BY d.id, d.status, w.name, d.created_at
      `),
      pool.query(`
        SELECT t.id,
               t.status,
               fw.name AS warehouse,
               t.created_at,
               COALESCE(
                 ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(c.name, 'Uncategorized')), NULL),
                 ARRAY[]::text[]
               ) AS categories
        FROM internal_transfers t
        JOIN locations fl ON fl.id = t.from_location
        JOIN warehouses fw ON fw.id = fl.warehouse_id
        LEFT JOIN transfer_lines tl ON tl.transfer_id = t.id
        LEFT JOIN products p ON p.id = tl.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        GROUP BY t.id, t.status, fw.name, t.created_at
      `),
      pool.query(`
        SELECT a.id,
               a.status,
               w.name AS warehouse,
               a.created_at,
               COALESCE(
                 ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(c.name, 'Uncategorized')), NULL),
                 ARRAY[]::text[]
               ) AS categories
        FROM stock_adjustments a
        JOIN locations l ON l.id = a.location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        LEFT JOIN adjustment_lines al ON al.adjustment_id = a.id
        LEFT JOIN products p ON p.id = al.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        GROUP BY a.id, a.status, w.name, a.created_at
      `),
      pool.query(`
        SELECT sl.txn_type,
               sl.qty_change::int AS qty_change,
               sl.created_at,
               COALESCE(c.name, 'Uncategorized') AS category,
               w.name AS warehouse,
               l.name AS location
        FROM stock_ledger sl
        JOIN products p ON p.id = sl.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        JOIN locations l ON l.id = sl.location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        WHERE p.is_deleted = FALSE
          AND sl.created_at >= date_trunc('day', NOW()) - interval '30 days'
      `),
    ]);

    const warehouseMatches = (name) => warehouse === 'all' || name === warehouse;
    const categoryMatches = (name) => category === 'all' || name === category;
    const categoryArrayMatches = (arr) => category === 'all' || (arr || []).includes(category);

    const filteredStockRows = stockRows.rows.filter((row) =>
      warehouseMatches(row.warehouse) && categoryMatches(row.category),
    );

    const productMap = new Map();
    const categoryMap = new Map();
    const warehouseMap = new Map();
    const locationMap = new Map();

    for (const row of filteredStockRows) {
      const qty = Number(row.quantity || 0);
      const productKey = `${row.product_id}::${row.product}::${row.sku}::${row.category}`;
      productMap.set(productKey, (productMap.get(productKey) || 0) + qty);
      categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + qty);
      warehouseMap.set(row.warehouse, (warehouseMap.get(row.warehouse) || 0) + qty);
      const locationKey = `${row.warehouse}::${row.location}`;
      locationMap.set(locationKey, (locationMap.get(locationKey) || 0) + qty);
    }

    const topProducts = Array.from(productMap.entries())
      .map(([key, stock]) => {
        const [product_id, product, sku, productCategory] = key.split('::');
        return { product_id, product, sku, category: productCategory, stock };
      })
      .sort((a, b) => b.stock - a.stock || a.product.localeCompare(b.product))
      .slice(0, 10);

    const productsByCategory = Array.from(categoryMap.entries())
      .map(([cat, stock]) => ({ category: cat, stock }))
      .sort((a, b) => b.stock - a.stock || a.category.localeCompare(b.category));

    const stockByWarehouse = Array.from(warehouseMap.entries())
      .map(([name, stock]) => ({ warehouse: name, stock }))
      .sort((a, b) => b.stock - a.stock || a.warehouse.localeCompare(b.warehouse));

    const locationHeatmap = Array.from(locationMap.entries())
      .map(([key, stock]) => {
        const [warehouseName, locationName] = key.split('::');
        return { warehouse: warehouseName, location: locationName, stock };
      })
      .sort((a, b) => b.stock - a.stock || a.warehouse.localeCompare(b.warehouse) || a.location.localeCompare(b.location))
      .slice(0, 12);

    const opDocs = {
      receipts: receiptDocs.rows,
      deliveries: deliveryDocs.rows,
      transfers: transferDocs.rows,
      adjustments: adjustmentDocs.rows,
    };

    const filteredOpDocs = {
      receipts: opDocs.receipts.filter((row) => warehouseMatches(row.warehouse) && categoryArrayMatches(row.categories)),
      deliveries: opDocs.deliveries.filter((row) => warehouseMatches(row.warehouse) && categoryArrayMatches(row.categories)),
      transfers: opDocs.transfers.filter((row) => warehouseMatches(row.warehouse) && categoryArrayMatches(row.categories)),
      adjustments: opDocs.adjustments.filter((row) => warehouseMatches(row.warehouse) && categoryArrayMatches(row.categories)),
    };

    const selectedDocKeys = documentType === 'all'
      ? ['receipts', 'deliveries', 'transfers', 'adjustments']
      : [documentType].filter((key) => filteredOpDocs[key]);

    const statusAccumulator = new Map();
    for (const key of selectedDocKeys) {
      for (const row of filteredOpDocs[key]) {
        const prev = statusAccumulator.get(row.status) || 0;
        statusAccumulator.set(row.status, prev + 1);
      }
    }

    const statusDistribution = mapStatusRows(
      Array.from(statusAccumulator.entries()).map(([status, count]) => ({ status, count })),
    );

    const statusByDocument = {
      receipts: mapStatusRows(countStatuses(filteredOpDocs.receipts)),
      deliveries: mapStatusRows(countStatuses(filteredOpDocs.deliveries)),
      transfers: mapStatusRows(countStatuses(filteredOpDocs.transfers)),
      adjustments: mapStatusRows(countStatuses(filteredOpDocs.adjustments)),
    };

    const filteredLedgerRows = ledgerRows.rows.filter((row) => {
      if (!warehouseMatches(row.warehouse) || !categoryMatches(row.category)) return false;
      if (selectedTxnTypes.length > 0 && !selectedTxnTypes.includes(row.txn_type)) return false;
      return true;
    });

    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (dayWindow - 1));

    const dateKeys = [];
    const dailyMap = new Map();
    for (let i = 0; i < dayWindow; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateKeys.push(key);
      dailyMap.set(key, { incoming: 0, outgoing: 0, net: 0 });
    }

    const movementMap = new Map();
    for (const row of filteredLedgerRows) {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      const qtyChange = Number(row.qty_change || 0);
      if (dailyMap.has(key)) {
        const bucket = dailyMap.get(key);
        if (qtyChange > 0) bucket.incoming += qtyChange;
        if (qtyChange < 0) bucket.outgoing += Math.abs(qtyChange);
        bucket.net += qtyChange;
      }

      const movement = movementMap.get(row.txn_type) || { txn_type: row.txn_type, count: 0, volume: 0 };
      movement.count += 1;
      movement.volume += Math.abs(qtyChange);
      movementMap.set(row.txn_type, movement);
    }

    const ledgerDailyFlow = dateKeys.map((key) => {
      const dateObj = new Date(`${key}T00:00:00`);
      const dayLabel = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const bucket = dailyMap.get(key);
      return {
        day: dayLabel,
        incoming: bucket.incoming,
        outgoing: bucket.outgoing,
        net: bucket.net,
      };
    });

    const movementMix = Array.from(movementMap.values())
      .sort((a, b) => b.volume - a.volume || a.txn_type.localeCompare(b.txn_type));

    const allWarehouses = uniqueSorted(stockRows.rows.map((row) => row.warehouse));
    const allCategories = uniqueSorted(stockRows.rows.map((row) => row.category));

    res.json({
      productsByCategory,
      stockByWarehouse,
      topProducts,
      statusDistribution,
      statusByDocument,
      ledgerDailyFlow,
      movementMix,
      locationHeatmap,
      filterOptions: {
        warehouses: allWarehouses,
        categories: allCategories,
        movementTypes: ['receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment'],
      },
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
