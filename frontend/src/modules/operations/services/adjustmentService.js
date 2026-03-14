import { opsHttp } from './apiClient'

function toNumberOrZero(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeAdjustmentPayload(payload = {}) {
  return {
    locationId: payload.locationId ?? payload.location_id ?? null,
    reason: payload.reason ?? '',
    lines: (payload.lines || []).map((line) => ({
      productId: line.productId ?? line.product_id,
      countedQty: toNumberOrZero(line.countedQty ?? line.counted_qty),
    })),
  }
}

export async function listAdjustments(params) {
  const response = await opsHttp.get('/adjustments', { params })
  return response.data
}

export async function createAdjustment(payload) {
  const response = await opsHttp.post('/adjustments', normalizeAdjustmentPayload(payload))
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
