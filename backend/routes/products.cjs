const express = require('express')
const { db } = require('../database.cjs')

const router = express.Router()

function mapProduct(row) {
  if (!row) return row

  const onHand = Number(row.stock || 0)
  const reserved = Number(row.reserved_qty || 0)
  return {
    ...row,
    stock: onHand,
    on_hand: onHand,
    unit_cost: Number(row.unit_cost || 0),
    reserved_qty: reserved,
    free_to_use: Math.max(onHand - reserved, 0),
  }
}

function getProductById(id, callback) {
  db.get('SELECT * FROM products WHERE id = ?', [id], (error, row) => {
    if (error) return callback(error)
    return callback(null, mapProduct(row))
  })
}

router.get('/', (_req, res) => {
  db.all('SELECT * FROM products ORDER BY id DESC', (error, rows) => {
    if (error) return res.status(500).json({ error: error.message })
    return res.json(rows.map(mapProduct))
  })
})

router.get('/:id', (req, res) => {
  getProductById(req.params.id, (error, row) => {
    if (error) return res.status(500).json({ error: error.message })
    if (!row) return res.status(404).json({ error: 'Product not found' })
    return res.json(row)
  })
})

router.patch('/:id', (req, res) => {
  const productId = Number(req.params.id)
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product id' })
  }

  const { onHand, unitCost, reservedQty, location } = req.body || {}
  if (onHand === undefined && unitCost === undefined && reservedQty === undefined && location === undefined) {
    return res.status(400).json({ error: 'No fields provided to update' })
  }

  getProductById(productId, (error, product) => {
    if (error) return res.status(500).json({ error: error.message })
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const nextOnHand = onHand === undefined ? Number(product.on_hand || 0) : Number(onHand)
    const nextUnitCost = unitCost === undefined ? Number(product.unit_cost || 0) : Number(unitCost)
    const nextReservedQty = reservedQty === undefined ? Number(product.reserved_qty || 0) : Number(reservedQty)
    const nextLocation = location === undefined ? product.location : String(location).trim()

    if (!Number.isFinite(nextOnHand) || nextOnHand < 0) {
      return res.status(400).json({ error: 'On hand quantity must be a non-negative number' })
    }
    if (!Number.isFinite(nextUnitCost) || nextUnitCost < 0) {
      return res.status(400).json({ error: 'Unit cost must be a non-negative number' })
    }
    if (!Number.isFinite(nextReservedQty) || nextReservedQty < 0) {
      return res.status(400).json({ error: 'Reserved quantity must be a non-negative number' })
    }
    if (nextReservedQty > nextOnHand) {
      return res.status(400).json({ error: 'Reserved quantity cannot exceed on hand quantity' })
    }

    db.run(
      'UPDATE products SET stock = ?, unit_cost = ?, reserved_qty = ?, location = ? WHERE id = ?',
      [Math.floor(nextOnHand), Number(nextUnitCost), Math.floor(nextReservedQty), nextLocation, productId],
      (updateError) => {
        if (updateError) return res.status(500).json({ error: updateError.message })

        return getProductById(productId, (fetchError, updatedProduct) => {
          if (fetchError) return res.status(500).json({ error: fetchError.message })
          return res.json(updatedProduct)
        })
      },
    )
  })
})

router.post('/:id/adjust', (req, res) => {
  const productId = Number(req.params.id)
  const delta = Number(req.body?.delta)
  const reason = req.body?.reason ? String(req.body.reason) : 'manual adjustment'

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product id' })
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ error: 'Adjustment delta must be a non-zero number' })
  }

  getProductById(productId, (error, product) => {
    if (error) return res.status(500).json({ error: error.message })
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const nextOnHand = Number(product.on_hand || 0) + Number(delta)
    if (nextOnHand < 0) {
      return res.status(400).json({ error: 'Adjustment would make stock negative' })
    }

    const nextReservedQty = Math.min(Number(product.reserved_qty || 0), nextOnHand)

    db.run(
      'UPDATE products SET stock = ?, reserved_qty = ? WHERE id = ?',
      [Math.floor(nextOnHand), Math.floor(nextReservedQty), productId],
      (updateError) => {
        if (updateError) return res.status(500).json({ error: updateError.message })

        db.run(
          'INSERT INTO adjustments (product_id, difference, reason) VALUES (?, ?, ?)',
          [productId, Math.floor(delta), reason],
          (adjustmentError) => {
            if (adjustmentError) return res.status(500).json({ error: adjustmentError.message })

            return getProductById(productId, (fetchError, updatedProduct) => {
              if (fetchError) return res.status(500).json({ error: fetchError.message })
              return res.json(updatedProduct)
            })
          },
        )
      },
    )
  })
})

module.exports = router