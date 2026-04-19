export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, hasPermission, isAdmin } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import type { Opportunity } from '@/types'
import { Kanban, Phone, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'

const STAGES = [
  'Agendado (Nuevo)',
  'Agendado (Confirmado)',
  'Post Llamada',
  'ReAgendado',
  'Seguimiento',
  'Compro',
  'No Compro',
  'Cancelado',
  'No Asistio',
]

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ closer?: string; stage?: string }>
}) {
  const ctx = await requireAuth()

  // Solo admin, closer (con can_fill_post_agenda) pueden entrar
  // Manager no entra (no tiene can_fill_post_agenda)
  if (!isAdmin(ctx) && !hasPermission(ctx, 'can_fill_post_agenda')) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  // Build query
  let query = supabase
    .from('opportunities')
    .select(`
      *,
      contact:contacts(*),
      closer:closers(*),
      lead:leads(id, ig_username),
      call:calls(id, fathom_url)
    `)
    .order('created_at', { ascending: false })

  // Filtrar por closer según permisos
  const viewAllOpps = isAdmin(ctx) || hasPermission(ctx, 'can_view_all_opportunities')
  if (!viewAllOpps) {
    if (!ctx.appUser.closer_id) {
      // Usuario sin closer asignado no ve nada
      return (
        <div>
          <Header title="Pipeline" />
          <div className="p-4 md:p-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-400">
                No tenés un closer asignado. Contactá al administrador.
              </p>
            </div>
          </div>
        </div>
      )
    }
    query = query.eq('closer_id', ctx.appUser.closer_id)
  } else if (params.closer) {
    query = query.eq('closer_id', params.closer)
  }

  if (params.stage) {
    query = query.eq('pipeline_stage', params.stage)
  }

  const { data: opportunities } = await query

  // Get closers for filter dropdown (admin only)
  const { data: closers } = viewAllOpps
    ? await supabase.from('closers').select('id, name').eq('active', true).order('name')
    : { data: [] }

  // Group by stage
  const byStage: Record<string, Opportunity[]> = {}
  for (const stage of STAGES) byStage[stage] = []
  for (const opp of (opportunities || []) as Opportunity[]) {
    const stage = opp.pipeline_stage || 'Agendado (Nuevo)'
    if (byStage[stage]) byStage[stage].push(opp)
    else byStage['Agendado (Nuevo)'].push(opp)
  }

  // Stats
  const allOpps = (opportunities || []) as Opportunity[]
  const total = allOpps.length
  const postLlamada = byStage['Post Llamada']?.length || 0
  const seguimiento = byStage['Seguimiento']?.length || 0
  const compro = byStage['Compro']?.length || 0
  const noCompro = byStage['No Compro']?.length || 0
  const cancelado = (byStage['Cancelado']?.length || 0) + (byStage['No Asistio']?.length || 0)
  const conversionRate = (compro + noCompro) > 0 ? (compro / (compro + noCompro)) * 100 : 0

  return (
    <div>
      <Header title="Pipeline" />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          <StatCard label="Total" value={total} icon={Kanban} color="text-indigo-400" bg="from-indigo-500/10 to-purple-500/5" />
          <StatCard label="Post Llamada" value={postLlamada} icon={Phone} color="text-orange-400" bg="from-orange-500/10 to-red-500/5" />
          <StatCard label="Seguimiento" value={seguimiento} icon={Clock} color="text-yellow-400" bg="from-yellow-500/10 to-amber-500/5" />
          <StatCard label="Compro" value={compro} icon={CheckCircle} color="text-emerald-400" bg="from-emerald-500/10 to-green-500/5" />
          <StatCard label="No Compro" value={noCompro} icon={XCircle} color="text-red-400" bg="from-red-500/10 to-rose-500/5" />
          <StatCard label="Tasa Cierre" value={`${conversionRate.toFixed(1)}%`} icon={TrendingUp} color="text-purple-400" bg="from-purple-500/10 to-pink-500/5" />
        </div>

        {/* Filter bar (admin only) */}
        {viewAllOpps && closers && closers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <a
              href="/dashboard/pipeline"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                !params.closer ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Todos
            </a>
            {closers.map((c) => (
              <a
                key={c.id}
                href={`/dashboard/pipeline?closer=${c.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  params.closer === c.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {c.name}
              </a>
            ))}
          </div>
        )}

        <PipelineBoard byStage={byStage} stages={STAGES} />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, bg }: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
}) {
  return (
    <div className={`bg-gradient-to-br ${bg} border border-gray-800/50 rounded-xl p-3 md:p-5 card-hover`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
