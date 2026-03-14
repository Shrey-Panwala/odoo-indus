import { opsHttp } from './apiClient'

function toNumberOrZero(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeReceiptPayload(payload = {}) {
  return {
    supplierId: payload.supplierId ?? payload.supplier_id ?? null,
    warehouseId: payload.warehouseId ?? payload.warehouse_id ?? null,
    lines: (payload.lines || []).map((line) => ({
      productId: line.productId ?? line.product_id,
      expectedQty: toNumberOrZero(line.expectedQty ?? line.expected_qty ?? line.quantity),
      receivedQty: toNumberOrZero(line.receivedQty ?? line.received_qty ?? line.quantity),
    })),
  }
}

export async function listReceipts(params) {
  const response = await opsHttp.get('/receipts', { params })
  return response.data
}

export async function createReceipt(payload) {
  const response = await opsHttp.post('/receipts', normalizeReceiptPayload(payload))
  return response.data
}

export async function getReceiptById(id) {
  const response = await opsHttp.get(`/receipts/${id}`)
  return response.data
}

export async function updateReceiptById(id, payload) {
  const response = await opsHttp.put(`/receipts/${id}`, normalizeReceiptPayload(payload))
  return response.data
}

export async function validateReceipt(id) {
  const response = await opsHttp.post(`/receipts/${id}/validate`)
  return response.data
}
