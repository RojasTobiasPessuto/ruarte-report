export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { CloserComparison } from '@/components/dashboard/closer-comparison'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { ObjectionsChart } from '@/components/dashboard/objections-chart'
import { CallsTable } from '@/components/dashboard/calls-table'
import type { DashboardStats, Call } from '@/types'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

async function getDashboardData() {
  const supabase = await createServerSupabaseClient()

  // Get all calls with analyses and closers
  const { data: calls } = await supabase
    .from('calls')
    .select(`
      *,
      closer:closers(*),
      analysis:call_analyses(*)
    `)
    .order('call_date', { ascending: false })

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

export default async function DashboardPage() {
  const { stats, closerComparison, trendData, objectionsData, recentCalls } =
    await getDashboardData()

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-8 space-y-6">
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
