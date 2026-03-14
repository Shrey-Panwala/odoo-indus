import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../../services/apiClient'

function OpCard({ title, buttonText, stats, onOpen }){
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.012, y: -2 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="surface-subtle rounded-2xl p-4 border-cyan-400/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-white tracking-wide">{title}</div>
        <button
          type="button"
          onClick={onOpen}
          className="btn-accent text-xs"
        >
          {buttonText}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-gray-300">
        <div className="flex justify-between text-sm"><span>Pending</span><span className="text-amber-200 font-semibold">{stats.pending}</span></div>
        <div className="flex justify-between text-sm"><span>Total</span><span className="font-semibold text-white">{stats.total}</span></div>
      </div>
    </motion.div>
  )
}

export default function OperationCards(){
  const navigate = useNavigate()
  const [receiptStats, setReceiptStats] = useState({pending:0,total:0})
  const [deliveryStats, setDeliveryStats] = useState({pending:0,total:0})

  useEffect(()=>{
    apiClient.get('/dashboard/kpis')
      .then((res) => {
        const data = res.data || {}
        setReceiptStats({
          pending: data.pendingReceipts || 0,
          total: data.pendingReceipts || 0,
        })
        setDeliveryStats({
          pending: data.pendingDeliveries || 0,
          total: data.pendingDeliveries || 0,
        })
      })
      .catch(() => {
        setReceiptStats({pending:0,total:0})
        setDeliveryStats({pending:0,total:0})
      })
  },[])

  return (
    <div className="space-y-4">
      <div className="rounded-xl">
        <OpCard
          title="Receipts"
          buttonText="Items to Receive"
          stats={receiptStats}
          onOpen={() => navigate('/operations?tab=receipts&view=list')}
        />
      </div>
      <div className="rounded-xl">
        <OpCard
          title="Deliveries"
          buttonText="Items to Deliver"
          stats={deliveryStats}
          onOpen={() => navigate('/operations?tab=deliveries&view=list')}
        />
      </div>
    </div>
  )
}
