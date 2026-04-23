'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export function RefreshAnglesButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    total: number
    updated: number
    unchanged: number
    errors: number
    error_samples?: string[]
    sheet_synced?: boolean
    sheet_error?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (loading) return
    if (!confirm('Vas a resincronizar los ángulos de todos los leads contra ManyChat. Puede demorar unos segundos. ¿Continuar?')) return

    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/leads/refresh-angles', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al refrescar')
      } else {
        setResult(data)
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Refrescando...' : 'Refrescar ángulos de ManyChat'}
      </button>

      {result && (
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-lg p-3 text-xs text-gray-300 min-w-[280px] max-w-md">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
            <span>
              {result.updated} actualizados · {result.unchanged} sin cambios · {result.errors} errores · {result.total} total
            </span>
          </div>
          {result.sheet_synced === true && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Google Sheet actualizado
            </div>
          )}
          {result.sheet_synced === false && result.sheet_error && (
            <div className="flex items-start gap-2 text-[11px] text-red-400 break-words">
              <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>Sheet: {result.sheet_error}</span>
            </div>
          )}
          {result.error_samples && result.error_samples.length > 0 && (
            <div className="mt-1 text-[10px] text-red-400 space-y-0.5">
              {result.error_samples.map((s, i) => <div key={i}>• {s}</div>)}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  )
}
