const STORAGE_KEY = 'odoo.inventory.stock.v1'

const seedItems = [
  { id: 1, name: 'Desk', sku: 'DSK-001', category: 'Furniture', location: 'A1', unit_cost: 3000, on_hand: 50, reserved_qty: 5 },
  { id: 2, name: 'Table', sku: 'TBL-001', category: 'Furniture', location: 'A1', unit_cost: 3000, on_hand: 50, reserved_qty: 0 },
  { id: 3, name: 'Chair', sku: 'CHR-001', category: 'Furniture', location: 'A2', unit_cost: 1200, on_hand: 80, reserved_qty: 12 },
  { id: 4, name: 'Monitor', sku: 'MNT-001', category: 'Electronics', location: 'B2', unit_cost: 7600, on_hand: 35, reserved_qty: 6 },
  { id: 5, name: 'Keyboard', sku: 'KBD-001', category: 'Electronics', location: 'B3', unit_cost: 1500, on_hand: 90, reserved_qty: 14 },
]

function normalize(item) {
  const onHand = Math.max(Number(item.on_hand ?? item.stock ?? 0), 0)
  const reserved = Math.max(Number(item.reserved_qty ?? 0), 0)

  return {
    ...item,
    unit_cost: Math.max(Number(item.unit_cost ?? 0), 0),
    on_hand: Math.floor(onHand),
    stock: Math.floor(onHand),
    reserved_qty: Math.min(Math.floor(reserved), Math.floor(onHand)),
    free_to_use: Math.max(Math.floor(onHand) - Math.floor(reserved), 0),
  }
}

function readLocal() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = seedItems.map(normalize)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Invalid stock payload')
    return parsed.map(normalize)
  } catch (_error) {
    const seeded = seedItems.map(normalize)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

function writeLocal(items) {
  const normalized = items.map(normalize)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export async function getStockItems() {
  return readLocal()
}

export async function updateStockItem(productId, changes) {
  const items = readLocal()
  const index = items.findIndex((item) => Number(item.id) === Number(productId))
  if (index < 0) {
    throw new Error('Product not found')
  }

  const current = items[index]
  const nextOnHand = changes.onHand === undefined ? current.on_hand : Number(changes.onHand)
  const nextUnitCost = changes.unitCost === undefined ? current.unit_cost : Number(changes.unitCost)
  const nextReservedQty = changes.reservedQty === undefined ? current.reserved_qty : Number(changes.reservedQty)

  if (!Number.isFinite(nextOnHand) || nextOnHand < 0) {
    throw new Error('On hand quantity must be a non-negative number')
  }
  if (!Number.isFinite(nextUnitCost) || nextUnitCost < 0) {
    throw new Error('Unit cost must be a non-negative number')
  }
  if (!Number.isFinite(nextReservedQty) || nextReservedQty < 0) {
    throw new Error('Reserved quantity must be a non-negative number')
  }
  if (nextReservedQty > nextOnHand) {
    throw new Error('Reserved quantity cannot exceed on hand quantity')
  }

  items[index] = normalize({
    ...current,
    unit_cost: nextUnitCost,
    on_hand: nextOnHand,
    reserved_qty: nextReservedQty,
  })

  const saved = writeLocal(items)
  return saved[index]
}

export async function adjustStockItem(productId, delta) {
  const numericDelta = Number(delta)
  if (!Number.isFinite(numericDelta) || numericDelta === 0) {
    throw new Error('Adjustment must be non-zero')
  }

  const items = readLocal()
  const index = items.findIndex((item) => Number(item.id) === Number(productId))
  if (index < 0) {
    throw new Error('Product not found')
  }

  const current = items[index]
  const nextOnHand = Number(current.on_hand) + numericDelta
  if (nextOnHand < 0) {
    throw new Error('Adjustment would make stock negative')
  }

  items[index] = normalize({
    ...current,
    on_hand: nextOnHand,
    reserved_qty: Math.min(Number(current.reserved_qty || 0), nextOnHand),
  })

  const saved = writeLocal(items)
  return saved[index]
}
