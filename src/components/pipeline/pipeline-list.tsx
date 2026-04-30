'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Opportunity } from '@/types'
import { cn } from '@/lib/utils'
import { AtSign, Calendar, ExternalLink, User, CheckCircle2, DollarSign } from 'lucide-react'
import { useEmbedUrl } from '@/components/layout/embed-context'

const STAGE_COLORS: Record<string, string> = {
  'Agendado (Nuevo)': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Agendado (Confirmado)': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Post Llamada': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'ReAgendado': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Seguimiento': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Compro': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'No Compro': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Cancelado': 'bg-red-500/10 text-red-400 border-red-500/20',
  'No Asistio': 'bg-red-500/10 text-red-400 border-red-500/20',
}

export function PipelineList({
  opportunities,
}: {
  opportunities: Opportunity[]
}) {
  if (opportunities.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <p className="text-gray-400">No hay oportunidades registradas</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Contacto</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Etapa</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha Llamada</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Último Pago</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Closer</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Programa</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {opportunities.map((opp) => {
              const stageColor = STAGE_COLORS[opp.pipeline_stage || ''] || STAGE_COLORS['Agendado (Nuevo)']
              
              // Calcular último pago
              const allPayments = (opp.sales || []).flatMap(s => s.payments || [])
              const paidPayments = allPayments.filter(p => p.pagado && p.fecha_pago)
              const lastPaymentDate = paidPayments.length > 0
                ? new Date(Math.max(...paidPayments.map(p => new Date(p.fecha_pago!).getTime())))
                : null
              const oppUrl = getEmbedUrl(`/dashboard/pipeline/${opp.id}`)

              return (
                <tr key={opp.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        {opp.contact_name || opp.contact?.name || 'Sin nombre'}
                        {opp.form_completed && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </span>
                      {opp.contact?.ig_username && (
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <AtSign className="h-3 w-3" />
                          {opp.contact.ig_username}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', stageColor)}>
                      {opp.pipeline_stage}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
                      {opp.fecha_llamada ? (
                        format(new Date(opp.fecha_llamada), "d 'de' MMM", { locale: es })
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {lastPaymentDate ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500/50" />
                        {format(lastPaymentDate, "d 'de' MMM", { locale: es })}
                      </div>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-indigo-400 font-medium">
                      <User className="h-3.5 w-3.5 text-indigo-500/50" />
                      {opp.closer?.name || <span className="text-gray-600">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {opp.programa ? (
                      <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        {opp.programa}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={oppUrl}
                      onClick={(e) => {
                        e.preventDefault()
                        const width = 1100
                        const height = 800
                        const left = typeof window !== 'undefined' ? (window.innerWidth - width) / 2 : 0
                        const top = typeof window !== 'undefined' ? (window.innerHeight - height) / 2 : 0
                        window.open(oppUrl, '_blank', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`)
                      }}
                      className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Ver <ExternalLink className="h-3.5 w-3.5" />
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
