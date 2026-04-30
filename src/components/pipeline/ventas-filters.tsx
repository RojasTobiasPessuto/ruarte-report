'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Filter } from 'lucide-react'

export function VentasFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(param, value)
    } else {
      params.delete(param)
    }
    router.push(`/dashboard/payments?${params.toString()}`)
  }

  const hasFilters = searchParams.get('from') || searchParams.get('to') || searchParams.get('q')

  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Desde:</span>
            <input 
              type="date" 
              value={searchParams.get('from') || ''}
              onChange={(e) => updateFilter('from', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Hasta:</span>
            <input 
              type="date" 
              value={searchParams.get('to') || ''}
              onChange={(e) => updateFilter('to', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar contacto o closer..."
            defaultValue={searchParams.get('q') || ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateFilter('q', (e.target as HTMLInputElement).value)
              }
            }}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {hasFilters && (
          <button 
            onClick={() => router.push('/dashboard/payments')}
            className="text-gray-500 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
