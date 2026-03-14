import { withFallback, opsHttp } from './apiClient'
import { mockOperationsStore } from './mockOperationsStore'

export async function listReceipts(params) {
  return withFallback(
    async () => {
      const response = await opsHttp.get('/receipts', { params })
      return response.data
    },
    async () => mockOperationsStore.listReceipts(params || {}),
  )
}

export async function createReceipt(payload) {
  return withFallback(
    async () => {
      const response = await opsHttp.post('/receipts', payload)
      return response.data
    },
    async () => mockOperationsStore.createReceipt(payload),
  )
}

export async function getReceiptById(id) {
  return withFallback(
    async () => {
      const response = await opsHttp.get(`/receipts/${id}`)
      return response.data
    },
    async () => mockOperationsStore.getReceipt(id),
  )
}

export async function updateReceiptById(id, payload) {
  return withFallback(
    async () => {
      const response = await opsHttp.patch(`/receipts/${id}`, payload)
      return response.data
    },
    async () => mockOperationsStore.updateReceipt(id, payload),
  )
}

export async function validateReceipt(id) {
  return withFallback(
    async () => {
      const response = await opsHttp.post(`/receipts/${id}/validate`)
      return response.data
    },
    async () => mockOperationsStore.validateReceipt(id),
  )
}
