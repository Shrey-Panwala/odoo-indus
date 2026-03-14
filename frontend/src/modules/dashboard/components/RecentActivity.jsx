import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Shuffle } from 'lucide-react'
import apiClient from '../../../services/apiClient'

function ActivityRow({text, ico, color}){
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24 }}
      className="flex items-start gap-3 py-2"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} text-white`}>{ico}</div>
      <div className="flex-1">
        <div className="text-sm text-white">{text}</div>
        <div className="text-xs text-gray-400">Just now</div>
      </div>
    </motion.div>
  )
}

export default function RecentActivity(){
  const [items, setItems] = useState([])

  useEffect(()=>{
    apiClient.get('/dashboard/recent-activity')
      .then((res) => {
        const ledgerEntries = res.data || []

        if (ledgerEntries.length === 0) {
          setItems([
            {type:'receipt', text: 'No recent activity yet'},
          ])
          return
        }

        const ev = ledgerEntries.slice(0, 8).map((entry) => {
          const qty = Math.abs(Number(entry.qty_change || 0))
          const type = entry.txn_type === 'receipt' ? 'receipt'
            : entry.txn_type === 'delivery' ? 'delivery'
            : 'transfer'

          let text = ''
          if (type === 'receipt') {
            text = `+${qty} ${entry.product_name || ''} added to stock (${entry.txn_ref || ''})`
          } else if (type === 'delivery') {
            text = `-${qty} ${entry.product_name || ''} removed from stock (${entry.txn_ref || ''})`
          } else {
            text = `${entry.txn_type}: ${qty} ${entry.product_name || ''} moved (${entry.txn_ref || ''})`
          }

          return { type, text, ts: entry.created_at }
        })

        setItems(ev)
      })
      .catch(() => {
        setItems([{type:'receipt', text: 'Unable to load activity'}])
      })
  },[])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34 }}
      className="surface-panel rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-semibold">Recent Inventory Updates</h4>
        <button type="button" className="btn-muted px-3 py-1 text-xs">Live updates</button>
      </div>
      <div className="space-y-2 max-h-[470px] overflow-y-auto fancy-scroll pr-1">
        {items.length===0 && <div className="text-gray-400">No recent activity</div>}
        {items.map((it, idx)=>{
          if (it.type==='receipt') return <ActivityRow key={idx} text={it.text} ico={<ArrowUpRight size={16}/>} color="bg-green-500/90" />
          if (it.type==='delivery') return <ActivityRow key={idx} text={it.text} ico={<ArrowDownLeft size={16}/>} color="bg-red-500/90" />
          return <ActivityRow key={idx} text={it.text} ico={<Shuffle size={16}/>} color="bg-indigo-500/90" />
        })}
      </div>
    </motion.div>
  )
}
