import { opsHttp } from './apiClient'

export async function listLedger(params) {
  const response = await opsHttp.get('/ledger', { params })
  return response.data
}

export async function getMovementTimeline(limit = 8) {
  const response = await opsHttp.get('/ledger', { params: { limit } })
  const data = response.data
  return Array.isArray(data) ? data.slice(0, limit) : (data?.rows || []).slice(0, limit)
}

export async function getInventoryHeatmap() {
  // Heatmap data from stock levels across all locations
  try {
    const response = await opsHttp.get('/products')
    const products = response.data || []
    return products.map((p) => ({
      name: p.name,
      value: Number(p.total_stock || 0),
    }))
  } catch {
    return []
  }
}
