const express = require('express')
const cors = require('cors')
const { db, init } = require('./database.cjs')

const productsRouter = require('./routes/products.cjs')
const receiptsRouter = require('./routes/receipts.cjs')
const deliveriesRouter = require('./routes/deliveries.cjs')
const adjustmentsRouter = require('./routes/adjustments.cjs')
const operationsRouter = require('./routes/operations.cjs')

const app = express()

app.use(cors())
app.use(express.json())

init()

app.use('/api/products', productsRouter)
app.use('/api/receipts', receiptsRouter)
app.use('/api/deliveries', deliveriesRouter)
app.use('/api/adjustments', adjustmentsRouter)
app.use('/api/operations', operationsRouter)

app.get('/api/dashboard/stats', (_req, res) => {
  const stats = {}

  db.serialize(() => {
    db.get('SELECT SUM(stock) AS total_stock, COUNT(*) AS total_products FROM products', (error, productsRow) => {
      if (error) return res.status(500).json({ error: error.message })

      stats.totalProductsInStock = productsRow?.total_stock || 0
      stats.totalProducts = productsRow?.total_products || 0

      db.get('SELECT COUNT(1) AS low_stock FROM products WHERE stock < 10', (lowStockError, lowStockRow) => {
        if (lowStockError) return res.status(500).json({ error: lowStockError.message })

        stats.lowStockItems = lowStockRow?.low_stock || 0

        db.get("SELECT COUNT(1) AS pending_receipts FROM receipts WHERE status IN ('waiting','late')", (receiptsError, receiptsRow) => {
          if (receiptsError) return res.status(500).json({ error: receiptsError.message })

          stats.pendingReceipts = receiptsRow?.pending_receipts || 0

          db.get("SELECT COUNT(1) AS pending_deliveries FROM deliveries WHERE status IN ('waiting','late')", (deliveriesError, deliveriesRow) => {
            if (deliveriesError) return res.status(500).json({ error: deliveriesError.message })

            stats.pendingDeliveries = deliveriesRow?.pending_deliveries || 0

            db.get('SELECT COUNT(1) AS transfers FROM adjustments', (adjustmentsError, adjustmentsRow) => {
              if (adjustmentsError) return res.status(500).json({ error: adjustmentsError.message })

              stats.internalTransfers = adjustmentsRow?.transfers || 0
              stats.asOf = new Date().toISOString()
              return res.json(stats)
            })
          })
        })
      })
    })
  })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Inventory API running on http://localhost:${PORT}`)
})