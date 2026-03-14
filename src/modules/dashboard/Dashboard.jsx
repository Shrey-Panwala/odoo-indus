import React, { useEffect, useState } from 'react'
import KPICard from './components/KPICard'
import StockChart from './components/StockChart'
import OperationCards from './components/OperationCards'
import RecentActivity from './components/RecentActivity'
import axios from 'axios'
import { Box, ArrowUp } from 'lucide-react'

export default function Dashboard(){
  const [stats, setStats] = useState(null)

  useEffect(() => {
    axios.get('/api/dashboard/stats').then(r => setStats(r.data)).catch(console.error)
  }, [])

  if (!stats) return <div className="p-6 text-gray-300">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Products in Stock" value={stats.totalProductsInStock} icon={<Box />} />
        <KPICard title="Low Stock Items" value={stats.lowStockItems} icon={<ArrowUp />} />
        <KPICard title="Pending Receipts" value={stats.pendingReceipts} icon={<ArrowUp />} />
        <KPICard title="Pending Deliveries" value={stats.pendingDeliveries} icon={<ArrowUp />} />
        <KPICard title="Internal Transfers" value={stats.internalTransfers} icon={<ArrowUp />} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl glass-strong neon-border-purple">
          <h3 className="text-lg font-semibold mb-4 text-white">Stock Overview</h3>
          <StockChart />
        </div>
        <div className="space-y-6">
          <div className="p-5 rounded-2xl glass-strong neon-border-cyan">
            <h3 className="text-lg font-semibold mb-4 text-white">Operations</h3>
            <OperationCards />
          </div>
          <RecentActivity />
        </div>
      </section>
    </div>
  )
}
