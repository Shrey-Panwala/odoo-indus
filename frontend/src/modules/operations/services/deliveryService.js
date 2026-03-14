import { opsHttp } from './apiClient'

function toNumberOrZero(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeDeliveryPayload(payload = {}) {
  return {
    customerName: payload.customerName ?? payload.customer_name ?? '',
    warehouseId: payload.warehouseId ?? payload.warehouse_id ?? null,
    lines: (payload.lines || []).map((line) => ({
      productId: line.productId ?? line.product_id,
      qty: toNumberOrZero(line.qty ?? line.quantity),
    })),
  }
}

export async function listDeliveries(params) {
  const response = await opsHttp.get('/deliveries', { params })
  return response.data
}

export async function createDelivery(payload) {
  const response = await opsHttp.post('/deliveries', normalizeDeliveryPayload(payload))
  return response.data
}

export async function getDeliveryById(id) {
  const response = await opsHttp.get(`/deliveries/${id}`)
  return response.data
}

export async function updateDeliveryById(id, payload) {
  const response = await opsHttp.put(`/deliveries/${id}`, normalizeDeliveryPayload(payload))
  return response.data
}

export async function validateDelivery(id) {
  const response = await opsHttp.post(`/deliveries/${id}/validate`)
  return response.data
}
