import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Products(){
  const [items, setItems] = useState([])
  useEffect(()=>{ axios.get('/api/products').then(r=>setItems(r.data)).catch(console.error) },[])
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Products</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-left text-sm text-gray-400">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p=> (
              <tr key={p.id} className="border-t border-white/6 hover:bg-white/2">
                <td className="px-3 py-2 text-gray-200">{p.name}</td>
                <td className="px-3 py-2 text-gray-300">{p.sku}</td>
                <td className="px-3 py-2 text-gray-300">{p.category}</td>
                <td className="px-3 py-2 text-gray-200">{p.stock}</td>
                <td className="px-3 py-2 text-gray-300">{p.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
