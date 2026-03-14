import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ProductSelector from './ProductSelector'

function emptyLine() {
  return { product_id: '', expected_qty: '', received_qty: '' }
}

export default function ReceiptForm({ suppliers, warehouses, products, onSubmit, onCancel }) {
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [lines, setLines] = useState([emptyLine()])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = useMemo(() => {
    return Boolean(supplierId && warehouseId && lines.some((line) => line.product_id))
  }, [supplierId, warehouseId, lines])

  const setLine = (index, key, value) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)))
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index))

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    const normalizedLines = lines
      .filter((line) => line.product_id)
      .map((line) => ({
        product_id: Number(line.product_id),
        expected_qty: Number(line.expected_qty),
        received_qty: Number(line.received_qty),
      }))

    if (!supplierId || !warehouseId || !normalizedLines.length) {
      setError('Supplier, storage site, and at least one product line are required.')
      return
    }

    if (normalizedLines.some((line) => line.expected_qty <= 0 || line.received_qty < 0 || line.received_qty > line.expected_qty)) {
      setError('Expected quantity must be positive and received cannot exceed expected.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        lines: normalizedLines,
      })
    } catch (submitError) {
      setError(submitError?.message || 'Unable to create incoming order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <h3 className="text-lg font-semibold text-white">Create Incoming Order</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          className="rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
        >
          <option value="">Select supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
          ))}
        </select>

        <select
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          className="rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
        >
          <option value="">Select storage site</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1.7fr_1fr_1fr_auto]">
            <ProductSelector
              products={products}
              value={line.product_id}
              onChange={(value) => setLine(index, 'product_id', value)}
              placeholder="Search and select product"
            />
            <input
              type="number"
              min="1"
              value={line.expected_qty}
              onChange={(event) => setLine(index, 'expected_qty', event.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100"
              placeholder="Planned quantity"
            />
            <input
              type="number"
              min="0"
              value={line.received_qty}
              onChange={(event) => setLine(index, 'received_qty', event.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100"
              placeholder="Received quantity"
            />
            <button
              type="button"
              onClick={() => removeLine(index)}
              disabled={lines.length === 1}
              className="rounded-lg border border-rose-400/50 px-3 py-2 text-xs text-rose-200 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addLine} className="rounded-lg border border-cyan-400/50 px-3 py-2 text-xs text-cyan-200">
          Add Row
        </button>
        <button type="submit" disabled={!canSubmit || saving} className="rounded-lg border border-purple-400/50 px-4 py-2 text-sm text-purple-200 disabled:opacity-40">
          {saving ? 'Creating...' : 'Create Incoming Order'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-gray-200">
          Cancel
        </button>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </motion.form>
  )
}
