import React from 'react'

const tones = {
  Draft: 'bg-gray-500/20 text-gray-200 border-gray-400/50',
  Waiting: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
  Ready: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50',
  Done: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
  Canceled: 'bg-rose-500/20 text-rose-200 border-rose-400/50',
}

export default function StatusBadge({ value }) {
  const key = String(value || 'Draft')
  const classes = tones[key] || tones.Draft

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>
      {key}
    </span>
  )
}
