const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ──────────── List Warehouses ────────────
router.get('/', auth, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM warehouses ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('List warehouses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Create Warehouse ────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Warehouse name is required' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO warehouses (id, name, address) VALUES ($1, $2, $3)',
      [id, name, address || null]
    );
    const result = await pool.query('SELECT * FROM warehouses WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create warehouse error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── List Locations in Warehouse ────────────
router.get('/:id/locations', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM locations WHERE warehouse_id = $1 ORDER BY zone, name',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List locations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────── Create Location ────────────
// Mounted at /api/locations
router.post('/create', auth, async (req, res) => {
  try {
    const { warehouseId, name, zone } = req.body;
    if (!warehouseId || !name) return res.status(400).json({ error: 'warehouseId and name are required' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO locations (id, warehouse_id, name, zone) VALUES ($1, $2, $3, $4)',
      [id, warehouseId, name, zone || null]
    );
    const result = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
