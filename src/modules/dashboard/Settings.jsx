import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { getLocations, getWarehouses, saveLocation, saveWarehouse } from './services/settingsService'

function SectionCard({ title, description, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/5"
    >
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-300">{description}</p>
    </button>
  )
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section = String(searchParams.get('section') || '').toLowerCase()

  const [warehouses, setWarehouses] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [warehouseForm, setWarehouseForm] = useState({ id: null, name: '', short_code: '', address: '' })
  const [locationForm, setLocationForm] = useState({ id: null, name: '', short_code: '', warehouse_id: '', warehouse_short_code: '' })

  const selectedWarehouseShortCode = useMemo(() => {
    const selected = warehouses.find((item) => Number(item.id) === Number(locationForm.warehouse_id))
    return selected?.short_code || ''
  }, [warehouses, locationForm.warehouse_id])

  useEffect(() => {
    setLocationForm((prev) => ({ ...prev, warehouse_short_code: selectedWarehouseShortCode }))
  }, [selectedWarehouseShortCode])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [warehouseRows, locationRows] = await Promise.all([getWarehouses(), getLocations()])
      setWarehouses(warehouseRows)
      setLocations(locationRows)
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const openSection = (nextSection) => {
    setSearchParams({ section: nextSection })
    setMessage('')
    setError('')
  }

  const resetSection = () => {
    setSearchParams({})
    setMessage('')
    setError('')
  }

  const submitWarehouse = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!warehouseForm.name.trim() || !warehouseForm.short_code.trim() || !warehouseForm.address.trim()) {
      setError('Name, short code and address are required.')
      return
    }

    try {
      await saveWarehouse({
        id: warehouseForm.id,
        name: warehouseForm.name.trim(),
        short_code: warehouseForm.short_code.trim().toUpperCase(),
        address: warehouseForm.address.trim(),
      })

      setWarehouseForm({ id: null, name: '', short_code: '', address: '' })
      setMessage('Warehouse saved successfully.')
      await loadSettings()
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save warehouse')
    }
  }

  const submitLocation = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!locationForm.name.trim() || !locationForm.short_code.trim() || !locationForm.warehouse_id) {
      setError('Name, short code and warehouse are required.')
      return
    }

    try {
      await saveLocation({
        id: locationForm.id,
        name: locationForm.name.trim(),
        short_code: locationForm.short_code.trim().toUpperCase(),
        warehouse_id: Number(locationForm.warehouse_id),
        warehouse_short_code: locationForm.warehouse_short_code,
      })

      setLocationForm({ id: null, name: '', short_code: '', warehouse_id: '', warehouse_short_code: '' })
      setMessage('Location saved successfully.')
      await loadSettings()
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save location')
    }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold text-white">Settings</h2>
        <p className="mt-1 text-sm text-gray-300">This page contains warehouse details and locations.</p>
      </div>

      {section !== 'warehouse' && section !== 'location' && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard
            title="Warehouse"
            description="Manage warehouse name, short code and address."
            onOpen={() => openSection('warehouse')}
          />
          <SectionCard
            title="Location"
            description="Manage location name, short code and linked warehouse."
            onOpen={() => openSection('location')}
          />
        </div>
      )}

      {section === 'warehouse' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Warehouse</h3>
            <button type="button" onClick={resetSection} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-gray-200">
              Back
            </button>
          </div>

          <form onSubmit={submitWarehouse} className="grid gap-3 md:max-w-xl">
            <div className="grid gap-1">
              <label className="text-sm text-gray-300">Name</label>
              <input
                value={warehouseForm.name}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm text-gray-300">Short Code</label>
              <input
                value={warehouseForm.short_code}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, short_code: event.target.value }))}
                className="rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm text-gray-300">Address</label>
              <input
                value={warehouseForm.address}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, address: event.target.value }))}
                className="rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
              />
            </div>

            <button type="submit" className="mt-2 w-fit rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-100">
              {warehouseForm.id ? 'Update Warehouse' : 'Save Warehouse'}
            </button>
          </form>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Short Code</th>
                  <th className="px-2 py-2">Address</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-t border-white/10 text-gray-200">
                    <td className="px-2 py-2">{warehouse.name}</td>
                    <td className="px-2 py-2">{warehouse.short_code}</td>
                    <td className="px-2 py-2">{warehouse.address}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setWarehouseForm({
                            id: warehouse.id,
                            name: warehouse.name,
                            short_code: warehouse.short_code,
                            address: warehouse.address,
                          })
                        }
                        className="rounded-lg border border-purple-400/50 px-2 py-1 text-xs text-purple-200"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'location' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Location</h3>
            <button type="button" onClick={resetSection} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-gray-200">
              Back
            </button>
          </div>

          <form onSubmit={submitLocation} className="grid gap-3 md:max-w-xl">
            <div className="grid gap-1">
              <label className="text-sm text-gray-300">Name</label>
              <input
                value={locationForm.name}
                onChange={(event) => setLocationForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm text-gray-300">Short Code</label>
              <input
                value={locationForm.short_code}
                onChange={(event) => setLocationForm((prev) => ({ ...prev, short_code: event.target.value }))}
                className="rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm text-gray-300">Warehouse</label>
              <select
                value={locationForm.warehouse_id}
                onChange={(event) => setLocationForm((prev) => ({ ...prev, warehouse_id: event.target.value }))}
                className="rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.short_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm text-gray-300">Warehouse Short Code (must match)</label>
              <input
                value={locationForm.warehouse_short_code}
                readOnly
                className="rounded-lg border border-white/15 bg-gray-950/40 px-3 py-2 text-sm text-cyan-100"
              />
            </div>

            <button type="submit" className="mt-2 w-fit rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-100">
              {locationForm.id ? 'Update Location' : 'Save Location'}
            </button>
          </form>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Short Code</th>
                  <th className="px-2 py-2">Warehouse</th>
                  <th className="px-2 py-2">Warehouse Code</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => {
                  const warehouse = warehouses.find((item) => Number(item.id) === Number(location.warehouse_id))
                  return (
                    <tr key={location.id} className="border-t border-white/10 text-gray-200">
                      <td className="px-2 py-2">{location.name}</td>
                      <td className="px-2 py-2">{location.short_code}</td>
                      <td className="px-2 py-2">{warehouse?.name || '-'}</td>
                      <td className="px-2 py-2">{location.warehouse_short_code}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLocationForm({
                              id: location.id,
                              name: location.name,
                              short_code: location.short_code,
                              warehouse_id: String(location.warehouse_id),
                              warehouse_short_code: location.warehouse_short_code,
                            })
                          }
                          className="rounded-lg border border-purple-400/50 px-2 py-1 text-xs text-purple-200"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading settings...</p>}
      {message && <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
    </motion.section>
  )
}
