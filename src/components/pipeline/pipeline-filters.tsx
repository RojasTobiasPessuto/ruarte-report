'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Closer } from '@/types'
import { PipelineSearch } from './pipeline-search'

const STAGES = [
  'Post Llamada',
  'Seguimiento',
  'ReAgendado',
  'Compro',
  'No Compro',
  'Cancelado',
  'No Asistio',
]

export function PipelineFilters({ 
  closers, 
  viewAllOpps 
}: { 
  closers: Closer[], 
  viewAllOpps: boolean 
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(param, value)
    } else {
      params.delete(param)
    }
    router.push(`/dashboard/pipeline?${params.toString()}`)
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3 md:gap-5">
        <div className="flex-1 min-w-[200px]">
          <span className="block text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1.5 ml-1">Buscar</span>
          <PipelineSearch />
        </div>
        
        <FilterSelect 
          label="Etapa"
          placeholder="Todas las etapas" 
          value={searchParams.get('stage') || ''}
          options={STAGES.map(s => ({ label: s, value: s }))} 
          onChange={(v) => updateFilter('stage', v)}
        />

        <FilterSelect 
          label="Programa"
          placeholder="Todos los programas" 
          value={searchParams.get('programa') || ''}
          options={[
            { label: 'Mastermind', value: 'Mastermind' },
            { label: 'Formación', value: 'Formación' },
            { label: 'Programa PLUS', value: 'Programa PLUS' },
            { label: 'LITE', value: 'LITE' },
            { label: 'PAMM', value: 'PAMM - Manejo de Portafolio' },
          ]} 
          onChange={(v) => updateFilter('programa', v)}
        />

        <FilterSelect 
          label="Formulario"
          placeholder="Estado Formulario" 
          value={searchParams.get('form_completed') || (viewAllOpps ? 'all' : 'false')}
          options={[
            { label: 'Todos', value: 'all' },
            { label: 'Completado', value: 'true' },
            { label: 'Pendiente', value: 'false' },
          ]} 
          onChange={(v) => updateFilter('form_completed', v)}
        />

        {viewAllOpps && closers.length > 0 && (
          <FilterSelect 
            label="Closer"
            placeholder="Todos los Closers" 
            value={searchParams.get('closer') || ''}
            options={closers.map(c => ({ label: c.name, value: c.id }))} 
            onChange={(v) => updateFilter('closer', v)}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm border-t border-gray-800/50 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Llamada desde:</span>
          <input 
            type="date" 
            value={searchParams.get('from') || ''}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Hasta:</span>
          <input 
            type="date" 
            value={searchParams.get('to') || ''}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
          />
        </div>
        {searchParams.toString() && (
          <button 
            onClick={() => router.push('/dashboard/pipeline')}
            className="text-indigo-400 hover:text-indigo-300 text-xs font-medium ml-auto"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}

function FilterSelect({ label, placeholder, options, value, onChange }: { 
  label: string,
  placeholder: string, 
  options: { label: string, value: string }[],
  value: string,
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider ml-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
