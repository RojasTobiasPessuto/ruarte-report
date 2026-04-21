'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'

export function JustificanteUpload({
  value,
  onChange,
  compact = false,
}: {
  value: string | null
  onChange: (url: string | null) => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/justificante', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al subir')
      } else {
        onChange(data.url)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (value) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded hover:bg-indigo-500/20 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Ver justificante
        </a>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-gray-500 hover:text-red-400"
          title="Quitar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFile}
        accept="image/*,.pdf"
        className="hidden"
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded border border-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Subiendo...' : 'Subir justificante'}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
