import { opsHttp } from './apiClient'

export async function getSuppliers() {
  // Backend doesn't have a dedicated suppliers endpoint yet;
  // fall back to an empty list (the OperationsModule allows manual text entry for suppliers)
  try {
    const response = await opsHttp.get('/receipts')
    const receipts = response.data || []
    const seen = new Set()
    const suppliers = []
    receipts.forEach((r) => {
      if (r.supplier_name && !seen.has(r.supplier_name)) {
        seen.add(r.supplier_name)
        suppliers.push({ id: r.supplier_id, name: r.supplier_name })
      }
    })
    return suppliers
  } catch {
    return []
  }
}

export async function getWarehouses() {
  const response = await opsHttp.get('/warehouses')
  return response.data || []
}

export async function getProducts() {
  const response = await opsHttp.get('/products')
  return response.data || []
}

export async function getLocations(warehouseId) {
  if (!warehouseId) {
    // Get all warehouses and flatten their locations
    const warehouses = await getWarehouses()
    const allLocs = []
    for (const wh of warehouses) {
      const response = await opsHttp.get(`/warehouses/${wh.id}/locations`)
      const locs = response.data || []
      allLocs.push(...locs.map((l) => ({ ...l, warehouse_name: wh.name })))
    }
    return allLocs
  }
  const response = await opsHttp.get(`/warehouses/${warehouseId}/locations`)
  return response.data || []
}

export async function getProductAvailableStock(productId) {
  try {
    const response = await opsHttp.get(`/products/${productId}`)
    const product = response.data
    return product.total_stock || product.stockLevels?.reduce((s, sl) => s + sl.quantity, 0) || 0
  } catch {
    return 0
  }
}

export async function getProductStockByLocation(productId, locationId) {
  try {
    const response = await opsHttp.get(`/products/${productId}`)
    const product = response.data
    const level = (product.stockLevels || []).find((sl) => sl.location_id === locationId)
    return level ? level.quantity : 0
  } catch {
    return 0
  }
}
