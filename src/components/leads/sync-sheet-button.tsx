'use client'

import { useState } from 'react'
import { FileSpreadsheet, ExternalLink, AlertCircle } from 'lucide-react'

export function SyncSheetButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ rows: number; sheet_url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/leads/sync-to-sheet', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setError(data.error || data.details || 'Error al sincronizar')
      else setResult(data)
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
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {loading ? 'Sincronizando...' : 'Exportar a Google Sheet'}
      </button>

      {result && (
        <div className="bg-gray-900/80 border border-emerald-500/30 rounded-lg p-3 text-xs text-gray-300 min-w-[280px]">
          <p className="text-emerald-400 mb-1">✓ {result.rows} leads exportados</p>
          <a
            href={result.sheet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
          >
            Abrir Sheet <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400 flex items-center gap-2 max-w-md">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}
    </div>
  )
}
