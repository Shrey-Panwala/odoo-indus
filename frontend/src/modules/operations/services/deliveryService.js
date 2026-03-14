import { opsHttp } from './apiClient'

export async function listDeliveries(params) {
  const response = await opsHttp.get('/deliveries', { params })
  return response.data
}

export async function createDelivery(payload) {
  const response = await opsHttp.post('/deliveries', payload)
  return response.data
}

export async function getDeliveryById(id) {
  const response = await opsHttp.get(`/deliveries/${id}`)
  return response.data
}

export async function updateDeliveryById(id, payload) {
  const response = await opsHttp.put(`/deliveries/${id}`, payload)
  return response.data
}

export async function validateDelivery(id) {
  const response = await opsHttp.post(`/deliveries/${id}/validate`)
  return response.data
}
