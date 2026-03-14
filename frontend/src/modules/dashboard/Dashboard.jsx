import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import KPICard from './components/KPICard'
import StockChart from './components/StockChart'
import OperationCards from './components/OperationCards'
import RecentActivity from './components/RecentActivity'
import apiClient from '../../services/apiClient'
import { Box, ArrowUp, ArrowDown, Repeat, AlertTriangle } from 'lucide-react'

export default function Dashboard(){
  const [stats, setStats] = useState(null)

  const sectionAnim = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  }

  useEffect(() => {
    apiClient.get('/dashboard/kpis').then(r => setStats(r.data)).catch(console.error)
  }, [])

  if (!stats) return <div className="p-6 text-gray-300">Loading dashboard...</div>

  return (
    <div className="space-y-6 fancy-scroll">
      <motion.section
        variants={sectionAnim}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <KPICard title="Total Products" value={stats.totalProducts ?? 0} icon={<Box />} />
        <KPICard title="Low Stock Items" value={stats.lowStockItems ?? 0} icon={<AlertTriangle />} />
        <KPICard title="Pending Receipts" value={stats.pendingReceipts ?? 0} icon={<ArrowDown />} />
        <KPICard title="Pending Deliveries" value={stats.pendingDeliveries ?? 0} icon={<ArrowUp />} />
        <KPICard title="Scheduled Transfers" value={stats.scheduledTransfers ?? 0} icon={<Repeat />} />
      </motion.section>

      <motion.section
          variants={sectionAnim}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="surface-panel ambient-grid rounded-2xl p-5"
      >
          <h3 className="section-title mb-4 text-lg">Stock Overview</h3>
          <StockChart />
      </motion.section>

      <motion.section
        variants={sectionAnim}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.58, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        <div className="surface-panel rounded-2xl p-5">
          <h3 className="section-title mb-4 text-lg">Operations</h3>
          <OperationCards />
        </div>
        <div className="xl:col-span-2">
          <RecentActivity />
        </div>
      </motion.section>
    </div>
  )
}
