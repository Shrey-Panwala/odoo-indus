import React from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function KPICard({ title, value, icon }){
  const tiny = [{v:value*0.6},{v:value*0.8},{v:value}]
  return (
    <div className="surface-panel rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-3 text-cyan-100" style={{background: 'linear-gradient(135deg, rgba(71,190,223,0.2), rgba(14,165,198,0.12))'}}>
            <div className="w-6 h-6">{icon}</div>
          </div>
          <div>
            <div className="text-sm text-gray-300">{title}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={tiny}>
            <Line type="monotone" dataKey="v" stroke="#47bedf" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
