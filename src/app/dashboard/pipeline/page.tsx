export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, hasPermission, isAdmin } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PipelineList } from '@/components/pipeline/pipeline-list'
import { PipelineSearch } from '@/components/pipeline/pipeline-search'
import type { Opportunity } from '@/types'
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
      call:calls(id, fathom_url)
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
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <PipelineSearch />
            
            <FilterSelect 
              param="stage" 
              placeholder="Todas las etapas" 
              options={STAGES.map(s => ({ label: s, value: s }))} 
              currentValue={params.stage}
            />

            <FilterSelect 
              param="programa" 
              placeholder="Todos los programas" 
              options={[
                { label: 'Mastermind', value: 'Mastermind' },
                { label: 'Formación', value: 'Formación' },
                { label: 'Programa PLUS', value: 'Programa PLUS' },
                { label: 'LITE', value: 'LITE' },
                { label: 'PAMM', value: 'PAMM - Manejo de Portafolio' },
              ]} 
              currentValue={params.programa}
            />

            <FilterSelect 
              param="form_completed" 
              placeholder="Estado Formulario" 
              options={[
                { label: 'Completado', value: 'true' },
                { label: 'Pendiente', value: 'false' },
              ]} 
              currentValue={params.form_completed}
            />

            {viewAllOpps && closers && closers.length > 0 && (
              <FilterSelect 
                param="closer" 
                placeholder="Todos los Closers" 
                options={closers.map(c => ({ label: c.name, value: c.id }))} 
                currentValue={params.closer}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs uppercase font-medium">Llamada desde:</span>
              <input 
                type="date" 
                defaultValue={params.from}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  if (e.target.value) url.searchParams.set('from', e.target.value)
                  else url.searchParams.delete('from')
                  window.location.href = url.toString()
                }}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs uppercase font-medium">Hasta:</span>
              <input 
                type="date" 
                defaultValue={params.to}
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  if (e.target.value) url.searchParams.set('to', e.target.value)
                  else url.searchParams.delete('to')
                  window.location.href = url.toString()
                }}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
              />
            </div>
            {(params.closer || params.stage || params.programa || params.form_completed || params.from || params.to || params.q) && (
              <a 
                href="/dashboard/pipeline" 
                className="text-indigo-400 hover:text-indigo-300 text-xs font-medium ml-auto"
              >
                Limpiar filtros
              </a>
            )}
          </div>
        </div>

        <PipelineList opportunities={allOpps} />
      </div>
    </div>
  )
}

function FilterSelect({ param, placeholder, options, currentValue }: { 
  param: string, 
  placeholder: string, 
  options: { label: string, value: string }[],
  currentValue?: string
}) {
  return (
    <select
      value={currentValue || ''}
      onChange={(e) => {
        const url = new URL(window.location.href)
        if (e.target.value) url.searchParams.set(param, e.target.value)
        else url.searchParams.delete(param)
        window.location.href = url.toString()
      }}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
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
