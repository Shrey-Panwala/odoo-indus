import { withFallback, opsHttp } from './apiClient'
import { mockOperationsStore } from './mockOperationsStore'

export async function listAdjustments(params) {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/adjustments', { params })
      return response.data
    },
    async () => mockOperationsStore.listAdjustments(params || {}),
  )
}

export async function createAdjustment(payload) {
  return withFallback(
    async () => {
      const response = await opsHttp.post('/adjustments', payload)
      return response.data
    },
    async () => mockOperationsStore.createAdjustment(payload),
  )
}

export async function getAdjustmentById(id) {
  return withFallback(
    async () => {
      const response = await opsHttp.get(`/adjustments/${id}`)
      return response.data
    },
    async () => mockOperationsStore.getAdjustment(id),
  )
}

export async function validateAdjustment(id) {
  return withFallback(
    async () => {
      const response = await opsHttp.post(`/adjustments/${id}/validate`)
      return response.data
    },
    async () => mockOperationsStore.validateAdjustment(id),
  )
}
