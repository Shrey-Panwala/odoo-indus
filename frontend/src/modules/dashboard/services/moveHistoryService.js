import apiClient from '../../../services/apiClient'

function toDateLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function filterRows(rows, search) {
  if (!search.trim()) return rows
  const query = search.toLowerCase()

  return rows.filter((row) => {
    const text = `${row.reference} ${row.contact} ${row.from} ${row.to} ${row.status} ${row.product_name}`.toLowerCase()
    return text.includes(query)
  })
}

export async function getMoveHistoryRows(search = '') {
  const res = await apiClient.get('/ledger')
  const rows = (res.data || []).map((entry) => ({
    id: `ledger-${entry.id}`,
    reference: entry.txn_ref || '-',
    date: toDateLabel(entry.created_at),
    contact: entry.txn_type === 'receipt' ? 'Vendor' : entry.txn_type === 'delivery' ? 'Customer' : '-',
    from: entry.txn_type === 'receipt' ? 'Vendor' : `${entry.warehouse_name || 'WH'}/${entry.location_name || 'Stock'}`,
    to: entry.txn_type === 'delivery' ? 'Customer' : `${entry.warehouse_name || 'WH'}/${entry.location_name || 'Stock'}`,
    quantity: Math.abs(Number(entry.qty_change || 0)),
    status: 'Done',
    direction: Number(entry.qty_change || 0) >= 0 ? 'IN' : 'OUT',
    product_name: entry.product_name || entry.sku || '-',
  }))

  return filterRows(rows, search)
}
