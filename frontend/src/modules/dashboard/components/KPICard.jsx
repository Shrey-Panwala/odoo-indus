import React from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function KPICard({ title, value, icon }){
  const numericValue = Number(value || 0)
  const tiny = [{ v: Math.max(numericValue * 0.58, 0) }, { v: Math.max(numericValue * 0.8, 0) }, { v: numericValue }]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.008 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="surface-panel rounded-2xl p-4 border-cyan-400/20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-3 text-cyan-100" style={{ background: 'linear-gradient(135deg, rgba(63,221,255,0.26), rgba(20,184,212,0.18) 65%, rgba(245,158,11,0.08))', boxShadow: '0 8px 22px rgba(20,184,212,0.2)' }}>
            <div className="w-6 h-6">{icon}</div>
          </div>
          <div>
            <div className="text-sm text-slate-300 tracking-wide">{title}</div>
            <div className="text-3xl leading-none font-extrabold text-white mt-1">{numericValue}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={tiny}>
            <Line type="monotone" dataKey="v" stroke="#3fddff" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
