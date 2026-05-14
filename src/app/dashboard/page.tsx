export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { CloserComparison } from '@/components/dashboard/closer-comparison'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { ObjectionsChart } from '@/components/dashboard/objections-chart'
import { CallsTable } from '@/components/dashboard/calls-table'
import { DateFilter } from '@/components/dashboard/date-filter'
import type { DashboardStats, Call } from '@/types'
import { format, startOfWeek, endOfWeek, subWeeks, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

function getDateRange(params: { range?: string; from?: string; to?: string }): { from: Date | null; to: Date | null } {
  const now = new Date()

  switch (params.range) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case '7d':
      return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) }
    case '30d':
      return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) }
    case '90d':
      return { from: startOfDay(subDays(now, 90)), to: endOfDay(now) }
    case 'custom':
      return {
        from: params.from ? new Date(params.from) : null,
        to: params.to ? endOfDay(new Date(params.to)) : null,
      }
    default:
      return { from: null, to: null }
  }
}

async function getDashboardData(dateFrom: Date | null, dateTo: Date | null) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('calls')
    .select(`
      *,
      closer:closers(*),
      analysis:call_analyses(*)
    `)
    .order('call_date', { ascending: false })

  if (dateFrom) query = query.gte('call_date', dateFrom.toISOString())
  if (dateTo) query = query.lte('call_date', dateTo.toISOString())

  const { data: calls } = await query

  const allCalls = (calls || []) as Call[]
  const analyzedCalls = allCalls.filter((c) => c.analysis)

  // Stats
  const totalCalls = allCalls.length
  const closedCalls = analyzedCalls.filter((c) => c.analysis?.result === 'closed').length
  const closeRate = totalCalls > 0 ? (closedCalls / totalCalls) * 100 : 0
  const avgSentiment =
    analyzedCalls.length > 0
      ? analyzedCalls.reduce((sum, c) => sum + (c.analysis?.sentiment_score || 0), 0) /
        analyzedCalls.length
      : 0
  const avgQuality =
    analyzedCalls.length > 0
      ? analyzedCalls.reduce((sum, c) => sum + (c.analysis?.call_quality_score || 0), 0) /
        analyzedCalls.length
      : 0
  const totalFollowUps = analyzedCalls.filter((c) => c.analysis?.result === 'follow_up').length

  const stats: DashboardStats = {
    totalCalls,
    closedCalls,
    closeRate,
    avgSentiment,
    avgQuality,
    totalFollowUps,
  }

  // Closer comparison
  const { data: closers } = await supabase.from('closers').select('*').eq('active', true)

  const closerComparison = (closers || []).map((closer) => {
    const closerCalls = analyzedCalls.filter((c) => c.closer_id === closer.id)
    const closerClosed = closerCalls.filter((c) => c.analysis?.result === 'closed').length
    return {
      name: closer.name,
      closeRate: closerCalls.length > 0 ? (closerClosed / closerCalls.length) * 100 : 0,
      avgSentiment:
        closerCalls.length > 0
          ? closerCalls.reduce((s, c) => s + (c.analysis?.sentiment_score || 0), 0) /
            closerCalls.length
          : 0,
      avgQuality:
        closerCalls.length > 0
          ? closerCalls.reduce((s, c) => s + (c.analysis?.call_quality_score || 0), 0) /
            closerCalls.length
          : 0,
      totalCalls: closerCalls.length,
    }
  })

  // Trend data (last 8 weeks)
  const trendData = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const weekCalls = analyzedCalls.filter((c) => {
      const date = new Date(c.call_date)
      return date >= weekStart && date <= weekEnd
    })
    const weekClosed = weekCalls.filter((c) => c.analysis?.result === 'closed').length
    trendData.push({
      date: format(weekStart, 'd MMM', { locale: es }),
      closeRate: weekCalls.length > 0 ? (weekClosed / weekCalls.length) * 100 : 0,
      avgSentiment:
        weekCalls.length > 0
          ? weekCalls.reduce((s, c) => s + (c.analysis?.sentiment_score || 0), 0) /
            weekCalls.length
          : 0,
      avgQuality:
        weekCalls.length > 0
          ? weekCalls.reduce((s, c) => s + (c.analysis?.call_quality_score || 0), 0) /
            weekCalls.length
          : 0,
    })
  }

  // Objections aggregation
  const objectionMap = new Map<string, { count: number; handledWell: number }>()
  analyzedCalls.forEach((call) => {
    const objections = call.analysis?.objections || []
    objections.forEach((obj) => {
      const existing = objectionMap.get(obj.objection) || { count: 0, handledWell: 0 }
      existing.count++
      if (obj.handled_well) existing.handledWell++
      objectionMap.set(obj.objection, existing)
    })
  })
  const objectionsData = Array.from(objectionMap.entries())
    .map(([objection, data]) => ({
      objection: objection.length > 30 ? objection.substring(0, 30) + '...' : objection,
      count: data.count,
      handledWellRate: data.count > 0 ? (data.handledWell / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Recent calls (last 5)
  const recentCalls = allCalls.slice(0, 5)

  return { stats, closerComparison, trendData, objectionsData, recentCalls }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; embed?: string }>
}) {
  const ctx = await requireAuth()
  const params = await searchParams

  // Solo admin y roles con ver_dashboard pueden ver el dashboard (closer solo pipeline)
  if (!isAdmin(ctx) && !hasPermission(ctx, 'ver_dashboard')) {
    redirect(params.embed === 'true' ? '/dashboard/pipeline?embed=true' : '/dashboard/pipeline')
  }

  const { from, to } = getDateRange(params)
  const { stats, closerComparison, trendData, objectionsData, recentCalls } =
    await getDashboardData(from, to)

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <DateFilter />
        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CloserComparison data={closerComparison} />
          <TrendChart data={trendData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ObjectionsChart data={objectionsData} />
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Llamadas Recientes</h3>
            <CallsTable calls={recentCalls} />
          </div>
        </div>
      </div>
    </div>
  )
}
