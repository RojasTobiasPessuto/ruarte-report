'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'

const presets = [
  { label: 'Hoy', value: 'today' },
  { label: '7 días', value: '7d' },
  { label: '30 días', value: '30d' },
  { label: '90 días', value: '90d' },
  { label: 'Todo', value: 'all' },
]

export function DateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPreset = searchParams.get('range') || 'all'
  const customFrom = searchParams.get('from') || ''
  const customTo = searchParams.get('to') || ''

  const applyPreset = (preset: string) => {
    const params = new URLSearchParams()
    if (preset !== 'all') {
      params.set('range', preset)
    }
    router.push(`/dashboard?${params.toString()}`)
  }

  const applyCustom = (from: string, to: string) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('range', 'custom')
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="h-4 w-4 text-gray-500 hidden sm:block" />

      {presets.map((p) => (
        <button
          key={p.value}
          onClick={() => applyPreset(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentPreset === p.value
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          {p.label}
        </button>
      ))}

      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => applyCustom(e.target.value, customTo)}
          className="bg-gray-800/80 border border-gray-700/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        />
        <span className="text-gray-600 text-xs">—</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => applyCustom(customFrom, e.target.value)}
          className="bg-gray-800/80 border border-gray-700/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        />
      </div>
    </div>
  )
}
