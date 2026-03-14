import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const stockData = [
  { name: 'Mon', stock: 120 },
  { name: 'Tue', stock: 140 },
  { name: 'Wed', stock: 130 },
  { name: 'Thu', stock: 160 },
  { name: 'Fri', stock: 150 },
  { name: 'Sat', stock: 170 },
  { name: 'Sun', stock: 190 }
]

const pieData = [
  { name: 'Fruits', value: 30 },
  { name: 'Dairy', value: 20 },
  { name: 'Grocery', value: 30 },
  { name: 'Vegetables', value: 20 }
]

export default function StockChart(){
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <h4 className="text-sm text-gray-300 mb-2">Stock Overview (week)</h4>
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stockData}>
              <CartesianGrid stroke="#444" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12 }} />
              <Tooltip wrapperClassName="recharts-default-tooltip" contentStyle={{ background: 'rgba(10,12,20,0.7)', border: '1px solid rgba(255,255,255,0.06)', color: '#e6eef8' }} />
              <Line type="monotone" dataKey="stock" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <h4 className="text-sm text-gray-300 mb-2">By Category</h4>
        <div style={{height:240}}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" outerRadius={80} labelLine={false}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={["#6366f1","#06b6d4","#f59e0b","#ec4899"][index%4]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
