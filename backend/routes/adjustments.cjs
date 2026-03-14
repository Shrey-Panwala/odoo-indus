const express = require('express')
const { db } = require('../database.cjs')

const router = express.Router()

router.get('/', (_req, res) => {
  db.all(
    'SELECT a.*, p.name AS product_name FROM adjustments a LEFT JOIN products p ON a.product_id = p.id ORDER BY a.id DESC',
    (error, rows) => {
      if (error) return res.status(500).json({ error: error.message })
      return res.json(rows)
    },
  )
})

module.exports = router