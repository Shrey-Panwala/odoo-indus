import { opsHttp } from './apiClient'

export async function listReceipts(params) {
  const response = await opsHttp.get('/receipts', { params })
  return response.data
}

export async function createReceipt(payload) {
  const response = await opsHttp.post('/receipts', payload)
  return response.data
}

export async function getReceiptById(id) {
  const response = await opsHttp.get(`/receipts/${id}`)
  return response.data
}

export async function updateReceiptById(id, payload) {
  const response = await opsHttp.put(`/receipts/${id}`, payload)
  return response.data
}

export async function validateReceipt(id) {
  const response = await opsHttp.post(`/receipts/${id}/validate`)
  return response.data
}
