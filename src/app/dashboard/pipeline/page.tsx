export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, hasPermission, isAdmin } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import type { Opportunity } from '@/types'

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

  return (
    <div>
      <Header title="Pipeline" />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
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
