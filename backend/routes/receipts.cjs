const express = require('express')
const { db } = require('../database.cjs')

const router = express.Router()

router.get('/', (_req, res) => {
  db.all(
    'SELECT r.*, p.name AS product_name FROM receipts r LEFT JOIN products p ON r.product_id = p.id ORDER BY r.schedule_date DESC',
    (error, rows) => {
      if (error) return res.status(500).json({ error: error.message })
      return res.json(rows)
    },
  )
})

module.exports = router