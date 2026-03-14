import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import apiClient from '../../../services/apiClient'

const COLORS = ['#47bedf', '#0ea5c6', '#f59e0b', '#34d399', '#fb7185', '#14b8a6', '#38bdf8', '#f97316', '#22c55e', '#ef4444']

function chartTooltip() {
  return {
    contentStyle: {
      background: 'rgba(6, 18, 25, 0.92)',
      border: '1px solid rgba(152,170,184,0.25)',
      color: '#e6edf3',
      borderRadius: '12px',
    },
  }
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`p-4 rounded-2xl border border-cyan-300/15 bg-white/[0.045] backdrop-blur-xl shadow-[0_12px_30px_rgba(2,10,18,0.42)] ${className}`}
    >
      <div className="mb-3">
        <h4 className="text-sm text-slate-100 font-semibold tracking-wide">{title}</h4>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
}

function InsightPill({ tone }) {
  const toneClass = tone === 'critical'
    ? 'bg-rose-500/15 text-rose-200 border border-rose-400/30'
    : tone === 'watch'
      ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
      : tone === 'good'
        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
        : 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30'

  const label = tone === 'critical' ? 'Critical' : tone === 'watch' ? 'Watch' : tone === 'good' ? 'Good' : 'Info'
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${toneClass}`}>{label}</span>
}

function prettifyTxnType(value) {
  if (!value) return 'Unknown'
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function prettifyStatus(value) {
  if (!value) return 'Unknown'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function StockChart(){
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState({
    productsByCategory: [],
    stockByWarehouse: [],
    topProducts: [],
    statusDistribution: [],
    statusByDocument: {
      receipts: [],
      deliveries: [],
      transfers: [],
      adjustments: [],
    },
    ledgerDailyFlow: [],
    movementMix: [],
    locationHeatmap: [],
    filterOptions: {
      warehouses: [],
      categories: [],
      movementTypes: [],
    },
  })

  const [docType, setDocType] = useState('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTxnType, setSelectedTxnType] = useState('all')
  const [dayWindow, setDayWindow] = useState(14)

  useEffect(() => {
    setLoading(true)
    const params = {
      documentType: docType,
      warehouse: selectedWarehouse,
      category: selectedCategory,
      movementType: selectedTxnType,
      dayWindow,
    }

    apiClient.get('/dashboard/analytics', { params })
      .then((res) => {
        const data = res.data || {}
        setAnalytics({
          productsByCategory: data.productsByCategory || [],
          stockByWarehouse: data.stockByWarehouse || [],
          topProducts: data.topProducts || [],
          statusDistribution: data.statusDistribution || [],
          statusByDocument: data.statusByDocument || {
            receipts: [], deliveries: [], transfers: [], adjustments: [],
          },
          ledgerDailyFlow: data.ledgerDailyFlow || [],
          movementMix: data.movementMix || [],
          locationHeatmap: data.locationHeatmap || [],
          filterOptions: data.filterOptions || {
            warehouses: [],
            categories: [],
            movementTypes: [],
          },
        })
        setError('')
      })
      .catch(() => {
        setError('Unable to load chart analytics right now.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [docType, selectedWarehouse, selectedCategory, selectedTxnType, dayWindow])

  const categories = useMemo(
    () => analytics.filterOptions?.categories || [],
    [analytics.filterOptions],
  )

  const warehouses = useMemo(
    () => analytics.filterOptions?.warehouses || [],
    [analytics.filterOptions],
  )

  const categoryData = (analytics.productsByCategory || []).slice(0, 8).map((item) => ({
    name: item.category,
    stock: Number(item.stock || 0),
  }))

  const filteredTopProducts = (analytics.topProducts || [])
    .slice(0, 8)
    .map((item) => ({
      name: item.product,
      stock: Number(item.stock || 0),
      category: item.category,
    }))

  const warehouseData = (analytics.stockByWarehouse || [])
    .map((item) => ({
      name: item.warehouse,
      stock: Number(item.stock || 0),
    }))

  const statusSource = docType === 'all'
    ? analytics.statusDistribution || []
    : (analytics.statusByDocument?.[docType] || [])

  const statusData = statusSource.map((item) => ({
    status: prettifyStatus(item.status),
    count: Number(item.count || 0),
  }))

  const movementMixData = (analytics.movementMix || [])
    .slice(0, 8)
    .map((item) => ({
    type: prettifyTxnType(item.txn_type),
    rawType: item.txn_type,
    volume: Number(item.volume || 0),
  }))

  const locationData = (analytics.locationHeatmap || [])
    .slice(0, 10)
    .map((item) => ({
      name: `${item.warehouse} / ${item.location}`,
      stock: Number(item.stock || 0),
    }))

  const flowData = (analytics.ledgerDailyFlow || []).map((item) => ({
    day: item.day,
    incoming: Number(item.incoming || 0),
    outgoing: Number(item.outgoing || 0),
    net: Number(item.net || 0),
  }))

  const insights = useMemo(() => {
    const items = []
    const totalStock = (analytics.productsByCategory || []).reduce((sum, r) => sum + Number(r.stock || 0), 0)
    const topCategory = (analytics.productsByCategory || [])[0]
    const lowWarehouse = [...(analytics.stockByWarehouse || [])]
      .map((r) => ({ warehouse: r.warehouse, stock: Number(r.stock || 0) }))
      .sort((a, b) => a.stock - b.stock)[0]
    const last7 = (analytics.ledgerDailyFlow || []).slice(-7)
    const weeklyIncoming = last7.reduce((sum, r) => sum + Number(r.incoming || 0), 0)
    const weeklyOutgoing = last7.reduce((sum, r) => sum + Number(r.outgoing || 0), 0)
    const net7 = weeklyIncoming - weeklyOutgoing
    const doneCount = (analytics.statusDistribution || []).find((r) => r.status === 'done')
    const totalOps = (analytics.statusDistribution || []).reduce((sum, r) => sum + Number(r.count || 0), 0)
    const doneRate = totalOps > 0 ? (Number(doneCount?.count || 0) * 100) / totalOps : 0
    const topTxn = [...(analytics.movementMix || [])]
      .map((r) => ({ type: r.txn_type, volume: Number(r.volume || 0) }))
      .sort((a, b) => b.volume - a.volume)[0]

    if (topCategory && totalStock > 0) {
      const share = ((Number(topCategory.stock || 0) * 100) / totalStock).toFixed(1)
      items.push({ tone: Number(share) > 40 ? 'watch' : 'info', text: `${topCategory.category} holds ${share}% of total inventory. Keep stock spread balanced.` })
    }

    if (lowWarehouse) {
      items.push({ tone: lowWarehouse.stock < 500 ? 'critical' : 'watch', text: `${lowWarehouse.warehouse} currently has the lowest stock at ${lowWarehouse.stock} units.` })
    }

    items.push({
      tone: net7 >= 0 ? 'good' : 'critical',
      text: `7-day net stock change is ${net7 >= 0 ? '+' : ''}${net7} units (added ${weeklyIncoming}, removed ${weeklyOutgoing}).`,
    })

    items.push({
      tone: doneRate >= 75 ? 'good' : doneRate >= 50 ? 'watch' : 'critical',
      text: `Task completion rate is ${doneRate.toFixed(1)}% completed across all records.`,
    })

    if (topTxn) {
      items.push({ tone: 'info', text: `${prettifyTxnType(topTxn.type)} is the most common stock movement (${topTxn.volume} units).` })
    }

    const topLocations = [...(analytics.locationHeatmap || [])]
      .map((r) => Number(r.stock || 0))
      .sort((a, b) => b - a)
      .slice(0, 3)
    const locationTotal = (analytics.locationHeatmap || []).reduce((sum, r) => sum + Number(r.stock || 0), 0)
    const top3Share = locationTotal > 0 ? (topLocations.reduce((a, b) => a + b, 0) * 100) / locationTotal : 0
    items.push({
      tone: top3Share > 55 ? 'watch' : 'good',
      text: `Top 3 storage areas hold ${top3Share.toFixed(1)}% of visible stock. ${top3Share > 55 ? 'Consider spreading stock more evenly.' : 'Stock distribution looks balanced.'}`,
    })

    return items.slice(0, 6)
  }, [analytics])

  if (loading) {
    return <div className="text-slate-300 text-sm">Loading chart analytics...</div>
  }

  if (error) {
    return <div className="text-rose-300 text-sm">{error}</div>
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="surface-subtle rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2"
      >
        <label className="text-xs text-slate-300 flex flex-col gap-1">
          Record Type
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="form-field py-1.5 text-sm">
            <option value="all">All Tasks</option>
            <option value="receipts">Incoming Orders</option>
            <option value="deliveries">Outgoing Orders</option>
            <option value="transfers">Stock Moves</option>
            <option value="adjustments">Stock Corrections</option>
          </select>
        </label>
        <label className="text-xs text-slate-300 flex flex-col gap-1">
          Storage Site
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="form-field py-1.5 text-sm">
            <option value="all">All Storage Sites</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse} value={warehouse}>{warehouse}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300 flex flex-col gap-1">
          Category
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="form-field py-1.5 text-sm">
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300 flex flex-col gap-1">
          Stock Change Type
          <select value={selectedTxnType} onChange={(e) => setSelectedTxnType(e.target.value)} className="form-field py-1.5 text-sm">
            <option value="all">All Types</option>
            {(analytics.filterOptions?.movementTypes || []).map((type) => (
              <option key={type} value={type}>{prettifyTxnType(type)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300 flex flex-col gap-1">
          Trend Window
          <select value={dayWindow} onChange={(e) => setDayWindow(Number(e.target.value))} className="form-field py-1.5 text-sm">
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
          </select>
        </label>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartCard title="Top Products by Quantity" subtitle="Total quantity by product">
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredTopProducts}>
              <CartesianGrid stroke="#444" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={54} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12 }} />
              <Tooltip {...chartTooltip()} />
              <Bar dataKey="stock" fill="#47bedf" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Inventory Share by Category" subtitle="Category-wise stock split">
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="stock"
                outerRadius={80}
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...chartTooltip()} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Daily Stock Changes" subtitle="Stock added and removed by day" className="xl:col-span-2">
        <div style={{height:260}}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowData}>
              <defs>
                <linearGradient id="incomingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="outgoingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3f4b57" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip {...chartTooltip()} />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
              <Area type="monotone" dataKey="incoming" name="Added" stroke="#34d399" fill="url(#incomingGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="outgoing" name="Removed" stroke="#fb7185" fill="url(#outgoingGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#47bedf" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Task Status Overview" subtitle="Incoming, outgoing, moves, and corrections by status">
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid stroke="#3f4b57" strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip {...chartTooltip()} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {statusData.map((entry, idx) => (
                  <Cell key={`${entry.status}-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Stock by Storage Site" subtitle="Stock grouped by storage site">
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={warehouseData}>
              <CartesianGrid stroke="#3f4b57" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip {...chartTooltip()} />
              <Line type="monotone" dataKey="stock" stroke="#0ea5c6" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Stock Change Breakdown" subtitle="Change type grouped by moved quantity">
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={movementMixData} outerRadius={84}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="type" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <Tooltip {...chartTooltip()} />
              <Radar name="Volume" dataKey="volume" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Top Storage Areas by Stock" subtitle="Areas with the highest stock" className="xl:col-span-2">
        <div style={{height:260}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid stroke="#3f4b57" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={230} tick={{ fill: '#d1d5db', fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip {...chartTooltip()} />
              <Bar dataKey="stock" radius={[0, 8, 8, 0]}>
                {locationData.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Smart Inventory Insights" subtitle="Important points from live dashboard data" className="xl:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((item, idx) => (
            <div key={`${item.text}-${idx}`} className="surface-subtle rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-300">Insight #{idx + 1}</span>
                <InsightPill tone={item.tone} />
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </ChartCard>
      </div>
    </div>
  )
}
