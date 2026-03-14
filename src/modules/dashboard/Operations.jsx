import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Operations(){
  const [receipts, setReceipts] = useState([])
  const [deliveries, setDeliveries] = useState([])
  useEffect(()=>{
    axios.get('/api/receipts').then(r=>setReceipts(r.data)).catch(console.error)
    axios.get('/api/deliveries').then(r=>setDeliveries(r.data)).catch(console.error)
  },[])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="text-lg font-semibold mb-4 text-white">Receipts</h3>
        <ul className="space-y-2 text-gray-300">
          {receipts.map(r=> <li key={r.id} className="flex justify-between"><span>{r.product_name}</span><span className="text-sm text-gray-400">{r.status}</span></li>)}
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="text-lg font-semibold mb-4 text-white">Deliveries</h3>
        <ul className="space-y-2 text-gray-300">
          {deliveries.map(d=> <li key={d.id} className="flex justify-between"><span>{d.product_name}</span><span className="text-sm text-gray-400">{d.status}</span></li>)}
        </ul>
      </div>
    </div>
  )
}
