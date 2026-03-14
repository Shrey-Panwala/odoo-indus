import React, { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownLeft, Shuffle } from 'lucide-react'
import { listAdjustments } from '../../operations/services/adjustmentService'
import { listDeliveries } from '../../operations/services/deliveryService'
import { listReceipts } from '../../operations/services/receiptService'

function ActivityRow({text, ico, color}){
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} text-white`}>{ico}</div>
      <div className="flex-1">
        <div className="text-sm text-white">{text}</div>
        <div className="text-xs text-gray-400">Just now</div>
      </div>
    </div>
  )
}

export default function RecentActivity(){
  const [items, setItems] = useState([])

  useEffect(()=>{
    Promise.all([
      listReceipts({ page: 1, pageSize: 6 }).then((response) => response?.rows || []).catch(()=>[]),
      listDeliveries({ page: 1, pageSize: 6 }).then((response) => response?.rows || []).catch(()=>[]),
      listAdjustments({ page: 1, pageSize: 6 }).then((response) => response?.rows || []).catch(()=>[])
    ]).then(([receipts, deliveries, adjustments])=>{
      const ev = []
      if (receipts.length===0 && deliveries.length===0 && adjustments.length===0) {
        ev.push({type:'receipt', text: '+50 Steel Rods received', ts: Date.now()})
        ev.push({type:'delivery', text: '-10 Chairs delivered', ts: Date.now()-1000*60*30})
        ev.push({type:'transfer', text: 'Transfer: Rack A → Rack B', ts: Date.now()-1000*60*60})
        ev.push({type:'adjust', text: 'Adjustment: -3 damaged', ts: Date.now()-1000*60*90})
      } else {
        receipts.slice(0,5).forEach(r=> ev.push({type:'receipt', text:`${r.reference} received`, ts: r.schedule_date || r.created_at}))
        deliveries.slice(0,5).forEach(d=> ev.push({type:'delivery', text:`${d.reference} dispatched`, ts: d.schedule_date || d.created_at}))
        adjustments.slice(0,5).forEach(a=> ev.push({type:'adjust', text:`Adjustment: ${a.difference} ${a.product_name || ''} ${a.reason || ''}`, ts: a.id}))
      }
      ev.sort((a,b)=> (a.ts||0) < (b.ts||0) ? 1 : -1)
      setItems(ev.slice(0,6))
    })
  },[])

  return (
    <div className="surface-panel rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-semibold">Recent Inventory Activity</h4>
        <button type="button" className="btn-muted px-3 py-1 text-xs">Live feed</button>
      </div>
      <div className="space-y-2">
        {items.length===0 && <div className="text-gray-400">No recent activity</div>}
        {items.map((it, idx)=>{
          if (it.type==='receipt') return <ActivityRow key={idx} text={it.text} ico={<ArrowUpRight size={16}/>} color="bg-green-500/90" />
          if (it.type==='delivery') return <ActivityRow key={idx} text={it.text} ico={<ArrowDownLeft size={16}/>} color="bg-red-500/90" />
          return <ActivityRow key={idx} text={it.text} ico={<Shuffle size={16}/>} color="bg-indigo-500/90" />
        })}
      </div>
    </div>
  )
}
