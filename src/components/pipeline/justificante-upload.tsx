'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X, Loader2, Plus } from 'lucide-react'

export function JustificanteUpload({
  value,
  onChange,
  compact = false,
}: {
  value: string[] | null
  onChange: (urls: string[] | null) => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const urls = value || []

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError('')

    const newUrls: string[] = [...urls]

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload/justificante', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (!res.ok) {
          setError(`Error en ${file.name}: ${data.error || 'error'}`)
          continue
        }
        newUrls.push(data.url)
      }

      onChange(newUrls.length > 0 ? newUrls : null)
    } catch {
      setError('Error de conexión')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeUrl(index: number) {
    const next = urls.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : null)
  }

  return (
    <div className="space-y-2">
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {urls.map((url, i) => (
            <div
              key={i}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded ${compact ? 'text-xs' : 'text-sm'}`}
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                Archivo {i + 1}
              </a>
              <button
                type="button"
                onClick={() => removeUrl(i)}
                className="text-gray-500 hover:text-red-400"
                title="Quitar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFiles}
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
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : urls.length > 0 ? (
          <Plus className="h-3.5 w-3.5" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {uploading ? 'Subiendo...' : urls.length > 0 ? 'Agregar más' : 'Subir justificantes'}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
