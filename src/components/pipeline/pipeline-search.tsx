'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

export function PipelineSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [value, setValue] = useState(initialQ)

  // Debounced URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value === initialQ) return
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) {
        params.set('q', value.trim())
      } else {
        params.delete('q')
      }
      router.push(`/dashboard/pipeline?${params.toString()}`)
    }, 400)

    return () => clearTimeout(timer)
  }, [value, initialQ, router, searchParams])

  return (
    <div className="relative max-w-md flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por nombre o email..."
        className="w-full pl-9 pr-9 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
