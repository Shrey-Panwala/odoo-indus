import React, { useMemo, useState } from 'react'

export default function ProductSelector({ products, value, onChange, placeholder = 'Search product' }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.toLowerCase()
    return products.filter((product) => `${product.name} ${product.sku || ''}`.toLowerCase().includes(q))
  }, [products, query])

  return (
    <div className="space-y-1">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400"
      />
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
        className="w-full rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-sm text-gray-100"
      >
        <option value="">Select product</option>
        {filtered.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} ({product.sku || 'N/A'})
          </option>
        ))}
      </select>
    </div>
  )
}
