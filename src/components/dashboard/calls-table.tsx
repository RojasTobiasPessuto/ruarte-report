'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ExternalLink } from 'lucide-react'
import type { Call } from '@/types'
import { cn } from '@/lib/utils'

const resultLabels: Record<string, { label: string; className: string }> = {
  closed: { label: 'Cerrada', className: 'bg-green-400/10 text-green-400' },
  not_closed: { label: 'No cerrada', className: 'bg-red-400/10 text-red-400' },
  follow_up: { label: 'Follow-up', className: 'bg-yellow-400/10 text-yellow-400' },
  not_qualified: { label: 'No calificada', className: 'bg-gray-400/10 text-gray-400' },
}

function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const percentage = (score / max) * 100
  const color =
    percentage >= 70 ? 'text-green-400' : percentage >= 40 ? 'text-yellow-400' : 'text-red-400'
  return <span className={cn('font-medium', color)}>{score}/{max}</span>
}

export function CallsTable({ calls, showCloser = true }: { calls: Call[]; showCloser?: boolean }) {
  if (calls.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <p className="text-gray-400">No hay llamadas registradas</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                Fecha
              </th>
              {showCloser && (
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                  Closer
                </th>
              )}
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                Contacto
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                Resultado
              </th>
              <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                Sentimiento
              </th>
              <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                Calidad
              </th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {calls.map((call) => {
              const result = call.analysis?.result
              const resultInfo = result ? resultLabels[result] : null

              return (
                <tr key={call.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {format(new Date(call.call_date), "d MMM yyyy, HH:mm", { locale: es })}
                  </td>
                  {showCloser && (
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {call.closer?.name || '—'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {call.contact_name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {resultInfo ? (
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', resultInfo.className)}>
                        {resultInfo.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Pendiente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    {call.analysis ? (
                      <ScoreBadge score={call.analysis.sentiment_score} />
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    {call.analysis ? (
                      <ScoreBadge score={call.analysis.call_quality_score} />
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/calls/${call.id}`}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      Ver <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
