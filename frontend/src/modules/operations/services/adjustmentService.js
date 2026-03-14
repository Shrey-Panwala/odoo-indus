import { opsHttp } from './apiClient'

export async function listAdjustments(params) {
  const response = await opsHttp.get('/adjustments', { params })
  return response.data
}

export async function createAdjustment(payload) {
  const response = await opsHttp.post('/adjustments', payload)
  return response.data
}

export async function getAdjustmentById(id) {
  const response = await opsHttp.get(`/adjustments/${id}`)
  return response.data
}

export async function validateAdjustment(id) {
  const response = await opsHttp.post(`/adjustments/${id}/validate`)
  return response.data
}
