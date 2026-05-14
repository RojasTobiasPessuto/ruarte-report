export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { LeadTimeline } from '@/components/leads/lead-timeline'
import { LeadStatusUpdate } from '@/components/leads/lead-status-update'
import { notFound } from 'next/navigation'
import type { Lead } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, formatAngleTag } from '@/lib/utils'

const statusLabels: Record<string, { label: string; className: string }> = {
  nuevo: { label: 'Nuevo', className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  agendado: { label: 'Agendado', className: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20' },
  contactado: { label: 'Contactado', className: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  cerrado: { label: 'Cerrado', className: 'bg-green-400/10 text-green-400 border-green-400/20' },
  perdido: { label: 'Perdido', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  await requirePermission('ver_leads')

  const supabase = await createServerSupabaseClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const typedLead = lead as Lead
  const statusInfo = statusLabels[typedLead.status] || statusLabels.nuevo
  const angles = typedLead.all_angles || []

  return (
    <div>
      <Header title={`Lead — ${typedLead.name || 'Sin nombre'}`} />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Lead info card */}
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">
                  {typedLead.name || 'Sin nombre'}
                </h2>
                <span className={cn('text-sm font-medium px-3 py-1 rounded-full border', statusInfo.className)}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {typedLead.ig_username && (
                  <span className="text-indigo-400">@{typedLead.ig_username}</span>
                )}
                {typedLead.manychat_subscriber_id && (
                  <span className="font-mono text-xs text-gray-500">
                    ID: {typedLead.manychat_subscriber_id}
                  </span>
                )}
              </div>
            </div>
            <LeadStatusUpdate leadId={typedLead.id} currentStatus={typedLead.status} />
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Ingreso ManyChat</span>
              <p className="text-sm text-white mt-1">
                {typedLead.manychat_joined_at
                  ? format(new Date(typedLead.manychat_joined_at), "d MMM yyyy, HH:mm", { locale: es })
                  : '—'}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Solicitud Agenda</span>
              <p className="text-sm text-white mt-1">
                {format(new Date(typedLead.agenda_requested_at), "d MMM yyyy, HH:mm", { locale: es })}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Tiempo hasta Agenda</span>
              <p className="text-sm font-medium text-amber-400 mt-1">
                {typedLead.time_to_agenda_hours !== null
                  ? typedLead.time_to_agenda_hours > 24
                    ? `${(typedLead.time_to_agenda_hours / 24).toFixed(1)} dias`
                    : `${typedLead.time_to_agenda_hours.toFixed(1)} horas`
                  : '—'}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Total Angulos</span>
              <p className="text-sm font-medium text-indigo-400 mt-1">{typedLead.total_angles}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Journey del Lead</h3>
          <LeadTimeline
            joinedAt={typedLead.manychat_joined_at}
            angles={angles}
            agendaRequestedAt={typedLead.agenda_requested_at}
          />
        </div>

        {/* All angles detail */}
        {angles.length > 0 && (
          <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Angulos de Venta</h3>
            <div className="flex flex-wrap gap-2">
              {angles.map((angle: string, i: number) => (
                <span
                  key={i}
                  className={cn(
                    'text-sm px-3 py-1.5 rounded-full border',
                    i === 0
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : i === angles.length - 1
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  )}
                >
                  {i === 0 && <span className="text-[10px] mr-1 opacity-60">1ro</span>}
                  {i === angles.length - 1 && i > 0 && <span className="text-[10px] mr-1 opacity-60">ult</span>}
                  {formatAngleTag(angle)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
