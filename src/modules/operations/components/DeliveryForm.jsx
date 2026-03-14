import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ProductSelector from './ProductSelector'

function emptyLine() {
  return { product_id: '', quantity: '' }
}

export default function DeliveryForm({ warehouses, products, stockResolver, onSubmit, onCancel }) {
  const [customerName, setCustomerName] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [lines, setLines] = useState([emptyLine()])
  const [stockMap, setStockMap] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return Boolean(customerName.trim() && warehouseId && lines.some((line) => line.product_id))
  }, [customerName, warehouseId, lines])

  const setLine = async (index, key, value) => {
    const nextLines = lines.map((line, i) => (i === index ? { ...line, [key]: value } : line))
    setLines(nextLines)

    if (key === 'product_id' && value && warehouseId) {
      const qty = await stockResolver(Number(value), Number(warehouseId))
      setStockMap((prev) => ({ ...prev, [value]: qty }))
    }
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index))

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    const normalizedLines = lines
      .filter((line) => line.product_id)
      .map((line) => ({ product_id: Number(line.product_id), quantity: Number(line.quantity) }))

    if (!customerName.trim() || !warehouseId || !normalizedLines.length) {
      setError('Customer name, warehouse and line items are required.')
      return
    }

    if (normalizedLines.some((line) => line.quantity <= 0)) {
      setError('All quantities must be positive.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        customer_name: customerName.trim(),
        warehouse_id: Number(warehouseId),
        lines: normalizedLines,
      })
    } catch (submitError) {
      setError(submitError?.message || 'Unable to create delivery order')
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
      <h3 className="text-lg font-semibold text-white">Create Delivery Order</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100"
          placeholder="Customer name"
        />

        <select
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          className="rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
        >
          <option value="">Select warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1.8fr_1fr_1fr_auto]">
            <ProductSelector
              products={products}
              value={line.product_id}
              onChange={(value) => setLine(index, 'product_id', value)}
            />
            <input
              type="number"
              min="1"
              value={line.quantity}
              onChange={(event) => setLine(index, 'quantity', event.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100"
              placeholder="Quantity"
            />
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
              Available: {line.product_id ? stockMap[line.product_id] ?? '-' : '-'}
            </div>
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
          {saving ? 'Creating...' : 'Create Delivery'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-gray-200">
          Cancel
        </button>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </motion.form>
  )
}
