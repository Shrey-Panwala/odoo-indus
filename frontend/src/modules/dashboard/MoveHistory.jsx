import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { List, LayoutGrid, Search, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../operations/components/StatusBadge'
import { getMoveHistoryRows } from './services/moveHistoryService'

function ListSkeleton() {
  return (
    <div className="space-y-2 py-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-10 animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  )
}

export default function MoveHistory() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')

  const groupedByStatus = useMemo(() => {
    return rows.reduce((acc, row) => {
      const key = row.status || 'Not Started'
      if (!acc[key]) acc[key] = []
      acc[key].push(row)
      return acc
    }, {})
  }, [rows])

  const load = async (searchText = '') => {
    setLoading(true)
    try {
      setRows(await getMoveHistoryRows(searchText))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('')
  }, [])

  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => navigate('/operations?tab=receipts&view=list')}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300/60 px-3 py-1 text-xs font-semibold text-amber-100"
          >
            <Plus size={13} /> NEW
          </button>
          <h2 className="text-2xl font-semibold text-amber-50">Stock Movement History</h2>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative w-64 max-w-full">
              <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={async (event) => {
                  const value = event.target.value
                  setSearch(value)
                  await load(value)
                }}
                placeholder="Search by reference or contact"
                className="w-full rounded-lg border border-white/15 bg-gray-950/60 py-2 pl-9 pr-3 text-sm text-gray-100"
              />
            </div>

            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-lg border px-2 py-2 ${view === 'list' ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200' : 'border-white/20 text-gray-300'}`}
              title="List view"
            >
              <List size={14} />
            </button>

            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`rounded-lg border px-2 py-2 ${view === 'kanban' ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200' : 'border-white/20 text-gray-300'}`}
              title="Kanban view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : view === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-2 py-2">Reference</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">From</th>
                  <th className="px-2 py-2">To</th>
                  <th className="px-2 py-2">Quantity</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/10 text-gray-200">
                    <td className="px-2 py-2 font-medium text-cyan-100">{row.reference}</td>
                    <td className="px-2 py-2">{row.date}</td>
                    <td className="px-2 py-2">{row.contact}</td>
                    <td className="px-2 py-2">{row.from}</td>
                    <td className="px-2 py-2">{row.to}</td>
                    <td className={`px-2 py-2 font-semibold ${row.direction === 'IN' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {row.direction === 'IN' ? '+' : '-'}{row.quantity}
                    </td>
                    <td className="px-2 py-2"><StatusBadge value={row.status || 'Ready'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!rows.length && <p className="py-6 text-center text-sm text-gray-400">No stock movement records found.</p>}
          </div>
        ) : (
          <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(groupedByStatus).map(([status, items]) => (
              <div key={status} className="rounded-xl border border-white/10 bg-white/5 p-2">
                <h3 className="mb-2 text-sm font-semibold text-cyan-100">
                  {status}
                </h3>
                <div className="space-y-2">
                  {items.map((row) => (
                    <div key={row.id} className="rounded-lg border border-white/10 bg-gray-950/40 px-2 py-2 text-xs text-gray-200">
                      <p className="font-semibold text-cyan-100">{row.reference}</p>
                      <p>{row.contact}</p>
                      <p>{row.from} {'->'} {row.to}</p>
                      <p className={row.direction === 'IN' ? 'text-emerald-300' : 'text-rose-300'}>
                        {row.direction === 'IN' ? '+' : '-'}{row.quantity}
                      </p>
                    </div>
                  ))}

                  {!items.length && <p className="text-xs text-gray-500">No items</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  )
}
