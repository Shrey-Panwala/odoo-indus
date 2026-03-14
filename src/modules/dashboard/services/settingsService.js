const STORAGE_KEY = 'odoo.inventory.settings.v1'

const seed = {
  warehouses: [
    { id: 1, name: 'Main Warehouse', short_code: 'WH', address: 'Nirma University Campus' },
  ],
  locations: [
    { id: 1, name: 'A1 Rack', short_code: 'A1', warehouse_id: 1, warehouse_short_code: 'WH' },
  ],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadStore() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = clone(seed)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed.warehouses || !parsed.locations) throw new Error('Invalid settings payload')
    return parsed
  } catch (_error) {
    const fallback = clone(seed)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function saveStore(store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function nextId(list) {
  return list.length ? Math.max(...list.map((item) => Number(item.id || 0))) + 1 : 1
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase()
}

export async function getWarehouses() {
  return loadStore().warehouses
}

export async function getLocations() {
  return loadStore().locations
}

export async function saveWarehouse(payload) {
  const store = loadStore()
  const targetId = Number(payload.id || 0)
  const nextShortCode = normalizeCode(payload.short_code)

  if (!String(payload.name || '').trim() || !nextShortCode || !String(payload.address || '').trim()) {
    throw new Error('Warehouse name, short code and address are required')
  }

  if (targetId > 0) {
    const idx = store.warehouses.findIndex((item) => Number(item.id) === targetId)
    if (idx < 0) throw new Error('Warehouse not found')

    const linkedLocations = store.locations.filter((location) => Number(location.warehouse_id) === targetId)
    const hasMismatch = linkedLocations.some((location) => normalizeCode(location.warehouse_short_code) !== nextShortCode)
    if (hasMismatch) {
      throw new Error('Warehouse short code must match linked location warehouse code. Update location mapping first.')
    }

    store.warehouses[idx] = {
      ...store.warehouses[idx],
      name: payload.name,
      short_code: nextShortCode,
      address: payload.address,
    }

    // Keep location warehouse short-codes in sync after warehouse edits.
    store.locations = store.locations.map((location) => {
      if (Number(location.warehouse_id) !== targetId) return location
      return { ...location, warehouse_short_code: nextShortCode }
    })

    saveStore(store)
    return store.warehouses[idx]
  }

  const item = {
    id: nextId(store.warehouses),
    name: payload.name,
    short_code: nextShortCode,
    address: payload.address,
  }

  store.warehouses.push(item)
  saveStore(store)
  return item
}

export async function saveLocation(payload) {
  const store = loadStore()
  const warehouse = store.warehouses.find((item) => Number(item.id) === Number(payload.warehouse_id))
  if (!warehouse) throw new Error('Please select a valid warehouse')

  const suppliedWarehouseCode = normalizeCode(payload.warehouse_short_code)
  const actualWarehouseCode = normalizeCode(warehouse.short_code)

  if (!String(payload.name || '').trim() || !normalizeCode(payload.short_code)) {
    throw new Error('Location name and short code are required')
  }

  if (!suppliedWarehouseCode) {
    throw new Error('Warehouse short code is required')
  }

  if (suppliedWarehouseCode !== actualWarehouseCode) {
    throw new Error('Warehouse field and warehouse short code do not match')
  }

  const normalized = {
    name: payload.name,
    short_code: normalizeCode(payload.short_code),
    warehouse_id: Number(payload.warehouse_id),
    warehouse_short_code: actualWarehouseCode,
  }

  const targetId = Number(payload.id || 0)
  if (targetId > 0) {
    const idx = store.locations.findIndex((item) => Number(item.id) === targetId)
    if (idx < 0) throw new Error('Location not found')

    store.locations[idx] = {
      ...store.locations[idx],
      ...normalized,
    }
    saveStore(store)
    return store.locations[idx]
  }

  const item = {
    id: nextId(store.locations),
    ...normalized,
  }

  store.locations.push(item)
  saveStore(store)
  return item
}
