import { withFallback, opsHttp } from './apiClient'
import { mockOperationsStore } from './mockOperationsStore'

export async function listLedger(params) {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/ledger', { params })
      return response.data
    },
    async () => mockOperationsStore.listLedger(params || {}),
  )
}

export async function getMovementTimeline(limit = 8) {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/ledger', { params: { page: 1, pageSize: limit } })
      return response.data?.rows || []
    },
    async () => mockOperationsStore.getTimeline(limit),
  )
}

export async function getInventoryHeatmap() {
  return mockOperationsStore.getHeatmap()
}
