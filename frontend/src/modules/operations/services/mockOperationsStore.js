const STORE_KEY = 'odoo.inventory.operations.v1'

const baseSeed = {
  suppliers: [
    { id: 1, name: 'Apex Supplies' },
    { id: 2, name: 'Nirma Industrial Vendor' },
    { id: 3, name: 'Blue Cart Logistics' },
  ],
  warehouses: [
    { id: 1, name: 'Main Warehouse', default_location_id: 1 },
    { id: 2, name: 'Spare Warehouse', default_location_id: 3 },
  ],
  locations: [
    { id: 1, name: 'A1 Rack', warehouse_id: 1 },
    { id: 2, name: 'A2 Rack', warehouse_id: 1 },
    { id: 3, name: 'B1 Rack', warehouse_id: 2 },
  ],
  products: [
    { id: 1, name: 'Desk', sku: 'DSK-001' },
    { id: 2, name: 'Table', sku: 'TBL-001' },
    { id: 3, name: 'Chair', sku: 'CHR-001' },
    { id: 4, name: 'Monitor', sku: 'MNT-001' },
    { id: 5, name: 'Keyboard', sku: 'KBD-001' },
  ],
  stock_levels: [
    { product_id: 1, location_id: 1, quantity: 50 },
    { product_id: 2, location_id: 1, quantity: 50 },
    { product_id: 3, location_id: 2, quantity: 80 },
    { product_id: 4, location_id: 3, quantity: 35 },
    { product_id: 5, location_id: 3, quantity: 90 },
  ],
  receipts: [
    {
      id: 1,
      reference: 'RCPT-20260314-1001',
      supplier_id: 1,
      warehouse_id: 1,
      status: 'Waiting',
      created_by: 'Shrey',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      validated_at: null,
    },
  ],
  receipt_lines: [
    { id: 1, receipt_id: 1, product_id: 1, expected_qty: 10, received_qty: 4 },
    { id: 2, receipt_id: 1, product_id: 2, expected_qty: 8, received_qty: 4 },
  ],
  delivery_orders: [
    {
      id: 1,
      reference: 'DO-20260314-2001',
      customer_name: 'Nirma Campus Store',
      warehouse_id: 1,
      status: 'Ready',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      validated_at: null,
    },
  ],
  delivery_lines: [
    { id: 1, delivery_id: 1, product_id: 3, quantity: 5 },
    { id: 2, delivery_id: 1, product_id: 1, quantity: 3 },
  ],
  stock_adjustments: [],
  adjustment_lines: [],
  stock_ledger: [],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadStore() {
  const raw = window.localStorage.getItem(STORE_KEY)
  if (!raw) {
    const seeded = clone(baseSeed)
    window.localStorage.setItem(STORE_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    return JSON.parse(raw)
  } catch (_error) {
    const seeded = clone(baseSeed)
    window.localStorage.setItem(STORE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

function saveStore(store) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => Number(item.id || 0))) + 1 : 1
}

function getLocationForWarehouse(store, warehouseId) {
  const warehouse = store.warehouses.find((item) => Number(item.id) === Number(warehouseId))
  if (!warehouse) return null
  if (warehouse.default_location_id) return Number(warehouse.default_location_id)

  const fallback = store.locations.find((location) => Number(location.warehouse_id) === Number(warehouseId))
  return fallback ? Number(fallback.id) : null
}

function upsertStockLevel(store, productId, locationId, quantityDelta = 0, absoluteQuantity) {
  const idx = store.stock_levels.findIndex(
    (item) => Number(item.product_id) === Number(productId) && Number(item.location_id) === Number(locationId),
  )

  if (idx < 0) {
    const initial = absoluteQuantity === undefined ? Math.max(quantityDelta, 0) : Math.max(absoluteQuantity, 0)
    store.stock_levels.push({
      product_id: Number(productId),
      location_id: Number(locationId),
      quantity: Number(initial),
    })
    return Number(initial)
  }

  const current = Number(store.stock_levels[idx].quantity || 0)
  const nextQuantity = absoluteQuantity === undefined ? current + Number(quantityDelta) : Number(absoluteQuantity)
  if (nextQuantity < 0) {
    throw new Error('Insufficient stock for product')
  }

  store.stock_levels[idx].quantity = nextQuantity
  return nextQuantity
}

function insertLedger(store, payload) {
  store.stock_ledger.push({
    id: nextId(store.stock_ledger),
    product_id: Number(payload.product_id),
    location_id: Number(payload.location_id),
    txn_type: payload.txn_type,
    txn_ref: payload.txn_ref,
    qty_change: Number(payload.qty_change),
    qty_after: Number(payload.qty_after),
    created_at: new Date().toISOString(),
  })
}

function runTransaction(callback) {
  const original = loadStore()
  const working = clone(original)
  const result = callback(working)
  saveStore(working)
  return result
}

function paginate(rows, page = 1, pageSize = 10) {
  const safePage = Math.max(Number(page) || 1, 1)
  const safePageSize = Math.max(Number(pageSize) || 10, 1)
  const start = (safePage - 1) * safePageSize
  return {
    rows: rows.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total: rows.length,
  }
}

function sortRows(rows, sortBy, sortDir) {
  const direction = String(sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1
  const key = sortBy || 'created_at'
  return [...rows].sort((a, b) => {
    const x = a[key]
    const y = b[key]
    if (x === y) return 0
    return x > y ? direction : -direction
  })
}

export const mockOperationsStore = {
  getSuppliers() {
    return loadStore().suppliers
  },

  getWarehouses() {
    return loadStore().warehouses
  },

  getProducts() {
    return loadStore().products
  },

  getLocations(warehouseId) {
    const rows = loadStore().locations
    if (!warehouseId) return rows
    return rows.filter((row) => Number(row.warehouse_id) === Number(warehouseId))
  },

  getProductAvailableStock(productId, warehouseId) {
    const store = loadStore()
    const locationIds = store.locations
      .filter((location) => !warehouseId || Number(location.warehouse_id) === Number(warehouseId))
      .map((location) => Number(location.id))

    return store.stock_levels
      .filter((stock) => Number(stock.product_id) === Number(productId) && locationIds.includes(Number(stock.location_id)))
      .reduce((sum, stock) => sum + Number(stock.quantity || 0), 0)
  },

  getProductStockByLocation(productId, locationId) {
    const store = loadStore()
    return store.stock_levels
      .filter((stock) => Number(stock.product_id) === Number(productId) && Number(stock.location_id) === Number(locationId))
      .reduce((sum, stock) => sum + Number(stock.quantity || 0), 0)
  },

  listReceipts({ search = '', status = '', page = 1, pageSize = 10, sortBy = 'created_at', sortDir = 'desc' }) {
    const store = loadStore()
    const rows = store.receipts
      .map((receipt) => {
        const supplier = store.suppliers.find((s) => Number(s.id) === Number(receipt.supplier_id))
        const warehouse = store.warehouses.find((w) => Number(w.id) === Number(receipt.warehouse_id))
        return {
          ...receipt,
          supplier_name: supplier?.name || 'Unknown Supplier',
          warehouse_name: warehouse?.name || 'Unknown Warehouse',
        }
      })
      .filter((row) => {
        const text = `${row.reference} ${row.supplier_name}`.toLowerCase()
        return text.includes(String(search).toLowerCase()) && (!status || row.status === status)
      })

    return paginate(sortRows(rows, sortBy, sortDir), page, pageSize)
  },

  createReceipt(payload) {
    return runTransaction((store) => {
      if (!payload?.supplier_id || !payload?.warehouse_id || !Array.isArray(payload.lines) || !payload.lines.length) {
        throw new Error('Supplier, warehouse and lines are required')
      }

      payload.lines.forEach((line) => {
        if (!line.product_id || Number(line.expected_qty) <= 0 || Number(line.received_qty) < 0) {
          throw new Error('Invalid receipt line values')
        }
        if (Number(line.received_qty) > Number(line.expected_qty)) {
          throw new Error('Received quantity cannot exceed expected quantity')
        }
      })

      const receiptId = nextId(store.receipts)
      const reference = `RCPT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(receiptId).padStart(4, '0')}`

      store.receipts.push({
        id: receiptId,
        reference,
        supplier_id: Number(payload.supplier_id),
        warehouse_id: Number(payload.warehouse_id),
        schedule_date: payload.schedule_date || new Date().toISOString().slice(0, 10),
        status: 'Draft',
        created_by: payload.created_by || 'system',
        created_at: new Date().toISOString(),
        validated_at: null,
      })

      payload.lines.forEach((line) => {
        store.receipt_lines.push({
          id: nextId(store.receipt_lines),
          receipt_id: receiptId,
          product_id: Number(line.product_id),
          expected_qty: Number(line.expected_qty),
          received_qty: Number(line.received_qty),
        })
      })

      return { id: receiptId, reference }
    })
  },

  getReceipt(id) {
    const store = loadStore()
    const receipt = store.receipts.find((item) => Number(item.id) === Number(id))
    if (!receipt) throw new Error('Receipt not found')

    const supplier = store.suppliers.find((item) => Number(item.id) === Number(receipt.supplier_id))
    const warehouse = store.warehouses.find((item) => Number(item.id) === Number(receipt.warehouse_id))

    const lines = store.receipt_lines
      .filter((line) => Number(line.receipt_id) === Number(id))
      .map((line) => {
        const product = store.products.find((item) => Number(item.id) === Number(line.product_id))
        return {
          ...line,
          product_name: product?.name || 'Unknown Product',
          sku: product?.sku || '-',
        }
      })

    return {
      ...receipt,
      supplier_name: supplier?.name || 'Unknown Supplier',
      warehouse_name: warehouse?.name || 'Unknown Warehouse',
      lines,
    }
  },

  updateReceipt(id, payload) {
    return runTransaction((store) => {
      const receipt = store.receipts.find((item) => Number(item.id) === Number(id))
      if (!receipt) throw new Error('Receipt not found')

      if (payload?.supplier_id) receipt.supplier_id = Number(payload.supplier_id)
      if (payload?.warehouse_id) receipt.warehouse_id = Number(payload.warehouse_id)
      if (payload?.schedule_date) receipt.schedule_date = payload.schedule_date
      if (payload?.created_by) receipt.created_by = payload.created_by

      if (Array.isArray(payload?.lines)) {
        store.receipt_lines = store.receipt_lines.filter((line) => Number(line.receipt_id) !== Number(id))
        payload.lines.forEach((line) => {
          store.receipt_lines.push({
            id: nextId(store.receipt_lines),
            receipt_id: Number(id),
            product_id: Number(line.product_id),
            expected_qty: Number(line.expected_qty),
            received_qty: Number(line.received_qty),
          })
        })
      }

      return { ok: true }
    })
  },

  validateReceipt(id) {
    return runTransaction((store) => {
      const receipt = store.receipts.find((item) => Number(item.id) === Number(id))
      if (!receipt) throw new Error('Receipt not found')
      if (String(receipt.status).toLowerCase() === 'done' || receipt.validated_at) {
        throw new Error('Receipt is already validated')
      }

      const lines = store.receipt_lines.filter((line) => Number(line.receipt_id) === Number(id))
      if (!lines.length) throw new Error('Receipt must include at least one line')

      const locationId = getLocationForWarehouse(store, receipt.warehouse_id)
      if (!locationId) throw new Error('Warehouse default location not found')

      lines.forEach((line) => {
        if (Number(line.received_qty) > Number(line.expected_qty)) {
          throw new Error('Received quantity cannot exceed expected quantity')
        }

        const qtyAfter = upsertStockLevel(store, line.product_id, locationId, Number(line.received_qty))
        insertLedger(store, {
          product_id: line.product_id,
          location_id: locationId,
          txn_type: 'RECEIPT',
          txn_ref: receipt.reference,
          qty_change: Number(line.received_qty),
          qty_after: qtyAfter,
        })
      })

      receipt.status = 'Done'
      receipt.validated_at = new Date().toISOString()

      return { ok: true }
    })
  },

  listDeliveries({ search = '', status = '', page = 1, pageSize = 10 }) {
    const store = loadStore()
    const rows = store.delivery_orders
      .map((delivery) => {
        const warehouse = store.warehouses.find((w) => Number(w.id) === Number(delivery.warehouse_id))
        return {
          ...delivery,
          warehouse_name: warehouse?.name || 'Unknown Warehouse',
        }
      })
      .filter((row) => {
        const text = `${row.reference} ${row.customer_name}`.toLowerCase()
        return text.includes(String(search).toLowerCase()) && (!status || row.status === status)
      })

    return paginate(sortRows(rows, 'created_at', 'desc'), page, pageSize)
  },

  createDelivery(payload) {
    return runTransaction((store) => {
      if (!payload?.customer_name || !payload?.warehouse_id || !Array.isArray(payload.lines) || !payload.lines.length) {
        throw new Error('Customer name, warehouse and lines are required')
      }

      payload.lines.forEach((line) => {
        if (!line.product_id || Number(line.quantity) <= 0) {
          throw new Error('Invalid delivery line quantity')
        }
      })

      const deliveryId = nextId(store.delivery_orders)
      const reference = `DO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(deliveryId).padStart(4, '0')}`

      store.delivery_orders.push({
        id: deliveryId,
        reference,
        customer_name: payload.customer_name,
        warehouse_id: Number(payload.warehouse_id),
        schedule_date: payload.schedule_date || new Date().toISOString().slice(0, 10),
        operation_type: payload.operation_type || 'Delivery',
        responsible: payload.responsible || 'system',
        status: 'Draft',
        created_at: new Date().toISOString(),
        validated_at: null,
      })

      payload.lines.forEach((line) => {
        store.delivery_lines.push({
          id: nextId(store.delivery_lines),
          delivery_id: deliveryId,
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
        })
      })

      return { id: deliveryId, reference }
    })
  },

  getDelivery(id) {
    const store = loadStore()
    const delivery = store.delivery_orders.find((item) => Number(item.id) === Number(id))
    if (!delivery) throw new Error('Delivery order not found')

    const warehouse = store.warehouses.find((item) => Number(item.id) === Number(delivery.warehouse_id))
    const lines = store.delivery_lines
      .filter((line) => Number(line.delivery_id) === Number(id))
      .map((line) => {
        const product = store.products.find((item) => Number(item.id) === Number(line.product_id))
        return {
          ...line,
          product_name: product?.name || 'Unknown Product',
          sku: product?.sku || '-',
          available_stock: this.getProductAvailableStock(line.product_id, delivery.warehouse_id),
        }
      })

    return {
      ...delivery,
      warehouse_name: warehouse?.name || 'Unknown Warehouse',
      lines,
    }
  },

  updateDelivery(id, payload) {
    return runTransaction((store) => {
      const delivery = store.delivery_orders.find((item) => Number(item.id) === Number(id))
      if (!delivery) throw new Error('Delivery order not found')

      if (payload?.customer_name) delivery.customer_name = payload.customer_name
      if (payload?.warehouse_id) delivery.warehouse_id = Number(payload.warehouse_id)
      if (payload?.schedule_date) delivery.schedule_date = payload.schedule_date
      if (payload?.operation_type) delivery.operation_type = payload.operation_type
      if (payload?.responsible) delivery.responsible = payload.responsible

      if (Array.isArray(payload?.lines)) {
        store.delivery_lines = store.delivery_lines.filter((line) => Number(line.delivery_id) !== Number(id))
        payload.lines.forEach((line) => {
          store.delivery_lines.push({
            id: nextId(store.delivery_lines),
            delivery_id: Number(id),
            product_id: Number(line.product_id),
            quantity: Number(line.quantity),
          })
        })
      }

      return { ok: true }
    })
  },

  validateDelivery(id) {
    return runTransaction((store) => {
      const delivery = store.delivery_orders.find((item) => Number(item.id) === Number(id))
      if (!delivery) throw new Error('Delivery order not found')
      if (String(delivery.status).toLowerCase() === 'done' || delivery.validated_at) {
        throw new Error('Delivery order is already validated')
      }

      const lines = store.delivery_lines.filter((line) => Number(line.delivery_id) === Number(id))
      if (!lines.length) throw new Error('Delivery must include at least one line')

      const locationId = getLocationForWarehouse(store, delivery.warehouse_id)
      if (!locationId) throw new Error('Warehouse default location not found')

      lines.forEach((line) => {
        const available = store.stock_levels
          .filter((item) => Number(item.product_id) === Number(line.product_id) && Number(item.location_id) === Number(locationId))
          .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

        if (available < Number(line.quantity)) {
          throw new Error('Insufficient stock for product')
        }

        const qtyAfter = upsertStockLevel(store, line.product_id, locationId, -Number(line.quantity))
        insertLedger(store, {
          product_id: line.product_id,
          location_id: locationId,
          txn_type: 'DELIVERY',
          txn_ref: delivery.reference,
          qty_change: -Number(line.quantity),
          qty_after: qtyAfter,
        })
      })

      delivery.status = 'Done'
      delivery.validated_at = new Date().toISOString()
      return { ok: true }
    })
  },

  listAdjustments({ search = '', status = '', page = 1, pageSize = 10 }) {
    const store = loadStore()
    const rows = store.stock_adjustments
      .map((adjustment) => {
        const location = store.locations.find((item) => Number(item.id) === Number(adjustment.location_id))
        return {
          ...adjustment,
          location_name: location?.name || 'Unknown Location',
        }
      })
      .filter((row) => {
        const text = `${row.reference || ''} ${row.reason || ''}`.toLowerCase()
        return text.includes(String(search).toLowerCase()) && (!status || row.status === status)
      })

    return paginate(sortRows(rows, 'created_at', 'desc'), page, pageSize)
  },

  createAdjustment(payload) {
    return runTransaction((store) => {
      if (!payload?.location_id || !payload?.reason || !Array.isArray(payload.lines) || !payload.lines.length) {
        throw new Error('Location, reason and lines are required')
      }

      payload.lines.forEach((line) => {
        if (!line.product_id || Number(line.counted_qty) < 0) {
          throw new Error('Invalid adjustment line values')
        }
      })

      const adjustmentId = nextId(store.stock_adjustments)
      const reference = `ADJ-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(adjustmentId).padStart(4, '0')}`

      store.stock_adjustments.push({
        id: adjustmentId,
        reference,
        location_id: Number(payload.location_id),
        reason: payload.reason,
        status: 'Draft',
        created_at: new Date().toISOString(),
      })

      payload.lines.forEach((line) => {
        const stock = store.stock_levels.find(
          (item) => Number(item.product_id) === Number(line.product_id) && Number(item.location_id) === Number(payload.location_id),
        )
        const systemQty = Number(stock?.quantity || 0)
        const countedQty = Number(line.counted_qty)

        store.adjustment_lines.push({
          id: nextId(store.adjustment_lines),
          adjustment_id: adjustmentId,
          product_id: Number(line.product_id),
          system_qty: systemQty,
          counted_qty: countedQty,
          difference: countedQty - systemQty,
        })
      })

      return { id: adjustmentId, reference }
    })
  },

  getAdjustment(id) {
    const store = loadStore()
    const adjustment = store.stock_adjustments.find((item) => Number(item.id) === Number(id))
    if (!adjustment) throw new Error('Adjustment not found')

    const location = store.locations.find((item) => Number(item.id) === Number(adjustment.location_id))
    const lines = store.adjustment_lines
      .filter((line) => Number(line.adjustment_id) === Number(id))
      .map((line) => {
        const product = store.products.find((item) => Number(item.id) === Number(line.product_id))
        return {
          ...line,
          product_name: product?.name || 'Unknown Product',
          sku: product?.sku || '-',
        }
      })

    return {
      ...adjustment,
      location_name: location?.name || 'Unknown Location',
      lines,
    }
  },

  validateAdjustment(id) {
    return runTransaction((store) => {
      const adjustment = store.stock_adjustments.find((item) => Number(item.id) === Number(id))
      if (!adjustment) throw new Error('Adjustment not found')
      if (String(adjustment.status).toLowerCase() === 'done') {
        throw new Error('Adjustment already validated')
      }

      const lines = store.adjustment_lines.filter((line) => Number(line.adjustment_id) === Number(id))
      if (!lines.length) throw new Error('Adjustment must include at least one line')

      lines.forEach((line) => {
        if (Number(line.counted_qty) < 0) {
          throw new Error('Counted quantity must be non-negative')
        }

        const qtyAfter = upsertStockLevel(store, line.product_id, adjustment.location_id, 0, Number(line.counted_qty))
        insertLedger(store, {
          product_id: line.product_id,
          location_id: adjustment.location_id,
          txn_type: 'ADJUSTMENT',
          txn_ref: adjustment.reference,
          qty_change: Number(line.difference),
          qty_after: qtyAfter,
        })
      })

      adjustment.status = 'Done'
      return { ok: true }
    })
  },

  listLedger({ page = 1, pageSize = 10, productId, warehouseId, dateFrom, dateTo }) {
    const store = loadStore()

    const rows = store.stock_ledger
      .map((entry) => {
        const product = store.products.find((item) => Number(item.id) === Number(entry.product_id))
        const location = store.locations.find((item) => Number(item.id) === Number(entry.location_id))
        return {
          ...entry,
          product_name: product?.name || 'Unknown Product',
          location_name: location?.name || 'Unknown Location',
          warehouse_id: location?.warehouse_id || null,
        }
      })
      .filter((entry) => {
        if (productId && Number(entry.product_id) !== Number(productId)) return false
        if (warehouseId && Number(entry.warehouse_id) !== Number(warehouseId)) return false
        if (dateFrom && new Date(entry.created_at).getTime() < new Date(dateFrom).getTime()) return false
        if (dateTo && new Date(entry.created_at).getTime() > new Date(dateTo).getTime()) return false
        return true
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return paginate(rows, page, pageSize)
  },

  getTimeline(limit = 8) {
    const rows = this.listLedger({ page: 1, pageSize: 200 }).rows
    return rows.slice(0, limit)
  },

  getHeatmap() {
    const store = loadStore()
    return store.locations.map((location) => {
      const quantity = store.stock_levels
        .filter((stock) => Number(stock.location_id) === Number(location.id))
        .reduce((sum, stock) => sum + Number(stock.quantity || 0), 0)
      return {
        location_id: location.id,
        location_name: location.name,
        warehouse_id: location.warehouse_id,
        quantity,
      }
    })
  },
}
