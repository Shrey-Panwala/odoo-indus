const express = require('express')
const { db } = require('../database.cjs')

const router = express.Router()

router.get('/', (_req, res) => {
  db.all('SELECT * FROM products ORDER BY id DESC', (error, rows) => {
    if (error) return res.status(500).json({ error: error.message })
    return res.json(rows)
  })
})

router.get('/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (error, row) => {
    if (error) return res.status(500).json({ error: error.message })
    return res.json(row)
  })
})

module.exports = router