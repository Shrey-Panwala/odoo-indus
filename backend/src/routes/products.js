const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── List Products ────────────
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, lowStock } = req.query;
    let sql = `
      SELECT p.*, c.name AS category_name,
             COALESCE(SUM(sl.quantity), 0)::int AS total_stock,
             COALESCE(
               STRING_AGG(
                 DISTINCT (w.name || ' / ' || l.name),
                 ', '
               ) FILTER (WHERE l.id IS NOT NULL),
               'Not assigned'
             ) AS location
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      LEFT JOIN locations l ON l.id = sl.location_id
      LEFT JOIN warehouses w ON w.id = l.warehouse_id
      WHERE p.is_deleted = FALSE
    `;
    const params = [];
    let idx = 1;

    if (category) {
      sql += ` AND p.category_id = $${idx++}`;
      params.push(category);
    }
    if (search) {
      sql += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ' GROUP BY p.id, c.name';

    if (lowStock === 'true') {
      sql += ' HAVING COALESCE(SUM(sl.quantity), 0) <= p.reorder_point';
    }

    sql += ' ORDER BY p.name';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Get Single Product with Stock Breakdown ────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND p.is_deleted = FALSE`,
      [req.params.id]
    );
    if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const stockLevels = await pool.query(
      `SELECT sl.*, l.name AS location_name, w.name AS warehouse_name
       FROM stock_levels sl
       JOIN locations l ON l.id = sl.location_id
       JOIN warehouses w ON w.id = l.warehouse_id
       WHERE sl.product_id = $1
       ORDER BY w.name, l.name`,
      [req.params.id]
    );

    res.json({ ...product.rows[0], stockLevels: stockLevels.rows });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Create Product ────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, sku, categoryId, unitOfMeasure, reorderPoint, reorderQty } = req.body;
    if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required' });

    const id = uuidv4();
    await pool.query(
      `INSERT INTO products (id, name, sku, category_id, unit_of_measure, reorder_point, reorder_qty)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, sku, categoryId || null, unitOfMeasure || 'units', reorderPoint || 10, reorderQty || 50]
    );

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Update Product ────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, sku, categoryId, unitOfMeasure, reorderPoint, reorderQty } = req.body;
    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           sku = COALESCE($2, sku),
           category_id = COALESCE($3, category_id),
           unit_of_measure = COALESCE($4, unit_of_measure),
           reorder_point = COALESCE($5, reorder_point),
           reorder_qty = COALESCE($6, reorder_qty)
       WHERE id = $7 AND is_deleted = FALSE
       RETURNING *`,
      [name, sku, categoryId, unitOfMeasure, reorderPoint, reorderQty, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Soft-Delete Product ────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE products SET is_deleted = TRUE WHERE id = $1 AND is_deleted = FALSE RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Categories ────────────
router.get('/categories/list', auth, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO categories (id, name, description) VALUES ($1, $2, $3)',
      [id, name, description || null]
    );
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category name already exists' });
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
