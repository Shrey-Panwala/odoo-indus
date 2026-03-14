import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'

function OpCard({ title, buttonText, stats }){
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <button className="text-sm bg-gradient-to-r from-purple-500 to-cyan-400 text-white px-3 py-1 rounded-full shadow-lg hover:scale-105 transition-transform">{buttonText}</button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-gray-300">
        <div className="flex justify-between text-sm"><span>Late</span><span className="text-red-400">{stats.late}</span></div>
        <div className="flex justify-between text-sm"><span>Waiting</span><span className="text-yellow-400">{stats.waiting}</span></div>
        <div className="flex justify-between text-sm"><span>Total</span><span className="font-semibold text-white">{stats.total}</span></div>
      </div>
    </motion.div>
  )
}

export default function OperationCards(){
  const [receiptStats, setReceiptStats] = useState({late:0,waiting:0,total:0})
  const [deliveryStats, setDeliveryStats] = useState({late:0,waiting:0,total:0})

  useEffect(()=>{
    axios.get('/api/receipts').then(r=>{
      const rows = r.data
      const late = rows.filter(x=>x.status==='late').length
      const waiting = rows.filter(x=>x.status==='waiting').length
      setReceiptStats({late,waiting,total:rows.length})
    })
    axios.get('/api/deliveries').then(r=>{
      const rows = r.data
      const late = rows.filter(x=>x.status==='late').length
      const waiting = rows.filter(x=>x.status==='waiting').length
      setDeliveryStats({late,waiting,total:rows.length})
    })
  },[])

  return (
    <div className="space-y-4">
      <div className="p-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <OpCard title="Receipts" buttonText="Items to Receive" stats={receiptStats} />
      </div>
      <div className="p-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <OpCard title="Deliveries" buttonText="Items to Deliver" stats={deliveryStats} />
      </div>
    </div>
  )
}
