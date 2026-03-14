import apiClient from '../../../services/apiClient'

export async function getStockItems() {
  const res = await apiClient.get('/products')
  return (res.data || []).map(normalizeProduct)
}

export async function updateStockItem(productId, changes) {
  const res = await apiClient.put(`/products/${productId}`, {
    name: changes.name,
    sku: changes.sku,
    categoryId: changes.categoryId,
    unitOfMeasure: changes.unitOfMeasure,
    reorderPoint: changes.reorderPoint,
    reorderQty: changes.reorderQty,
  })
  return normalizeProduct(res.data)
}

function normalizeProduct(p) {
  const onHand = Number(p.total_stock ?? p.on_hand ?? 0)
  const reserved = Number(p.reserved_qty ?? 0)

  return {
    ...p,
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category_name || p.category || '',
    location: p.location || p.location_name || 'Not assigned',
    unit_cost: Number(p.unit_cost ?? 0),
    on_hand: Math.max(onHand, 0),
    stock: Math.max(onHand, 0),
    reserved_qty: Math.min(Math.max(reserved, 0), Math.max(onHand, 0)),
    free_to_use: Math.max(onHand - reserved, 0),
  }
}
