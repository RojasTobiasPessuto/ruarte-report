export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, hasPermission, isAdmin } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PipelineList } from '@/components/pipeline/pipeline-list'
import { PipelineFilters } from '@/components/pipeline/pipeline-filters'
import type { Opportunity, Closer } from '@/types'
import { List, Phone, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'

const STAGES = [
  'Post Llamada',
  'Seguimiento',
  'Compro',
  'No Compro',
  'Cancelado',
  'No Asistio',
]

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ 
    closer?: string; 
    stage?: string; 
    q?: string;
    programa?: string;
    form_completed?: string;
    from?: string;
    to?: string;
  }>
}) {
  const ctx = await requireAuth()

  // Solo admin, closer (con can_fill_post_agenda) pueden entrar
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
      call:calls(id, fathom_url),
      sales(id, payments(fecha_pago, pagado))
    `)
    .order('created_at', { ascending: false })

  // Filtrar por closer según permisos
  const viewAllOpps = isAdmin(ctx) || hasPermission(ctx, 'can_view_all_opportunities')
  if (!viewAllOpps) {
    if (!ctx.appUser.closer_id) {
      return (
        <div>
          <Header title="Oportunidades" />
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

  if (params.programa) {
    query = query.eq('programa', params.programa)
  }

  if (params.form_completed) {
    query = query.eq('form_completed', params.form_completed === 'true')
  }

  if (params.from) {
    query = query.gte('fecha_llamada', params.from)
  }
  if (params.to) {
    query = query.lte('fecha_llamada', params.to)
  }

  // Buscador por nombre o email
  if (params.q && params.q.trim()) {
    const q = params.q.trim()
    query = query.or(`contact_name.ilike.%${q}%,contact_email.ilike.%${q}%`)
  }

  const { data: opportunities } = await query
  const allOpps = (opportunities || []) as Opportunity[]

  // Get closers and other filter metadata
  const { data: closers } = viewAllOpps
    ? await supabase.from('closers').select('id, name').eq('active', true).order('name')
    : { data: [] }

  const closersArray = (closers || []) as Closer[]

  const userIsAdmin = isAdmin(ctx)
  const canFillForm = userIsAdmin || hasPermission(ctx, 'can_fill_post_agenda')
  const canCreatePayment = userIsAdmin || hasPermission(ctx, 'can_create_payment')
  const canEditPayment = userIsAdmin || hasPermission(ctx, 'can_edit_payment')
  const canChangeOwner = userIsAdmin || hasPermission(ctx, 'can_view_all_opportunities')

  // Stats para las tarjetas (basadas en todas las opps filtradas)
  const total = allOpps.length
  const postLlamada = allOpps.filter(o => o.pipeline_stage === 'Post Llamada').length
  const seguimiento = allOpps.filter(o => o.pipeline_stage === 'Seguimiento').length
  const compro = allOpps.filter(o => o.pipeline_stage === 'Compro').length
  const noCompro = allOpps.filter(o => o.pipeline_stage === 'No Compro').length
  const conversionRate = (compro + noCompro) > 0 ? (compro / (compro + noCompro)) * 100 : 0

  return (
    <div>
      <Header title="Oportunidades" />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          <StatCard label="Total" value={total} icon={List} color="text-indigo-400" bg="from-indigo-500/10 to-purple-500/5" />
          <StatCard label="Post Llamada" value={postLlamada} icon={Phone} color="text-orange-400" bg="from-orange-500/10 to-red-500/5" />
          <StatCard label="Seguimiento" value={seguimiento} icon={Clock} color="text-yellow-400" bg="from-yellow-500/10 to-amber-500/5" />
          <StatCard label="Compro" value={compro} icon={CheckCircle} color="text-emerald-400" bg="from-emerald-500/10 to-green-500/5" />
          <StatCard label="No Compro" value={noCompro} icon={XCircle} color="text-red-400" bg="from-red-500/10 to-rose-500/5" />
          <StatCard label="Tasa Cierre" value={`${conversionRate.toFixed(1)}%`} icon={TrendingUp} color="text-purple-400" bg="from-purple-500/10 to-pink-500/5" />
        </div>

        {/* Filters */}
        <PipelineFilters closers={closersArray} viewAllOpps={viewAllOpps} />

        <PipelineList 
          opportunities={allOpps}
          isAdmin={userIsAdmin}
          canFillForm={canFillForm}
          canCreatePayment={canCreatePayment}
          canEditPayment={canEditPayment}
          canChangeOwner={canChangeOwner}
        />
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
