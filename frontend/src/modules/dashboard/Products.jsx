import React, { useEffect, useState } from 'react'
import { getStockItems, updateStockItem } from './services/stockService'

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function validateRow(draft) {
  const onHand = toNumber(draft.onHand)
  const unitCost = toNumber(draft.unitCost)
  const reservedQty = toNumber(draft.reservedQty)

  if (onHand < 0) return 'Current stock cannot be negative.'
  if (unitCost < 0) return 'Unit cost cannot be negative.'
  if (reservedQty < 0) return 'Reserved stock cannot be negative.'
  if (reservedQty > onHand) return 'Reserved stock cannot be higher than current stock.'
  return ''
}

function summarizeStorageArea(rawLocation) {
  const location = String(rawLocation || '').trim()
  if (!location || location.toLowerCase() === 'not assigned') {
    return { short: 'Not assigned', full: 'Not assigned' }
  }

  const parts = location
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (parts.length <= 2) {
    return { short: parts.join(', '), full: parts.join(', ') }
  }

  const short = `${parts.slice(0, 2).join(', ')} +${parts.length - 2} more`
  return { short, full: parts.join(', ') }
}

export default function Products(){
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState({})
  const [rowErrors, setRowErrors] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  const loadProducts = async () => {
    try {
      const products = await getStockItems()
      setItems(products)

      const nextDrafts = {}
      products.forEach((product) => {
        nextDrafts[product.id] = {
          unitCost: Number(product.unit_cost || 0),
          onHand: Number(product.on_hand ?? product.stock ?? 0),
          reservedQty: Number(product.reserved_qty || 0),
          delta: 0,
        }
      })
      setDrafts(nextDrafts)
    } catch (loadError) {
      console.error(loadError)
      setError('Unable to load inventory items.')
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const setDraftValue = (id, key, value) => {
    setDrafts((previous) => ({
      ...previous,
      [id]: {
        ...(previous[id] || {}),
        [key]: value,
      },
    }))

    if (rowErrors[id]) {
      setRowErrors((previous) => ({ ...previous, [id]: '' }))
    }
  }

  const saveRow = async (id) => {
    const draft = drafts[id]
    if (!draft) return

    const draftError = validateRow(draft)
    if (draftError) {
      setRowErrors((prev) => ({ ...prev, [id]: draftError }))
      return
    }

    setSavingId(id)
    setError('')
    try {
      const updated = await updateStockItem(id, {
        onHand: toNumber(draft.onHand),
        unitCost: toNumber(draft.unitCost),
        reservedQty: toNumber(draft.reservedQty),
      })

      setItems((previous) => previous.map((product) => (product.id === id ? updated : product)))
      setDraftValue(id, 'onHand', Number(updated.on_hand ?? updated.stock ?? 0))
      setDraftValue(id, 'unitCost', Number(updated.unit_cost || 0))
      setDraftValue(id, 'reservedQty', Number(updated.reserved_qty || 0))
      setRowErrors((prev) => ({ ...prev, [id]: '' }))
    } catch (saveError) {
      const message = saveError?.message || 'Unable to save inventory changes.'
      setError(message)
    } finally {
      setSavingId(null)
    }
  }

  const adjustStock = async (id) => {
    const draft = drafts[id]
    if (!draft) return

    const delta = Number(draft.delta || 0)
    if (!delta) return

    const currentOnHand = toNumber(draft.onHand)
    const newOnHand = currentOnHand + delta
    if (newOnHand < 0) {
      setRowErrors((prev) => ({ ...prev, [id]: 'This stock change would make current stock negative.' }))
      return
    }

    setSavingId(id)
    setError('')
    try {
      const updated = await updateStockItem(id, {
        onHand: newOnHand,
        reservedQty: Math.min(toNumber(draft.reservedQty), newOnHand),
      })
      setItems((previous) => previous.map((product) => (product.id === id ? updated : product)))
      setDraftValue(id, 'onHand', Number(updated.on_hand ?? updated.stock ?? 0))
      setDraftValue(id, 'reservedQty', Number(updated.reserved_qty || 0))
      setDraftValue(id, 'delta', 0)
      setRowErrors((prev) => ({ ...prev, [id]: '' }))
    } catch (adjustError) {
      const message = adjustError?.response?.data?.error || adjustError?.message || 'Unable to adjust inventory.'
      setError(message)
    } finally {
      setSavingId(null)
    }
  }

  const filteredItems = items.filter((product) => {
    if (!search.trim()) return true
    const text = `${product.name} ${product.sku} ${product.category} ${product.location}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const totalOnHand = filteredItems.reduce((sum, item) => sum + Number(item.on_hand ?? item.stock ?? 0), 0)
  const lowStockCount = filteredItems.filter((item) => Number(item.on_hand ?? item.stock ?? 0) <= 10).length

  return (
    <div className="surface-panel space-y-4 rounded-2xl p-5 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-subtle rounded-xl px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">Visible Products</p>
          <p className="text-2xl font-semibold text-white">{filteredItems.length}</p>
        </div>
        <div className="surface-subtle rounded-xl px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Current Stock</p>
          <p className="text-2xl font-semibold text-cyan-100">{totalOnHand}</p>
        </div>
        <div className="surface-subtle rounded-xl px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">Low Inventory</p>
          <p className="text-2xl font-semibold text-amber-200">{lowStockCount}</p>
        </div>
        <div className="surface-subtle rounded-xl px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">Data Source</p>
          <p className="text-sm font-semibold text-emerald-200">App data ready</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title text-2xl">Inventory</h2>
          <p className="section-subtitle">Simple inventory controls with row checks and safe quantity updates.</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product, code, category, or storage area"
          className="form-field w-full md:max-w-xs"
        />
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/30">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-slate-900/35 text-left text-base text-gray-300">
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Unit cost</th>
              <th className="px-3 py-3">Current stock</th>
              <th className="px-3 py-3">Reserved stock</th>
              <th className="px-3 py-3">Available stock</th>
              <th className="px-3 py-3">Storage area</th>
              <th className="px-3 py-3">Adjust (+/-)</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((product) => {
              const draft = drafts[product.id] || {}
              const storageArea = summarizeStorageArea(product.location)
              return (
              <React.Fragment key={product.id}>
                <tr className="border-t border-white/6 align-middle text-base hover:bg-cyan-500/5">
                  <td className="px-3 py-3 text-gray-200">
                    <p className="text-lg font-medium">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.sku} · {product.category}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-300">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.unitCost ?? 0}
                      onChange={(event) => setDraftValue(product.id, 'unitCost', event.target.value)}
                      className="form-field h-11 min-w-[90px] px-3"
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-200">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.onHand ?? 0}
                      onChange={(event) => setDraftValue(product.id, 'onHand', event.target.value)}
                      className="form-field h-11 min-w-[85px] px-3"
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-200">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.reservedQty ?? 0}
                      onChange={(event) => setDraftValue(product.id, 'reservedQty', event.target.value)}
                      className="form-field h-11 min-w-[85px] px-3"
                      title="Reserved stock"
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-200">
                    <span className="inline-flex min-w-16 justify-center rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-2 py-1.5 text-base font-semibold text-cyan-100">
                      {Math.max(toNumber(draft.onHand) - toNumber(draft.reservedQty), 0)}
                    </span>
                  </td>
                  <td className="max-w-[300px] px-3 py-3 text-gray-300">
                    <span
                      title={storageArea.full}
                      className="inline-flex max-w-full truncate rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
                    >
                      {storageArea.short}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDraftValue(product.id, 'delta', String(toNumber(draft.delta) - 1))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-500/10 text-xl font-semibold leading-none text-cyan-100 hover:bg-cyan-500/20"
                        title="Decrease by 1"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="1"
                        value={draft.delta ?? 0}
                        onChange={(event) => setDraftValue(product.id, 'delta', event.target.value)}
                        className="form-field h-10 w-24 px-2 text-center text-cyan-100"
                        title="Quantity change (example: -5 or 10)"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => setDraftValue(product.id, 'delta', String(toNumber(draft.delta) + 1))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-500/10 text-xl font-semibold leading-none text-cyan-100 hover:bg-cyan-500/20"
                        title="Increase by 1"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustStock(product.id)}
                        disabled={savingId === product.id}
                        className="btn-muted h-10 px-3 text-sm disabled:opacity-60"
                      >
                        Apply
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-300">
                    <button
                      type="button"
                      onClick={() => saveRow(product.id)}
                      disabled={savingId === product.id}
                      className="btn-accent h-11 w-full min-w-[86px] justify-center px-2 text-sm disabled:opacity-60"
                    >
                      {savingId === product.id ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
                {rowErrors[product.id] && (
                  <tr className="border-t border-rose-400/20 bg-rose-500/5">
                    <td colSpan={8} className="px-3 py-2 text-xs text-rose-300">
                      {product.name}: {rowErrors[product.id]}
                    </td>
                  </tr>
                )}
              </React.Fragment>
              )
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-gray-400">
                  No inventory items match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Tip: use +/- for quick stock updates, then Save to apply current stock, reserved stock, and unit cost changes.
      </p>
    </div>
  )
}
