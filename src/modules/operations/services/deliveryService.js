import { withFallback, opsHttp } from './apiClient'
import { mockOperationsStore } from './mockOperationsStore'

export async function listDeliveries(params) {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/deliveries', { params })
      return response.data
    },
    async () => mockOperationsStore.listDeliveries(params || {}),
  )
}

export async function createDelivery(payload) {
  return withFallback(
    async () => {
      const response = await opsHttp.post('/deliveries', payload)
      return response.data
    },
    async () => mockOperationsStore.createDelivery(payload),
  )
}

export async function getDeliveryById(id) {
  return withFallback(
    async () => {
      const response = await opsHttp.get(`/deliveries/${id}`)
      return response.data
    },
    async () => mockOperationsStore.getDelivery(id),
  )
}

export async function updateDeliveryById(id, payload) {
  return withFallback(
    async () => {
      const response = await opsHttp.patch(`/deliveries/${id}`, payload)
      return response.data
    },
    async () => mockOperationsStore.updateDelivery(id, payload),
  )
}

export async function validateDelivery(id) {
  return withFallback(
    async () => {
      const response = await opsHttp.post(`/deliveries/${id}/validate`)
      return response.data
    },
    async () => mockOperationsStore.validateDelivery(id),
  )
}
