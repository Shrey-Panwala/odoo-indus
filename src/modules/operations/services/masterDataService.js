import { withFallback, opsHttp } from './apiClient'
import { mockOperationsStore } from './mockOperationsStore'

export async function getSuppliers() {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/master/suppliers')
      return response.data || []
    },
    async () => mockOperationsStore.getSuppliers(),
  )
}

export async function getWarehouses() {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/master/warehouses')
      return response.data || []
    },
    async () => mockOperationsStore.getWarehouses(),
  )
}

export async function getProducts() {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/master/products')
      return response.data || []
    },
    async () => mockOperationsStore.getProducts(),
  )
}

export async function getLocations(warehouseId) {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/master/locations', { params: { warehouseId } })
      return response.data || []
    },
    async () => mockOperationsStore.getLocations(warehouseId),
  )
}

export async function getProductAvailableStock(productId, warehouseId) {
  return mockOperationsStore.getProductAvailableStock(productId, warehouseId)
}

export async function getProductStockByLocation(productId, locationId) {
  return mockOperationsStore.getProductStockByLocation(productId, locationId)
}
