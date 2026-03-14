import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ProductSelector from './ProductSelector'

function emptyLine() {
  return { product_id: '', system_qty: 0, counted_qty: '' }
}

export default function AdjustmentForm({ locations, products, stockResolver, onSubmit, onCancel }) {
  const [locationId, setLocationId] = useState('')
  const [reason, setReason] = useState('Cycle count')
  const [lines, setLines] = useState([emptyLine()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return Boolean(locationId && reason.trim() && lines.some((line) => line.product_id))
  }, [locationId, reason, lines])

  const setLine = async (index, key, value) => {
    const next = lines.map((line, i) => (i === index ? { ...line, [key]: value } : line))

    if (key === 'product_id' && value && locationId) {
      const qty = await stockResolver(Number(value), Number(locationId))
      next[index] = { ...next[index], system_qty: qty }
    }

    setLines(next)
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
        counted_qty: Number(line.counted_qty),
      }))

    if (!locationId || !reason.trim() || !normalizedLines.length) {
      setError('Location, reason and at least one line are required.')
      return
    }

    if (normalizedLines.some((line) => line.counted_qty < 0)) {
      setError('Counted quantity cannot be negative.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        location_id: Number(locationId),
        reason: reason.trim(),
        lines: normalizedLines,
      })
    } catch (submitError) {
      setError(submitError?.message || 'Unable to create adjustment')
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
      <h3 className="text-lg font-semibold text-white">Create Stock Adjustment</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          className="rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
        >
          <option value="">Select location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>

        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100"
          placeholder="Reason"
        />
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const diff = Number(line.counted_qty || 0) - Number(line.system_qty || 0)

          return (
            <div key={index} className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1.7fr_1fr_1fr_1fr_auto]">
              <ProductSelector
                products={products}
                value={line.product_id}
                onChange={(value) => setLine(index, 'product_id', value)}
              />
              <div className="rounded-lg border border-white/10 bg-gray-900/50 px-3 py-2 text-sm text-gray-200">{line.system_qty || 0}</div>
              <input
                type="number"
                min="0"
                value={line.counted_qty}
                onChange={(event) => setLine(index, 'counted_qty', event.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100"
                placeholder="Counted"
              />
              <div className={`rounded-lg border px-3 py-2 text-sm ${diff >= 0 ? 'border-emerald-400/40 text-emerald-200' : 'border-rose-400/40 text-rose-200'}`}>
                {diff > 0 ? '+' : ''}{diff}
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
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addLine} className="rounded-lg border border-cyan-400/50 px-3 py-2 text-xs text-cyan-200">
          Add Row
        </button>
        <button type="submit" disabled={!canSubmit || saving} className="rounded-lg border border-purple-400/50 px-4 py-2 text-sm text-purple-200 disabled:opacity-40">
          {saving ? 'Creating...' : 'Create Adjustment'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-gray-200">
          Cancel
        </button>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </motion.form>
  )
}
