const express = require('express')
const { db } = require('../database.cjs')

const router = express.Router()

router.get('/', (_req, res) => {
  db.all(
    'SELECT d.*, p.name AS product_name FROM deliveries d LEFT JOIN products p ON d.product_id = p.id ORDER BY d.schedule_date DESC',
    (error, rows) => {
      if (error) return res.status(500).json({ error: error.message })
      return res.json(rows)
    },
  )
})

module.exports = router