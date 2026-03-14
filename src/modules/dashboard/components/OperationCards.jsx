import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { listDeliveries } from '../../operations/services/deliveryService'
import { listReceipts } from '../../operations/services/receiptService'

function OpCard({ title, buttonText, stats, onOpen }){
  return (
    <motion.div whileHover={{ scale: 1.01 }} className="surface-subtle rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <button
          type="button"
          onClick={onOpen}
          className="btn-accent text-xs"
        >
          {buttonText}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-gray-300">
        <div className="flex justify-between text-sm"><span>Late</span><span className="text-rose-300">{stats.late}</span></div>
        <div className="flex justify-between text-sm"><span>Waiting</span><span className="text-amber-200">{stats.waiting}</span></div>
        <div className="flex justify-between text-sm"><span>Total</span><span className="font-semibold text-white">{stats.total}</span></div>
      </div>
    </motion.div>
  )
}

export default function OperationCards(){
  const navigate = useNavigate()
  const [receiptStats, setReceiptStats] = useState({late:0,waiting:0,total:0})
  const [deliveryStats, setDeliveryStats] = useState({late:0,waiting:0,total:0})

  useEffect(()=>{
    Promise.all([
      listReceipts({ page: 1, pageSize: 100 }),
      listDeliveries({ page: 1, pageSize: 100 }),
    ])
      .then(([receiptData, deliveryData]) => {
        const receiptRows = receiptData?.rows || []
        const deliveryRows = deliveryData?.rows || []

        setReceiptStats({
          late: receiptRows.filter((item) => String(item.status || '').toLowerCase() === 'late').length,
          waiting: receiptRows.filter((item) => String(item.status || '').toLowerCase() === 'waiting').length,
          total: receiptRows.length,
        })

        setDeliveryStats({
          late: deliveryRows.filter((item) => String(item.status || '').toLowerCase() === 'late').length,
          waiting: deliveryRows.filter((item) => String(item.status || '').toLowerCase() === 'waiting').length,
          total: deliveryRows.length,
        })
      })
      .catch(() => {
        setReceiptStats({late:0,waiting:0,total:0})
        setDeliveryStats({late:0,waiting:0,total:0})
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
