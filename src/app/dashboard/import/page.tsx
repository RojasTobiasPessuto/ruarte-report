'use client'

import { useState, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Upload, FileText, CheckCircle, XCircle, SkipForward, Loader2 } from 'lucide-react'

interface ImportResult {
  filename: string
  status: 'success' | 'error' | 'skipped'
  error?: string
}

export default function ImportPage() {
  const [files, setFiles] = useState<Array<{ filename: string; content: string }>>([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{
    success: number
    errors: number
    skipped: number
    details: ImportResult[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    const parsed: Array<{ filename: string; content: string }> = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const content = await file.text()
      parsed.push({
        filename: file.name,
        content,
      })
    }

    setFiles(parsed)
    setResults(null)
  }

  const handleImport = async () => {
    if (files.length === 0) return

    setImporting(true)
    setResults(null)

    try {
      // Process in batches of 10 to avoid timeouts
      const batchSize = 10
      const allResults: ImportResult[] = []
      let totalSuccess = 0
      let totalErrors = 0
      let totalSkipped = 0

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)

        const response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: batch }),
        })

        if (response.ok) {
          const data = await response.json()
          totalSuccess += data.success
          totalErrors += data.errors
          totalSkipped += data.skipped
          allResults.push(...data.details)
        } else {
          totalErrors += batch.length
          batch.forEach((f) =>
            allResults.push({ filename: f.filename, status: 'error', error: 'Error de conexión' })
          )
        }
      }

      setResults({
        success: totalSuccess,
        errors: totalErrors,
        skipped: totalSkipped,
        details: allResults,
      })
    } catch {
      setResults({
        success: 0,
        errors: files.length,
        skipped: 0,
        details: files.map((f) => ({
          filename: f.filename,
          status: 'error' as const,
          error: 'Error de conexión',
        })),
      })
    }

    setImporting(false)
  }

  return (
    <div>
      <Header title="Importar Llamadas Históricas" />
      <div className="p-8 space-y-6 max-w-4xl">
        {/* Instructions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Instrucciones</h3>
          <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>
              Descargá los Google Docs como archivos <code className="text-indigo-400">.txt</code> desde Google Drive
              (seleccioná todos → click derecho → Descargar → se bajan como .zip)
            </li>
            <li>Descomprimí el .zip</li>
            <li>
              Seleccioná todos los archivos <code className="text-indigo-400">.txt</code> abajo
            </li>
            <li>
              Los archivos deben tener el formato:{' '}
              <code className="text-indigo-400">DD/MM/YYYY Llamada Closer con Lead: Nombre</code>
            </li>
          </ol>
        </div>

        {/* File selector */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-700 rounded-xl p-12 text-center hover:border-indigo-500 transition-colors group"
          >
            <Upload className="h-10 w-10 text-gray-500 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
            <p className="text-gray-400 group-hover:text-white transition-colors">
              Click para seleccionar archivos
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Archivos .txt exportados de Google Docs
            </p>
          </button>

          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">
                  <span className="text-white font-medium">{files.length}</span> archivos seleccionados
                </p>
                <button
                  onClick={() => {
                    setFiles([])
                    setResults(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Limpiar
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400 py-1">
                    <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{f.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Import button */}
        {files.length > 0 && !results && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Importando... (esto puede tardar unos minutos)
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Importar {files.length} llamadas
              </>
            )}
          </button>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-green-800 rounded-xl p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-400">{results.success}</p>
                <p className="text-xs text-gray-400">Importadas</p>
              </div>
              <div className="bg-gray-900 border border-yellow-800 rounded-xl p-4 text-center">
                <SkipForward className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-400">{results.skipped}</p>
                <p className="text-xs text-gray-400">Ya existían</p>
              </div>
              <div className="bg-gray-900 border border-red-800 rounded-xl p-4 text-center">
                <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-400">{results.errors}</p>
                <p className="text-xs text-gray-400">Errores</p>
              </div>
            </div>

            {/* Detail list */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Detalle</h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {results.details.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-gray-800/50">
                    {r.status === 'success' && <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />}
                    {r.status === 'skipped' && <SkipForward className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />}
                    {r.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                    <span className="text-gray-300 truncate flex-1">{r.filename}</span>
                    {r.error && <span className="text-xs text-red-400 flex-shrink-0">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Import more button */}
            <button
              onClick={() => {
                setFiles([])
                setResults(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl transition-colors"
            >
              Importar más archivos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
