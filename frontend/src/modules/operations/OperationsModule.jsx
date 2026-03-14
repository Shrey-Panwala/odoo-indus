import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PackageCheck, Truck, SlidersHorizontal, Search, Plus, Eye, CheckCircle2, RefreshCcw, List, LayoutGrid } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import StatusBadge from './components/StatusBadge'
import AdjustmentForm from './components/AdjustmentForm'
import { getLocations, getProducts, getSuppliers, getWarehouses, getProductAvailableStock, getProductStockByLocation } from './services/masterDataService'
import { createReceipt, getReceiptById, listReceipts, updateReceiptById, validateReceipt } from './services/receiptService'
import { createDelivery, getDeliveryById, listDeliveries, updateDeliveryById, validateDelivery } from './services/deliveryService'
import { createAdjustment, getAdjustmentById, listAdjustments, validateAdjustment } from './services/adjustmentService'

const tabs = [
  { key: 'receipts', label: 'Receipts', icon: PackageCheck },
  { key: 'deliveries', label: 'Delivery Orders', icon: Truck },
  { key: 'adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal },
]

const defaultQuery = {
  search: '',
  status: '',
  page: 1,
  pageSize: 8,
  sortBy: 'created_at',
  sortDir: 'desc',
}

function isPositiveNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0
}

