'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Phone, User, Clock, Calendar, Copy, ExternalLink, Trash2, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Call } from '@/types'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const resultLabels: Record<string, { label: string; className: string }> = {
  closed: { label: 'Cerrada', className: 'bg-green-400/10 text-green-400 border-green-400/20' },
  not_closed: { label: 'No cerrada', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
  follow_up: { label: 'Follow-up', className: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  not_qualified: { label: 'No calificada', className: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
}

export function CallDetail({ call, isAdmin = false }: { call: Call; isAdmin?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const result = call.analysis?.result
  const resultInfo = result ? resultLabels[result] : null

  const summaryUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/summary/${call.id}`
    : `/summary/${call.id}`

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(summaryUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white">
              {call.contact_name || 'Sin nombre'}
            </h2>
            {resultInfo && (
              <span className={cn('text-sm font-medium px-3 py-1 rounded-full border', resultInfo.className)}>
                {resultInfo.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(call.call_date), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </span>
            {call.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {call.duration_minutes} min
              </span>
            )}
            {call.closer && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {call.closer.name}
              </span>
            )}
            {call.contact_email && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {call.contact_email}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-white rounded-lg transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar link público'}</span>
            <span className="sm:hidden">{copied ? 'Copiado!' : 'Copiar link'}</span>
          </button>
          <a
            href={`/summary/${call.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-sm text-white rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ver resumen
          </a>
          {call.fathom_url && (
            <a
              href={call.fathom_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm text-white rounded-lg transition-colors"
            >
              <Video className="h-4 w-4" />
              Ver en Fathom
            </a>
          )}
          {isAdmin && (
            <button
              onClick={async () => {
                if (!confirm('¿Estás seguro de eliminar esta llamada? Esta acción no se puede deshacer.')) return
                setDeleting(true)
                const res = await fetch('/api/admin/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'call', id: call.id }),
                })
                if (res.ok) {
                  router.push('/dashboard/calls')
                  router.refresh()
                } else {
                  alert('Error al eliminar')
                  setDeleting(false)
                }
              }}
              disabled={deleting}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-sm text-red-400 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>

      {call.analysis && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Resumen Ejecutivo</h3>
            <p className="text-gray-200 leading-relaxed">{call.analysis.summary}</p>
          </div>
          {call.analysis.result_reason && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                {result === 'closed' ? 'Por qué se cerró' : 'Por qué no se cerró'}
              </h3>
              <p className="text-gray-200 leading-relaxed">{call.analysis.result_reason}</p>
            </div>
          )}
          {call.analysis.next_steps && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Próximos Pasos</h3>
              <p className="text-gray-200 leading-relaxed">{call.analysis.next_steps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
