import axios from 'axios'

const OPS_STORE_KEY = 'odoo.inventory.operations.v1'

function toDateLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function readOpsStore() {
  try {
    const raw = window.localStorage.getItem(OPS_STORE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_error) {
    return null
  }
}

function mapRowsFromStore(store) {
  if (!store) return []

  const warehouses = new Map((store.warehouses || []).map((item) => [Number(item.id), item]))
  const products = new Map((store.products || []).map((item) => [Number(item.id), item]))

  const receiptRows = (store.receipts || []).flatMap((receipt) => {
    const receiptLines = (store.receipt_lines || []).filter((line) => Number(line.receipt_id) === Number(receipt.id))

    return receiptLines.map((line) => {
      const warehouse = warehouses.get(Number(receipt.warehouse_id))
      const product = products.get(Number(line.product_id))
      const quantity = Number(line.received_qty || line.expected_qty || 0)

      return {
        id: `rcpt-${receipt.id}-${line.id}`,
        reference: receipt.reference,
        date: toDateLabel(receipt.created_at),
        contact: receipt.created_by || 'Vendor',
        from: 'Vendor',
        to: warehouse ? `WH/${warehouse.name}` : 'WH/Stock',
        quantity,
        status: receipt.status || 'Ready',
        direction: 'IN',
        product_name: product?.name || `Product #${line.product_id}`,
      }
    })
  })

  const deliveryRows = (store.delivery_orders || []).flatMap((delivery) => {
    const deliveryLines = (store.delivery_lines || []).filter((line) => Number(line.delivery_id) === Number(delivery.id))

    return deliveryLines.map((line) => {
      const warehouse = warehouses.get(Number(delivery.warehouse_id))
      const product = products.get(Number(line.product_id))
      const quantity = Number(line.quantity || 0)

      return {
        id: `dlv-${delivery.id}-${line.id}`,
        reference: delivery.reference,
        date: toDateLabel(delivery.created_at),
        contact: delivery.customer_name || 'Customer',
        from: warehouse ? `WH/${warehouse.name}` : 'WH/Stock',
        to: delivery.customer_name || 'Customer',
        quantity,
        status: delivery.status || 'Ready',
        direction: 'OUT',
        product_name: product?.name || `Product #${line.product_id}`,
      }
    })
  })

  return [...receiptRows, ...deliveryRows].sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

function filterRows(rows, search) {
  if (!search.trim()) return rows
  const query = search.toLowerCase()

  return rows.filter((row) => {
    const text = `${row.reference} ${row.contact} ${row.from} ${row.to} ${row.status} ${row.product_name}`.toLowerCase()
    return text.includes(query)
  })
}

async function tryFetchApiRows() {
  const [receiptRes, deliveryRes] = await Promise.all([
    axios.get('/api/operations/receipts', { params: { page: 1, pageSize: 50 } }),
    axios.get('/api/operations/deliveries', { params: { page: 1, pageSize: 50 } }),
  ])

  const receiptRows = (receiptRes.data?.rows || []).map((row) => ({
    id: `api-rcpt-${row.id}`,
    reference: row.reference,
    date: toDateLabel(row.created_at),
    contact: row.supplier_name || row.created_by || 'Vendor',
    from: 'Vendor',
    to: row.warehouse_name ? `WH/${row.warehouse_name}` : 'WH/Stock',
    quantity: 0,
    status: row.status || 'Ready',
    direction: 'IN',
    product_name: '-',
  }))

  const deliveryRows = (deliveryRes.data?.rows || []).map((row) => ({
    id: `api-dlv-${row.id}`,
    reference: row.reference,
    date: toDateLabel(row.created_at),
    contact: row.customer_name || 'Customer',
    from: row.warehouse_name ? `WH/${row.warehouse_name}` : 'WH/Stock',
    to: row.customer_name || 'Customer',
    quantity: 0,
    status: row.status || 'Ready',
    direction: 'OUT',
    product_name: '-',
  }))

  return [...receiptRows, ...deliveryRows]
}

export async function getMoveHistoryRows(search = '') {
  try {
    const apiRows = await tryFetchApiRows()
    return filterRows(apiRows, search)
  } catch (_error) {
    const localRows = mapRowsFromStore(readOpsStore())
    return filterRows(localRows, search)
  }
}