function RowActionButton({ onClick, tone = 'cyan', children }) {
  const classes =
    tone === 'green'
      ? 'border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/10'
      : 'border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/10'

  return (
    <button type="button" onClick={onClick} className={`rounded-lg border px-2 py-1 text-xs ${classes}`}>
      {children}
    </button>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2 py-3">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-10 animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="py-8 text-center text-sm text-gray-400">{text}</p>
}

function mapReceiptToDraft(data, fallbackUser) {
  return {
    id: data?.id || null,
    reference: data?.reference || 'WH/IN/0001',
    supplier_id: data?.supplier_id || '',
    warehouse_id: data?.warehouse_id || '',
    schedule_date: data?.schedule_date || (data?.created_at ? new Date(data.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    responsible: data?.created_by || fallbackUser || 'Current user',
    status: data?.status || 'Draft',
    lines: (data?.lines || []).map((line) => ({
      id: line.id,
      product_id: line.product_id,
      quantity: line.expected_qty ?? line.quantity ?? line.received_qty ?? '',
      received_qty: line.received_qty ?? line.expected_qty ?? line.quantity ?? '',
    })),
  }
}

function mapDeliveryToDraft(data, fallbackUser) {
  return {
    id: data?.id || null,
    reference: data?.reference || 'WH/OUT/0001',
    customer_name: data?.customer_name || '',
    warehouse_id: data?.warehouse_id || '',
    schedule_date: data?.schedule_date || (data?.created_at ? new Date(data.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    responsible: data?.responsible || fallbackUser || 'Current user',
    operation_type: data?.operation_type || 'Delivery',
    status: data?.status || 'Draft',
    lines: (data?.lines || []).map((line) => ({
      id: line.id,
      product_id: line.product_id,
      quantity: line.quantity ?? '',
      available_stock: line.available_stock,
    })),
  }
}

export default function OperationsModule() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabFromUrl = (() => {
    const value = String(searchParams.get('tab') || 'receipts').toLowerCase()
    if (value === 'deliveries' || value === 'adjustments' || value === 'receipts') return value
    return 'receipts'
  })()

  const viewFromUrl = (() => {
    const value = String(searchParams.get('view') || 'list').toLowerCase()
    if (value === 'kanban') return 'kanban'
    return 'list'
  })()

  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [mode, setMode] = useState('list')
  const [query, setQuery] = useState(defaultQuery)
  const [receiptView, setReceiptView] = useState(viewFromUrl)
  const [deliveryView, setDeliveryView] = useState(viewFromUrl)

  const [suppliers, setSuppliers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])

  const [listData, setListData] = useState({ rows: [], page: 1, pageSize: 8, total: 0 })
  const [detailData, setDetailData] = useState(null)
  const [receiptDraft, setReceiptDraft] = useState(null)
  const [deliveryDraft, setDeliveryDraft] = useState(null)

  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState('')

  const loadMasters = async () => {
    const [suppliersRows, warehouseRows, productRows, locationRows] = await Promise.all([
      getSuppliers(),
      getWarehouses(),
      getProducts(),
      getLocations(),
    ])

    setSuppliers(suppliersRows)
    setWarehouses(warehouseRows)
    setProducts(productRows)
    setLocations(locationRows)
  }

  const loadList = async () => {
    setLoading(true)
    setAlert('')
    try {
      let rawData = []
      if (activeTab === 'receipts') {
        rawData = await listReceipts(query)
      } else if (activeTab === 'deliveries') {
        rawData = await listDeliveries(query)
      } else {
        rawData = await listAdjustments(query)
      }

      // Ensure rawData is an array
      if (!Array.isArray(rawData)) {
        if (rawData && Array.isArray(rawData.rows)) {
          rawData = rawData.rows
        } else {
          rawData = []
        }
      }

      // 1. Local search filter
      const q = (query.search || '').toLowerCase()
      let filtered = rawData.filter((row) => {
        if (!q) return true
        const text = `${row.reference} ${row.customer_name || ''} ${row.supplier_name || ''} ${row.reason || ''} ${row.status || ''}`.toLowerCase()
        return text.includes(q)
      })

      // 2. Status filter
      if (query.status) {
        filtered = filtered.filter((row) => row.status === query.status)
      }

      // 3. Local sort
      if (query.sortBy) {
        filtered.sort((a, b) => {
          const valA = a[query.sortBy] || ''
          const valB = b[query.sortBy] || ''
          if (valA < valB) return query.sortDir === 'asc' ? -1 : 1
          if (valA > valB) return query.sortDir === 'asc' ? 1 : -1
          return 0
        })
      }

      // 4. Local pagination
      const page = query.page || 1
      const pageSize = query.pageSize || 8
      const start = (page - 1) * pageSize
      const paged = filtered.slice(start, start + pageSize)

      setListData({ rows: paged, total: filtered.length, page, pageSize })
    } catch (error) {
      setAlert(error?.response?.data?.error || error?.message || 'Unable to load operations data.')
      setListData({ rows: [], total: 0, page: 1, pageSize: 8 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMasters()
  }, [])

  useEffect(() => {
    setActiveTab(tabFromUrl)
    setMode('list')
    setReceiptView(viewFromUrl)
    setDeliveryView(viewFromUrl)
    setReceiptDraft(null)
    setDeliveryDraft(null)
    setDetailData(null)
    setQuery(defaultQuery)
  }, [tabFromUrl, viewFromUrl])

  useEffect(() => {
    if (mode === 'list') {
      loadList()
    }
  }, [activeTab, query.page, query.pageSize, query.search, query.status, query.sortBy, query.sortDir])

  const changePage = (step) => {
    setQuery((prev) => ({ ...prev, page: Math.max(prev.page + step, 1) }))
  }

  const openList = async () => {
    setMode('list')
    setDetailData(null)
    setReceiptDraft(null)
    setDeliveryDraft(null)
    await loadList()
  }

  const openCreate = () => {
    setMode('create')
    setDetailData(null)

    if (activeTab === 'receipts') {
      setReceiptDraft(
        mapReceiptToDraft(
          {
            reference: `WH/IN/${String((listData.total || 0) + 1).padStart(4, '0')}`,
            status: 'Draft',
            lines: [{ product_id: '', expected_qty: '', received_qty: '' }],
          },
          user?.fullName,
        ),
      )
    }

    if (activeTab === 'deliveries') {
      setDeliveryDraft(
        mapDeliveryToDraft(
          {
            reference: `WH/OUT/${String((listData.total || 0) + 1).padStart(4, '0')}`,
            status: 'Draft',
            lines: [{ product_id: '', quantity: '' }],
          },
          user?.fullName,
        ),
      )
    }
  }

  const openDetail = async (id) => {
    setLoading(true)
    setAlert('')
    try {
      if (activeTab === 'receipts') {
        const detail = await getReceiptById(id)
        setDetailData(detail)
        setReceiptDraft(mapReceiptToDraft(detail, user?.fullName))
      } else if (activeTab === 'deliveries') {
        const detail = await getDeliveryById(id)
        setDetailData(detail)
        setDeliveryDraft(mapDeliveryToDraft(detail, user?.fullName))
      } else {
        setDetailData(await getAdjustmentById(id))
      }
      setMode('detail')
    } catch (error) {
      setAlert(error?.response?.data?.error || error?.message || 'Unable to load details.')
    } finally {
      setLoading(false)
    }
  }

  const saveReceiptDraft = async () => {
    if (!receiptDraft) return null

    if (!receiptDraft.schedule_date) {
      setAlert('Schedule date is required for receipt.')
      return null
    }

    const lineProductIds = new Set()
    for (const line of receiptDraft.lines || []) {
      if (!line.product_id) continue
      if (!isPositiveNumber(line.quantity) || !isPositiveNumber(line.received_qty || line.quantity)) {
        setAlert('Each receipt line must have a product and quantity greater than zero.')
        return null
      }
      if (Number(line.received_qty || line.quantity) > Number(line.quantity)) {
        setAlert('Received quantity cannot exceed ordered quantity.')
        return null
      }
      if (lineProductIds.has(String(line.product_id))) {
        setAlert('Duplicate product lines are not allowed in the same receipt.')
        return null
      }
      lineProductIds.add(String(line.product_id))
    }

    const lines = (receiptDraft.lines || [])
      .filter((line) => line.product_id)
      .map((line) => ({
        product_id: Number(line.product_id),
        expected_qty: Number(line.quantity),
        received_qty: Number(line.received_qty || line.quantity),
      }))

    if (!receiptDraft.supplier_id || !receiptDraft.warehouse_id || !lines.length) {
      setAlert('Supplier, warehouse and product lines are required.')
      return null
    }

    setLoading(true)
    setAlert('')
    try {
      if (receiptDraft.id) {
        await updateReceiptById(receiptDraft.id, {
          supplier_id: Number(receiptDraft.supplier_id),
          warehouse_id: Number(receiptDraft.warehouse_id),
          schedule_date: receiptDraft.schedule_date,
          created_by: receiptDraft.responsible,
          lines,
        })
        setAlert('Receipt details updated.')
        return receiptDraft.id
      }

      const created = await createReceipt({
        supplier_id: Number(receiptDraft.supplier_id),
        warehouse_id: Number(receiptDraft.warehouse_id),
        schedule_date: receiptDraft.schedule_date,
        created_by: receiptDraft.responsible,
        lines,
      })

      const nextId = created?.id || null
      setReceiptDraft((prev) => ({ ...prev, id: nextId, reference: created?.reference || prev.reference }))
      setAlert('New receipt created.')
      await loadList()
      return nextId
    } catch (error) {
      setAlert(error?.response?.data?.error || error?.message || 'Unable to save receipt.')
      return null
    } finally {
      setLoading(false)
    }
  }

  const runReceiptPrimaryAction = async () => {
    if (!receiptDraft) return

    if (receiptDraft.status === 'Draft') {
      setReceiptDraft((prev) => ({ ...prev, status: 'Ready' }))
      setAlert('Receipt moved to Ready.')
      return
    }

    if (receiptDraft.status === 'Ready') {
      const receiptId = (await saveReceiptDraft()) || receiptDraft.id
      if (!receiptId) return

      setLoading(true)
      setAlert('')
      try {
        await validateReceipt(receiptId)
        setReceiptDraft((prev) => ({ ...prev, status: 'Done', id: receiptId }))
        setAlert('Receipt validated and moved to Done.')
        await loadList()
      } catch (error) {
        setAlert(error?.response?.data?.error || error?.message || 'Receipt validation failed.')
      } finally {
        setLoading(false)
      }
    }
  }

  const saveDeliveryDraft = async () => {
    if (!deliveryDraft) return null

    if (!deliveryDraft.schedule_date) {
      setAlert('Schedule date is required for delivery.')
      return null
    }

    const lineProductIds = new Set()
    for (const line of deliveryDraft.lines || []) {
      if (!line.product_id) continue
      if (!isPositiveNumber(line.quantity)) {
        setAlert('Each delivery line must have a product and quantity greater than zero.')
        return null
      }
      if (lineProductIds.has(String(line.product_id))) {
        setAlert('Duplicate product lines are not allowed in the same delivery order.')
        return null
      }
      lineProductIds.add(String(line.product_id))
    }

    const lines = (deliveryDraft.lines || [])
      .filter((line) => line.product_id)
      .map((line) => ({ product_id: Number(line.product_id), quantity: Number(line.quantity) }))

    if (!deliveryDraft.customer_name || !deliveryDraft.warehouse_id || !lines.length) {
      setAlert('Delivery address, warehouse and product lines are required.')
      return null
    }

    if (hasOutOfStockLine) {
      setAlert('Cannot save delivery while some lines exceed available stock.')
      return null
    }

    setLoading(true)
    setAlert('')
    try {
      if (deliveryDraft.id) {
        await updateDeliveryById(deliveryDraft.id, {
          customer_name: deliveryDraft.customer_name,
          warehouse_id: Number(deliveryDraft.warehouse_id),
          schedule_date: deliveryDraft.schedule_date,
          operation_type: deliveryDraft.operation_type,
          responsible: deliveryDraft.responsible,
          lines,
        })
        setAlert('Delivery details updated.')
        return deliveryDraft.id
      }

      const created = await createDelivery({
        customer_name: deliveryDraft.customer_name,
        warehouse_id: Number(deliveryDraft.warehouse_id),
        schedule_date: deliveryDraft.schedule_date,
        operation_type: deliveryDraft.operation_type,
        responsible: deliveryDraft.responsible,
        lines,
      })

      const nextId = created?.id || null
      setDeliveryDraft((prev) => ({ ...prev, id: nextId, reference: created?.reference || prev.reference }))
      setAlert('New delivery created.')
      await loadList()
      return nextId
    } catch (error) {
      setAlert(error?.response?.data?.error || error?.message || 'Unable to save delivery.')
      return null
    } finally {
      setLoading(false)
    }
  }

  const runDeliveryValidateFlow = async () => {
    if (!deliveryDraft) return

    if (deliveryDraft.status === 'Draft') {
      setDeliveryDraft((prev) => ({ ...prev, status: 'Waiting' }))
      setAlert('Delivery moved to Waiting.')
      return
    }

    if (deliveryDraft.status === 'Waiting') {
      setDeliveryDraft((prev) => ({ ...prev, status: 'Ready' }))
      setAlert('Delivery moved to Ready.')
      return
    }

    if (deliveryDraft.status === 'Ready') {
      const deliveryId = (await saveDeliveryDraft()) || deliveryDraft.id
      if (!deliveryId) return

      setLoading(true)
      setAlert('')
      try {
        await validateDelivery(deliveryId)
        setDeliveryDraft((prev) => ({ ...prev, status: 'Done', id: deliveryId }))
        setAlert('Delivery validated and moved to Done.')
        await loadList()
      } catch (error) {
        setAlert(error?.response?.data?.error || error?.message || 'Delivery validation failed.')
      } finally {
        setLoading(false)
      }
    }
  }

  const receiptKanbanColumns = useMemo(() => {
    const groups = { Draft: [], Waiting: [], Ready: [], Done: [], Canceled: [] }
    listData.rows.forEach((row) => {
      const status = row.status || 'Draft'
      if (!groups[status]) groups[status] = []
      groups[status].push(row)
    })
    return groups
  }, [listData.rows])

  const deliveryKanbanColumns = useMemo(() => {
    const groups = { Draft: [], Waiting: [], Ready: [], Done: [] }
    listData.rows.forEach((row) => {
      const status = row.status || 'Draft'
      if (!groups[status]) groups[status] = []
      groups[status].push(row)
    })
    return groups
  }, [listData.rows])

  const hasOutOfStockLine = useMemo(() => {
    if (activeTab !== 'deliveries') return false
    return (deliveryDraft?.lines || []).some((line) => {
      const qty = Number(line.quantity || 0)
      const available = Number(line.available_stock || 0)
      return line.product_id && qty > 0 && available >= 0 && qty > available
    })
  }, [activeTab, deliveryDraft])

  const setDeliveryProduct = async (index, productIdValue) => {
    const warehouseId = Number(deliveryDraft?.warehouse_id || 0)
    const productId = Number(productIdValue || 0)
    const availableStock = productId > 0 && warehouseId > 0
      ? await getProductAvailableStock(productId, warehouseId)
      : 0

    setDeliveryDraft((prev) => {
      const lines = [...(prev?.lines || [])]
      lines[index] = { ...lines[index], product_id: productIdValue, available_stock: availableStock }
      return { ...prev, lines }
    })
  }

  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-2xl font-bold text-white">Operations</h2>
        <p className="mt-1 text-sm text-gray-300">Professional stock movement workflows with validation and movement traceability.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSearchParams({ tab: key, view: 'list' })
                  setActiveTab(key)
                  setMode('list')
                  setQuery(defaultQuery)
                  setDetailData(null)
                  setReceiptDraft(null)
                  setDeliveryDraft(null)
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  active
                    ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200'
                    : 'border-white/15 bg-white/5 text-gray-200 hover:border-white/30'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </div>
      </header>

      {alert && <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{alert}</div>}

      <div className="grid gap-4 xl:grid-cols-1">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {activeTab === 'receipts' ? 'Incoming Receipts' : activeTab === 'deliveries' ? 'Delivery Orders' : 'Stock Adjustments'}
                </h3>
                <p className="text-xs text-gray-400">
                  {activeTab === 'receipts'
                    ? 'Capture incoming supplier stock and validate inventory receipts safely.'
                    : activeTab === 'deliveries'
                      ? 'Process outbound customer deliveries with stock safety checks.'
                      : 'Correct stock mismatches using controlled cycle-count adjustments.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={loadList} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-gray-200">
                  <RefreshCcw size={13} /> Refresh
                </button>
                {activeTab === 'adjustments' && (
                  <button type="button" onClick={openCreate} className="inline-flex items-center gap-1 rounded-lg border border-purple-400/50 px-3 py-2 text-xs text-purple-200">
                    <Plus size={13} /> Create
                  </button>
                )}
              </div>
            </div>

            {mode === 'list' && activeTab === 'receipts' && (
              <>
                <div className="rounded-xl border border-white/10 bg-white/5">
                  <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                    <button type="button" onClick={openCreate} className="rounded-lg border border-amber-300/60 px-3 py-1 text-xs font-semibold text-amber-100">NEW</button>
                    <h4 className="text-2xl font-semibold text-amber-50">Receipts</h4>

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <div className="relative w-64 max-w-full">
                        <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
                        <input
                          value={query.search}
                          onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                          placeholder="Search reference or contacts"
                          className="w-full rounded-lg border border-white/15 bg-gray-950/60 py-2 pl-9 pr-3 text-sm text-gray-100"
                        />
                      </div>

                      <button type="button" onClick={() => { setReceiptView('list'); setSearchParams({ tab: 'receipts', view: 'list' }) }} className={`rounded-lg border px-2 py-2 ${receiptView === 'list' ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200' : 'border-white/20 text-gray-300'}`}><List size={14} /></button>
                      <button type="button" onClick={() => { setReceiptView('kanban'); setSearchParams({ tab: 'receipts', view: 'kanban' }) }} className={`rounded-lg border px-2 py-2 ${receiptView === 'kanban' ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200' : 'border-white/20 text-gray-300'}`}><LayoutGrid size={14} /></button>
                    </div>
                  </div>

                  {loading ? <ListSkeleton /> : receiptView === 'list' ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-2 py-2">Reference</th>
                            <th className="px-2 py-2">From</th>
                            <th className="px-2 py-2">To</th>
                            <th className="px-2 py-2">Contact</th>
                            <th className="px-2 py-2">Schedule date</th>
                            <th className="px-2 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listData.rows.map((row) => (
                            <tr key={row.id} className="cursor-pointer border-t border-white/10 text-sm text-gray-200 hover:bg-white/5" onClick={() => openDetail(row.id)}>
                              <td className="px-2 py-2 font-medium text-cyan-100">{row.reference}</td>
                              <td className="px-2 py-2">{row.supplier_name || 'vendor'}</td>
                              <td className="px-2 py-2">{row.warehouse_name ? `WH/${row.warehouse_name}` : 'WH/Stock1'}</td>
                              <td className="px-2 py-2">{row.supplier_name || row.created_by || '-'}</td>
                              <td className="px-2 py-2">{new Date(row.schedule_date || row.created_at).toLocaleDateString()}</td>
                              <td className="px-2 py-2"><StatusBadge value={row.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!listData.rows.length && <EmptyState text="No receipts found." />}
                    </div>
                  ) : (
                    <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-5">
                      {Object.entries(receiptKanbanColumns).map(([status, rows]) => (
                        <div key={status} className="rounded-xl border border-white/10 bg-white/5 p-2">
                          <div className="mb-2 flex items-center justify-between"><StatusBadge value={status} /><span className="text-xs text-gray-400">{rows.length}</span></div>
                          <div className="space-y-2">
                            {rows.map((row) => (
                              <button key={row.id} type="button" onClick={() => openDetail(row.id)} className="w-full rounded-lg border border-white/10 bg-gray-950/40 px-2 py-2 text-left text-xs text-gray-200 hover:border-cyan-400/40">
                                <p className="font-semibold text-cyan-100">{row.reference}</p>
                                <p>{row.supplier_name || 'vendor'}</p>
                              </button>
                            ))}
                            {!rows.length && <p className="text-xs text-gray-500">No items</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === 'list' && activeTab === 'deliveries' && (
              <>
                <div className="rounded-xl border border-white/10 bg-white/5">
                  <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                    <button type="button" onClick={openCreate} className="rounded-lg border border-amber-300/60 px-3 py-1 text-xs font-semibold text-amber-100">NEW</button>
                    <h4 className="text-2xl font-semibold text-amber-50">Delivery</h4>

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <div className="relative w-64 max-w-full">
                        <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
                        <input
                          value={query.search}
                          onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                          placeholder="Search reference or contacts"
                          className="w-full rounded-lg border border-white/15 bg-gray-950/60 py-2 pl-9 pr-3 text-sm text-gray-100"
                        />
                      </div>

                      <button type="button" onClick={() => { setDeliveryView('list'); setSearchParams({ tab: 'deliveries', view: 'list' }) }} className={`rounded-lg border px-2 py-2 ${deliveryView === 'list' ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200' : 'border-white/20 text-gray-300'}`}><List size={14} /></button>
                      <button type="button" onClick={() => { setDeliveryView('kanban'); setSearchParams({ tab: 'deliveries', view: 'kanban' }) }} className={`rounded-lg border px-2 py-2 ${deliveryView === 'kanban' ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200' : 'border-white/20 text-gray-300'}`}><LayoutGrid size={14} /></button>
                    </div>
                  </div>

                  {loading ? <ListSkeleton /> : deliveryView === 'list' ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-2 py-2">Reference</th>
                            <th className="px-2 py-2">From</th>
                            <th className="px-2 py-2">To</th>
                            <th className="px-2 py-2">Contact</th>
                            <th className="px-2 py-2">Schedule date</th>
                            <th className="px-2 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listData.rows.map((row) => (
                            <tr key={row.id} className="cursor-pointer border-t border-white/10 text-sm text-gray-200 hover:bg-white/5" onClick={() => openDetail(row.id)}>
                              <td className="px-2 py-2 font-medium text-cyan-100">{row.reference}</td>
                              <td className="px-2 py-2">{row.warehouse_name ? `WH/${row.warehouse_name}` : 'WH/Stock1'}</td>
                              <td className="px-2 py-2">{row.customer_name || 'vendor'}</td>
                              <td className="px-2 py-2">{row.customer_name || '-'}</td>
                              <td className="px-2 py-2">{new Date(row.schedule_date || row.created_at).toLocaleDateString()}</td>
                              <td className="px-2 py-2"><StatusBadge value={row.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!listData.rows.length && <EmptyState text="No deliveries found." />}
                    </div>
                  ) : (
                    <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
                      {Object.entries(deliveryKanbanColumns).map(([status, rows]) => (
                        <div key={status} className="rounded-xl border border-white/10 bg-white/5 p-2">
                          <div className="mb-2 flex items-center justify-between"><StatusBadge value={status} /><span className="text-xs text-gray-400">{rows.length}</span></div>
                          <div className="space-y-2">
                            {rows.map((row) => (
                              <button key={row.id} type="button" onClick={() => openDetail(row.id)} className="w-full rounded-lg border border-white/10 bg-gray-950/40 px-2 py-2 text-left text-xs text-gray-200 hover:border-cyan-400/40">
                                <p className="font-semibold text-cyan-100">{row.reference}</p>
                                <p>{row.customer_name || 'vendor'}</p>
                              </button>
                            ))}
                            {!rows.length && <p className="text-xs text-gray-500">No items</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {(mode === 'create' || mode === 'detail') && activeTab === 'receipts' && receiptDraft && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
                  <button type="button" onClick={openCreate} className="rounded-lg border border-amber-300/60 px-3 py-1 text-xs font-semibold text-amber-100">New</button>
                  <h4 className="text-2xl font-semibold text-amber-50">Receipt</h4>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-gray-950/30 px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={runReceiptPrimaryAction} disabled={loading || receiptDraft.status === 'Done'} className="rounded-lg border border-cyan-400/60 px-3 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-40">
                      {receiptDraft.status === 'Draft' ? 'To Do' : receiptDraft.status === 'Ready' ? 'Validate' : 'Done'}
                    </button>
                    <button type="button" onClick={() => saveReceiptDraft()} disabled={loading} className="rounded-lg border border-purple-400/60 px-3 py-1 text-xs font-semibold text-purple-100 disabled:opacity-40">Save</button>
                    <button type="button" onClick={() => window.print()} disabled={receiptDraft.status !== 'Done'} className="rounded-lg border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-100 disabled:opacity-40">Print</button>
                    <button type="button" onClick={openList} className="rounded-lg border border-rose-400/60 px-3 py-1 text-xs font-semibold text-rose-100">Cancel</button>
                  </div>
                  <div className="rounded-lg border border-white/15 px-3 py-1 text-xs text-gray-200">Draft &gt; Ready &gt; Done</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xl font-semibold text-cyan-100">{receiptDraft.reference}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Receive From</label>
                      <select value={receiptDraft.supplier_id} onChange={(e) => setReceiptDraft((prev) => ({ ...prev, supplier_id: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                        <option value="">Select supplier</option>
                        {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Schedule Date</label>
                      <input type="date" value={receiptDraft.schedule_date} onChange={(e) => setReceiptDraft((prev) => ({ ...prev, schedule_date: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Responsible</label>
                      <input value={receiptDraft.responsible} onChange={(e) => setReceiptDraft((prev) => ({ ...prev, responsible: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/40 px-3 py-2 text-sm text-gray-300" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">To Warehouse</label>
                      <select value={receiptDraft.warehouse_id} onChange={(e) => setReceiptDraft((prev) => ({ ...prev, warehouse_id: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                        <option value="">Select warehouse</option>
                        {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5">
                  <div className="border-b border-white/10 px-3 py-2 text-sm font-semibold text-gray-100">Products</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Quantity</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(receiptDraft.lines || []).map((line, index) => (
                          <tr key={index} className="border-t border-white/10 text-gray-200">
                            <td className="px-3 py-2">
                              <select value={line.product_id} onChange={(e) => setReceiptDraft((prev) => {
                                const lines = [...prev.lines]
                                lines[index] = { ...lines[index], product_id: e.target.value }
                                return { ...prev, lines }
                              })} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                                <option value="">Select product</option>
                                {products.map((product) => <option key={product.id} value={product.id}>{product.sku ? `[${product.sku}] ` : ''}{product.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="1" value={line.quantity} onChange={(e) => setReceiptDraft((prev) => {
                                const lines = [...prev.lines]
                                lines[index] = { ...lines[index], quantity: e.target.value, received_qty: e.target.value }
                                return { ...prev, lines }
                              })} className="w-32 rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100" />
                            </td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => setReceiptDraft((prev) => {
                                const lines = prev.lines.filter((_, i) => i !== index)
                                return { ...prev, lines: lines.length ? lines : [{ product_id: '', quantity: '', received_qty: '' }] }
                              })} className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs text-rose-200">Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-white/10 px-3 py-2">
                    <button type="button" onClick={() => setReceiptDraft((prev) => ({ ...prev, lines: [...prev.lines, { product_id: '', quantity: '', received_qty: '' }] }))} className="rounded-lg border border-cyan-400/50 px-3 py-1 text-xs font-semibold text-cyan-200">New Product</button>
                  </div>
                </div>
              </motion.div>
            )}

            {(mode === 'create' || mode === 'detail') && activeTab === 'deliveries' && deliveryDraft && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
                  <button type="button" onClick={openCreate} className="rounded-lg border border-amber-300/60 px-3 py-1 text-xs font-semibold text-amber-100">New</button>
                  <h4 className="text-2xl font-semibold text-amber-50">Delivery</h4>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-gray-950/30 px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={runDeliveryValidateFlow} disabled={loading || deliveryDraft.status === 'Done'} className="rounded-lg border border-cyan-400/60 px-3 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-40">Validate</button>
                    <button type="button" onClick={() => saveDeliveryDraft()} disabled={loading} className="rounded-lg border border-purple-400/60 px-3 py-1 text-xs font-semibold text-purple-100 disabled:opacity-40">Save</button>
                    <button type="button" onClick={() => window.print()} disabled={deliveryDraft.status !== 'Done'} className="rounded-lg border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-100 disabled:opacity-40">Print</button>
                    <button type="button" onClick={openList} className="rounded-lg border border-rose-400/60 px-3 py-1 text-xs font-semibold text-rose-100">Cancel</button>
                  </div>
                  <div className="rounded-lg border border-white/15 px-3 py-1 text-xs text-gray-200">Draft &gt; Waiting &gt; Ready &gt; Done</div>
                </div>

                {hasOutOfStockLine && (
                  <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    Some product lines exceed available stock. Marked rows are highlighted.
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xl font-semibold text-cyan-100">{deliveryDraft.reference}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Delivery Address</label>
                      <input value={deliveryDraft.customer_name} onChange={(e) => setDeliveryDraft((prev) => ({ ...prev, customer_name: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Schedule Date</label>
                      <input type="date" value={deliveryDraft.schedule_date} onChange={(e) => setDeliveryDraft((prev) => ({ ...prev, schedule_date: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Responsible</label>
                      <input value={deliveryDraft.responsible} onChange={(e) => setDeliveryDraft((prev) => ({ ...prev, responsible: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/40 px-3 py-2 text-sm text-gray-300" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Operation type</label>
                      <select value={deliveryDraft.operation_type} onChange={(e) => setDeliveryDraft((prev) => ({ ...prev, operation_type: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                        <option value="Delivery">Delivery</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Return">Return</option>
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-gray-400">From Warehouse</label>
                      <select value={deliveryDraft.warehouse_id} onChange={(e) => setDeliveryDraft((prev) => ({ ...prev, warehouse_id: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                        <option value="">Select warehouse</option>
                        {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5">
                  <div className="border-b border-white/10 px-3 py-2 text-sm font-semibold text-gray-100">Products</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Quantity</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(deliveryDraft.lines || []).map((line, index) => {
                          const outOfStock = line.product_id && Number(line.quantity || 0) > Number(line.available_stock || 0)
                          return (
                            <tr key={index} className={`border-t text-gray-200 ${outOfStock ? 'border-rose-400/40 bg-rose-500/10' : 'border-white/10'}`}>
                              <td className="px-3 py-2">
                                <select value={line.product_id} onChange={(e) => setDeliveryProduct(index, e.target.value)} className="w-full rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                                  <option value="">Select product</option>
                                  {products.map((product) => <option key={product.id} value={product.id}>{product.sku ? `[${product.sku}] ` : ''}{product.name}</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="1" value={line.quantity} onChange={(e) => setDeliveryDraft((prev) => {
                                  const lines = [...prev.lines]
                                  lines[index] = { ...lines[index], quantity: e.target.value }
                                  return { ...prev, lines }
                                })} className="w-32 rounded-lg border border-white/15 bg-gray-950/70 px-3 py-2 text-sm text-gray-100" />
                                {line.available_stock !== undefined && <p className="mt-1 text-xs text-gray-400">Available: {line.available_stock}</p>}
                              </td>
                              <td className="px-3 py-2">
                                <button type="button" onClick={() => setDeliveryDraft((prev) => {
                                  const lines = prev.lines.filter((_, i) => i !== index)
                                  return { ...prev, lines: lines.length ? lines : [{ product_id: '', quantity: '' }] }
                                })} className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs text-rose-200">Remove</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-white/10 px-3 py-2">
                    <button type="button" onClick={() => setDeliveryDraft((prev) => ({ ...prev, lines: [...prev.lines, { product_id: '', quantity: '' }] }))} className="rounded-lg border border-cyan-400/50 px-3 py-1 text-xs font-semibold text-cyan-200">New Product</button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'list' && activeTab === 'adjustments' && (
              <>
                <div className="mb-3 grid gap-2 md:grid-cols-[1.5fr_1fr_1fr]">
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
                    <input
                      value={query.search}
                      onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                      placeholder="Search reference or reason"
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-gray-100"
                    />
                  </div>
                  <select value={query.status} onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, status: event.target.value }))} className="rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                    <option value="">All statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Done">Done</option>
                  </select>
                  <select value={`${query.sortBy}:${query.sortDir}`} onChange={(event) => {
                    const [sortBy, sortDir] = event.target.value.split(':')
                    setQuery((prev) => ({ ...prev, sortBy, sortDir }))
                  }} className="rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-100">
                    <option value="created_at:desc">Newest First</option>
                    <option value="created_at:asc">Oldest First</option>
                  </select>
                </div>

                {loading ? <ListSkeleton /> : listData.rows.length === 0 ? <EmptyState text="No records found for current filters." /> : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="px-2 py-2">Reference</th>
                          <th className="px-2 py-2">Reason</th>
                          <th className="px-2 py-2">Location</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Created</th>
                          <th className="px-2 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listData.rows.map((row) => (
                          <tr key={row.id} className="border-t border-white/10 text-sm text-gray-200">
                            <td className="px-2 py-2 font-medium">{row.reference}</td>
                            <td className="px-2 py-2">{row.reason}</td>
                            <td className="px-2 py-2">{row.location_name || '-'}</td>
                            <td className="px-2 py-2"><StatusBadge value={row.status} /></td>
                            <td className="px-2 py-2 text-gray-400">{new Date(row.created_at).toLocaleString()}</td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap gap-1">
                                <RowActionButton onClick={() => openDetail(row.id)}><span className="inline-flex items-center gap-1"><Eye size={12} /> View</span></RowActionButton>
                                <RowActionButton tone="green" onClick={() => validateAdjustment(row.id)}><span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> Validate</span></RowActionButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {mode === 'create' && activeTab === 'adjustments' && (
              <AdjustmentForm
                locations={locations}
                products={products}
                stockResolver={getProductStockByLocation}
                onSubmit={async (payload) => {
                  await createAdjustment(payload)
                  setAlert('Record created successfully.')
                  await openList()
                }}
                onCancel={openList}
              />
            )}

            {mode === 'detail' && activeTab === 'adjustments' && detailData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{detailData.reference}</h4>
                    <p className="text-xs text-gray-400">{detailData.location_name} · {detailData.reason}</p>
                  </div>
                  <StatusBadge value={detailData.status} />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="px-2 py-2">Product</th>
                        <th className="px-2 py-2">System</th>
                        <th className="px-2 py-2">Counted</th>
                        <th className="px-2 py-2">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailData.lines || []).map((line) => (
                        <tr key={line.id} className="border-t border-white/10 text-gray-200">
                          <td className="px-2 py-2">{line.product_name}</td>
                          <td className="px-2 py-2">{line.system_qty}</td>
                          <td className="px-2 py-2">{line.counted_qty}</td>
                          <td className="px-2 py-2">{line.difference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={openList} className="rounded-lg border border-white/20 px-3 py-2 text-xs text-gray-200">Back</button>
                </div>
              </motion.div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-400">Showing {(listData.page - 1) * listData.pageSize + 1} to {Math.min(listData.page * listData.pageSize, listData.total)} of {listData.total}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => changePage(-1)} disabled={listData.page <= 1} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-gray-200 disabled:opacity-40">Prev</button>
                <button type="button" onClick={() => changePage(1)} disabled={listData.page * listData.pageSize >= listData.total} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-gray-200 disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
