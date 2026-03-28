'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Closer } from '@/types'

export function CallsFilters({
  closers,
  currentParams,
}: {
  closers: Closer[]
  currentParams: Record<string, string | undefined>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/dashboard/calls?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-4">
      <select
        value={currentParams.closer || ''}
        onChange={(e) => updateFilter('closer', e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Todos los closers</option>
        {closers.map((closer) => (
          <option key={closer.id} value={closer.id}>
            {closer.name}
          </option>
        ))}
      </select>

      <select
        value={currentParams.result || ''}
        onChange={(e) => updateFilter('result', e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Todos los resultados</option>
        <option value="closed">Cerrada</option>
        <option value="not_closed">No cerrada</option>
        <option value="follow_up">Follow-up</option>
        <option value="not_qualified">No calificada</option>
      </select>

      <input
        type="date"
        value={currentParams.from || ''}
        onChange={(e) => updateFilter('from', e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Desde"
      />

      <input
        type="date"
        value={currentParams.to || ''}
        onChange={(e) => updateFilter('to', e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Hasta"
      />

      {Object.values(currentParams).some(Boolean) && (
        <button
          onClick={() => router.push('/dashboard/calls')}
          className="text-sm text-indigo-400 hover:text-indigo-300 px-4 py-2"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
