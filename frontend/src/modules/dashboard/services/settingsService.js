import apiClient from '../../../services/apiClient'

export async function getWarehouses() {
  const res = await apiClient.get('/warehouses')
  return res.data || []
}

export async function getLocations(warehouseId) {
  if (!warehouseId) return []
  const res = await apiClient.get(`/warehouses/${warehouseId}/locations`)
  return res.data || []
}

export async function getAllLocations() {
  const warehouses = await getWarehouses()
  const allLocations = []
  for (const wh of warehouses) {
    const locations = await getLocations(wh.id)
    allLocations.push(
      ...locations.map((loc) => ({
        ...loc,
        warehouse_name: wh.name,
        warehouse_short_code: wh.short_code || wh.name,
      })),
    )
  }
  return allLocations
}

export async function saveWarehouse(payload) {
  const res = await apiClient.post('/warehouses', {
    name: payload.name,
    address: payload.address,
  })
  return res.data
}

export async function saveLocation(payload) {
  const res = await apiClient.post('/locations/create', {
    warehouseId: payload.warehouse_id,
    name: payload.name,
    zone: payload.zone || payload.short_code || null,
  })
  return res.data
}
