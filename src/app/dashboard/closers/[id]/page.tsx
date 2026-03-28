export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { ObjectionsChart } from '@/components/dashboard/objections-chart'
import { CallsTable } from '@/components/dashboard/calls-table'
import { notFound } from 'next/navigation'
import type { Call, Closer, DashboardStats } from '@/types'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function CloserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: closer } = await supabase
    .from('closers')
    .select('*')
    .eq('id', id)
    .single()

  if (!closer) notFound()

  const { data: calls } = await supabase
    .from('calls')
    .select(`
      *,
      closer:closers(*),
      analysis:call_analyses(*)
    `)
    .eq('closer_id', id)
    .order('call_date', { ascending: false })

  const allCalls = (calls || []) as Call[]
  const analyzedCalls = allCalls.filter((c) => c.analysis)

  const totalCalls = allCalls.length
  const closedCalls = analyzedCalls.filter((c) => c.analysis?.result === 'closed').length
  const closeRate = totalCalls > 0 ? (closedCalls / totalCalls) * 100 : 0
  const avgSentiment = analyzedCalls.length > 0
    ? analyzedCalls.reduce((s, c) => s + (c.analysis?.sentiment_score || 0), 0) / analyzedCalls.length
    : 0
  const avgQuality = analyzedCalls.length > 0
    ? analyzedCalls.reduce((s, c) => s + (c.analysis?.call_quality_score || 0), 0) / analyzedCalls.length
    : 0
  const totalFollowUps = analyzedCalls.filter((c) => c.analysis?.result === 'follow_up').length

  const stats: DashboardStats = { totalCalls, closedCalls, closeRate, avgSentiment, avgQuality, totalFollowUps }

  // Trend
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
      avgSentiment: weekCalls.length > 0
        ? weekCalls.reduce((s, c) => s + (c.analysis?.sentiment_score || 0), 0) / weekCalls.length
        : 0,
      avgQuality: weekCalls.length > 0
        ? weekCalls.reduce((s, c) => s + (c.analysis?.call_quality_score || 0), 0) / weekCalls.length
        : 0,
    })
  }

  // Objections
  const objectionMap = new Map<string, { count: number; handledWell: number }>()
  analyzedCalls.forEach((call) => {
    (call.analysis?.objections || []).forEach((obj) => {
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

  // Recurring strengths
  const strengthMap = new Map<string, number>()
  analyzedCalls.forEach((call) => {
    (call.analysis?.strengths || []).forEach((s) => {
      strengthMap.set(s, (strengthMap.get(s) || 0) + 1)
    })
  })
  const topStrengths = Array.from(strengthMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Recurring improvements
  const improvementMap = new Map<string, number>()
  analyzedCalls.forEach((call) => {
    (call.analysis?.improvements || []).forEach((s) => {
      improvementMap.set(s, (improvementMap.get(s) || 0) + 1)
    })
  })
  const topImprovements = Array.from(improvementMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const typedCloser = closer as Closer

  return (
    <div>
      <Header title={`Closer — ${typedCloser.name}`} />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart data={trendData} />
          <ObjectionsChart data={objectionsData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Fortalezas Recurrentes</h3>
            {topStrengths.length > 0 ? (
              <ul className="space-y-3">
                {topStrengths.map(([strength, count], i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{strength}</span>
                    <span className="text-xs bg-green-400/10 text-green-400 px-2 py-1 rounded-full">
                      {count}x
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">Sin datos aún</p>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Áreas de Mejora</h3>
            {topImprovements.length > 0 ? (
              <ul className="space-y-3">
                {topImprovements.map(([improvement, count], i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{improvement}</span>
                    <span className="text-xs bg-red-400/10 text-red-400 px-2 py-1 rounded-full">
                      {count}x
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">Sin datos aún</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Historial de Llamadas</h3>
          <CallsTable calls={allCalls} showCloser={false} />
        </div>
      </div>
    </div>
  )
}
