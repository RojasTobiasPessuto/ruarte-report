'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Opportunity } from '@/types'
import { cn } from '@/lib/utils'
import { AtSign, Calendar, Phone } from 'lucide-react'

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Agendado (Nuevo)': { bg: 'bg-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-400' },
  'Agendado (Confirmado)': { bg: 'bg-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400' },
  'Post Llamada': { bg: 'bg-orange-500/5', border: 'border-orange-500/30', text: 'text-orange-400' },
  'ReAgendado': { bg: 'bg-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400' },
  'Seguimiento': { bg: 'bg-yellow-500/5', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  'Compro': { bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  'No Compro': { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400' },
  'Cancelado': { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400' },
  'No Asistio': { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400' },
}

export function PipelineBoard({
  byStage,
  stages,
}: {
  byStage: Record<string, Opportunity[]>
  stages: string[]
}) {
  const getEmbedUrl = useEmbedUrl()

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 md:gap-4 min-w-max">
        {stages.map((stage) => {
          const opps = byStage[stage] || []
          const colors = STAGE_COLORS[stage] || STAGE_COLORS['Agendado (Nuevo)']

          return (
            <div
              key={stage}
              className={cn('flex-shrink-0 w-[280px] md:w-[300px] rounded-xl border', colors.bg, colors.border)}
            >
              <div className="px-4 py-3 border-b border-white/5 sticky top-0 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h3 className={cn('text-sm font-semibold', colors.text)}>{stage}</h3>
                  <span className="text-xs text-gray-500">{opps.length}</span>
                </div>
              </div>

              <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {opps.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-6">—</p>
                ) : (
                  opps.map((opp) => (
                    <Link
                      key={opp.id}
                      href={getEmbedUrl(`/dashboard/pipeline/${opp.id}`)}
                      className="block bg-gray-900/80 hover:bg-gray-800 border border-gray-800 rounded-lg p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-white line-clamp-1">
                          {opp.contact_name || opp.contact?.name || 'Sin nombre'}
                        </p>
                        {opp.form_completed && (
                          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            ✓
                          </span>
                        )}
                      </div>

                      {opp.contact?.ig_username && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <AtSign className="h-3 w-3" />
                          @{opp.contact.ig_username}
                        </div>
                      )}

                      {opp.fecha_llamada && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          {opp.fecha_llamada}
                        </div>
                      )}

                      {opp.closer && (
                        <p className="text-xs text-indigo-400 mt-1">
                          {opp.closer.name}
                        </p>
                      )}

                      {opp.call_id && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-400 mt-1.5">
                          <Phone className="h-2.5 w-2.5" />
                          Vinculado con llamada
                        </div>
                      )}

                      {opp.programa && (
                        <span className="inline-block text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full mt-2">
                          {opp.programa}
                        </span>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
 </div>
  )
}
