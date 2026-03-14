import React from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function KPICard({ title, value, icon }){
  const tiny = [{v:value*0.6},{v:value*0.8},{v:value}]
  return (
    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_25px_rgba(120,80,255,0.12)] hover:shadow-[0_0_35px_rgba(120,80,255,0.2)] hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl text-white`} style={{background: `linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))`}}>
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
            <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
