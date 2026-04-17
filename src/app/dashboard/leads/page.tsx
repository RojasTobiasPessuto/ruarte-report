export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { Lead } from '@/types'
import { cn } from '@/lib/utils'
import { Users, Calendar, TrendingUp, Clock, ExternalLink } from 'lucide-react'

const statusLabels: Record<string, { label: string; className: string }> = {
  nuevo: { label: 'Nuevo', className: 'bg-blue-400/10 text-blue-400' },
  agendado: { label: 'Agendado', className: 'bg-indigo-400/10 text-indigo-400' },
  contactado: { label: 'Contactado', className: 'bg-yellow-400/10 text-yellow-400' },
  cerrado: { label: 'Cerrado', className: 'bg-green-400/10 text-green-400' },
  perdido: { label: 'Perdido', className: 'bg-red-400/10 text-red-400' },
}

interface SearchParams {
  [key: string]: string | undefined
  status?: string
  from?: string
  to?: string
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // Requiere permiso can_view_leads
  await requirePermission('can_view_leads')

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('leads')
    .select('*')
    .order('agenda_requested_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.from) query = query.gte('agenda_requested_at', params.from)
  if (params.to) query = query.lte('agenda_requested_at', params.to)

  const { data: leads } = await query
  const allLeads = (leads || []) as Lead[]

  // Stats
  const totalLeads = allLeads.length
  const agendados = allLeads.filter(l => l.status === 'agendado' || l.status === 'contactado' || l.status === 'cerrado').length
  const cerrados = allLeads.filter(l => l.status === 'cerrado').length
  const avgTime = allLeads.filter(l => l.time_to_agenda_hours !== null).length > 0
    ? allLeads.filter(l => l.time_to_agenda_hours !== null)
        .reduce((s, l) => s + (l.time_to_agenda_hours || 0), 0) /
      allLeads.filter(l => l.time_to_agenda_hours !== null).length
    : 0

  return (
    <div>
      <Header title="Leads" />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-gray-800/50 rounded-xl p-3 md:p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">Total Leads</span>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-1.5 rounded-lg"><Users className="h-3.5 w-3.5 text-white" /></div>
            </div>
            <p className="text-2xl font-bold text-blue-400">{totalLeads}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-gray-800/50 rounded-xl p-3 md:p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">Agendados</span>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-1.5 rounded-lg"><Calendar className="h-3.5 w-3.5 text-white" /></div>
            </div>
            <p className="text-2xl font-bold text-indigo-400">{agendados}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-gray-800/50 rounded-xl p-3 md:p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">Cerrados</span>
              <div className="bg-gradient-to-br from-emerald-500 to-green-500 p-1.5 rounded-lg"><TrendingUp className="h-3.5 w-3.5 text-white" /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{cerrados}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-gray-800/50 rounded-xl p-3 md:p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">Tiempo Prom.</span>
              <div className="bg-gradient-to-br from-amber-500 to-yellow-500 p-1.5 rounded-lg"><Clock className="h-3.5 w-3.5 text-white" /></div>
            </div>
            <p className="text-2xl font-bold text-amber-400">{avgTime > 24 ? `${(avgTime / 24).toFixed(1)}d` : `${avgTime.toFixed(1)}h`}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 md:gap-4">
          <select
            defaultValue={params.status || ''}
            className="bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          >
            <option value="">Todos los estados</option>
            <option value="nuevo">Nuevo</option>
            <option value="agendado">Agendado</option>
            <option value="contactado">Contactado</option>
            <option value="cerrado">Cerrado</option>
            <option value="perdido">Perdido</option>
          </select>
          <input
            type="date"
            defaultValue={params.from || ''}
            className="bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <input
            type="date"
            defaultValue={params.to || ''}
            className="bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        {/* Table */}
        {allLeads.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">No hay leads registrados</p>
          </div>
        ) : (
          <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">ID Many</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">IG User</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Nombre</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Primer Angulo</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Todos</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Ultimo</th>
                    <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Cant.</th>
                    <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Tiempo</th>
                    <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Estado</th>
                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 md:px-6 py-4">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {allLeads.map((lead) => {
                    const statusInfo = statusLabels[lead.status] || statusLabels.nuevo
                    const angles = lead.all_angles || []

                    return (
                      <tr key={lead.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 md:px-6 py-4 text-xs text-gray-500 font-mono">
                          {lead.manychat_subscriber_id || '—'}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-sm text-indigo-400">
                          {lead.ig_username ? `@${lead.ig_username}` : '—'}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-sm text-white font-medium">
                          {lead.name || '—'}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-xs">
                          {lead.first_angle ? (
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-full">
                              {lead.first_angle.replace('angulo_', '')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {angles.length > 0 ? angles.map((a: string, i: number) => (
                              <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                                {a.replace('angulo_', '')}
                              </span>
                            )) : '—'}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-xs">
                          {lead.last_angle ? (
                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-full">
                              {lead.last_angle.replace('angulo_', '')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center text-sm font-medium text-white">
                          {lead.total_angles}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center text-sm">
                          {lead.time_to_agenda_hours !== null ? (
                            <span className="text-amber-400">
                              {lead.time_to_agenda_hours > 24
                                ? `${(lead.time_to_agenda_hours / 24).toFixed(1)}d`
                                : `${lead.time_to_agenda_hours.toFixed(1)}h`}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center">
                          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusInfo.className)}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
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
        )}
      </div>
    </div>
  )
}
