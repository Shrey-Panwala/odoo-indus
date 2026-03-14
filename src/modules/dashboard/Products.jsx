import React, { useEffect, useState } from 'react'
import { adjustStockItem, getStockItems, updateStockItem } from './services/stockService'

export default function Products(){
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState({})
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
      setError('Unable to load stock items.')
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
  }

  const saveRow = async (id) => {
    const draft = drafts[id]
    if (!draft) return

    setSavingId(id)
    setError('')
    try {
      const updated = await updateStockItem(id, {
        onHand: Number(draft.onHand),
        unitCost: Number(draft.unitCost),
        reservedQty: Number(draft.reservedQty),
      })

      setItems((previous) => previous.map((product) => (product.id === id ? updated : product)))
      setDraftValue(id, 'onHand', Number(updated.on_hand ?? updated.stock ?? 0))
      setDraftValue(id, 'unitCost', Number(updated.unit_cost || 0))
      setDraftValue(id, 'reservedQty', Number(updated.reserved_qty || 0))
    } catch (saveError) {
      const message = saveError?.message || 'Unable to save stock changes.'
      setError(message)
    } finally {
      setSavingId(null)
    }
  }

  const adjustStock = async (id) => {
    const delta = Number(drafts[id]?.delta || 0)
    if (!delta) return

    setSavingId(id)
    setError('')
    try {
      const updated = await adjustStockItem(id, delta)
      setItems((previous) => previous.map((product) => (product.id === id ? updated : product)))
      setDraftValue(id, 'onHand', Number(updated.on_hand ?? updated.stock ?? 0))
      setDraftValue(id, 'reservedQty', Number(updated.reserved_qty || 0))
      setDraftValue(id, 'delta', 0)
    } catch (adjustError) {
      const message = adjustError?.message || 'Unable to adjust stock.'
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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Stock</h2>
          <p className="text-xs text-cyan-300/90">Frontend mode active. Backend PostgreSQL integration can be plugged in later.</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product, sku, category or location"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400 md:max-w-xs"
        />
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-left text-sm text-gray-400">
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Per unit cost</th>
              <th className="px-3 py-2">On hand</th>
              <th className="px-3 py-2">Free to use</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Update stock</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((product) => {
              const draft = drafts[product.id] || {}
              return (
              <tr key={product.id} className="border-t border-white/6 hover:bg-white/2">
                <td className="px-3 py-2 text-gray-200">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.sku} · {product.category}</p>
                </td>
                <td className="px-3 py-2 text-gray-300">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.unitCost ?? 0}
                    onChange={(event) => setDraftValue(product.id, 'unitCost', event.target.value)}
                    className="w-24 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-gray-100"
                  />
                  <span className="ml-2 text-xs text-gray-500">Rs</span>
                </td>
                <td className="px-3 py-2 text-gray-200">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.onHand ?? 0}
                    onChange={(event) => setDraftValue(product.id, 'onHand', event.target.value)}
                    className="w-20 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-gray-100"
                  />
                </td>
                <td className="px-3 py-2 text-gray-200">{product.free_to_use}</td>
                <td className="px-3 py-2 text-gray-300">{product.location}</td>
                <td className="px-3 py-2 text-gray-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      value={draft.delta ?? 0}
                      onChange={(event) => setDraftValue(product.id, 'delta', event.target.value)}
                      className="w-20 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-gray-100"
                      title="Use + or - quantity"
                    />
                    <button
                      type="button"
                      onClick={() => adjustStock(product.id)}
                      disabled={savingId === product.id}
                      className="rounded-md border border-cyan-400/60 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
                    >
                      +/-
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.reservedQty ?? 0}
                      onChange={(event) => setDraftValue(product.id, 'reservedQty', event.target.value)}
                      className="w-20 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-gray-100"
                      title="Reserved quantity"
                    />
                    <button
                      type="button"
                      onClick={() => saveRow(product.id)}
                      disabled={savingId === product.id}
                      className="rounded-md border border-purple-400/60 px-2 py-1 text-xs font-semibold text-purple-200 hover:bg-purple-500/10 disabled:opacity-60"
                    >
                      {savingId === product.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </td>
              </tr>
              )
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">
                  No stock items match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Tip: adjust quantity using +/- field for quick changes, then use Save for direct on-hand, reserved, and unit-cost updates.
      </p>
    </div>
  )
}
