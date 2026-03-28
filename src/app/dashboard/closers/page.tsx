export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import Link from 'next/link'
import { Users, TrendingUp, Phone, Star } from 'lucide-react'
import type { Closer, Call } from '@/types'
import { cn } from '@/lib/utils'

export default async function ClosersPage() {
  const supabase = await createServerSupabaseClient()

  const { data: closers } = await supabase
    .from('closers')
    .select('*')
    .eq('active', true)
    .order('name')

  const { data: calls } = await supabase
    .from('calls')
    .select(`
      *,
      analysis:call_analyses(*)
    `)

  const allCalls = (calls || []) as Call[]

  const closerStats = (closers || []).map((closer: Closer) => {
    const closerCalls = allCalls.filter((c) => c.closer_id === closer.id)
    const analyzed = closerCalls.filter((c) => c.analysis)
    const closed = analyzed.filter((c) => c.analysis?.result === 'closed')
    const avgSentiment = analyzed.length > 0
      ? analyzed.reduce((s, c) => s + (c.analysis?.sentiment_score || 0), 0) / analyzed.length
      : 0
    const avgQuality = analyzed.length > 0
      ? analyzed.reduce((s, c) => s + (c.analysis?.call_quality_score || 0), 0) / analyzed.length
      : 0

    return {
      ...closer,
      totalCalls: closerCalls.length,
      closedCalls: closed.length,
      closeRate: closerCalls.length > 0 ? (closed.length / closerCalls.length) * 100 : 0,
      avgSentiment,
      avgQuality,
    }
  })

  return (
    <div>
      <Header title="Closers" />
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {closerStats.map((closer) => (
            <Link
              key={closer.id}
              href={`/dashboard/closers/${closer.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-indigo-500/50 transition-colors group"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 bg-indigo-600/20 rounded-full flex items-center justify-center">
                  <Users className="h-7 w-7 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    {closer.name}
                  </h3>
                  {closer.email && (
                    <p className="text-sm text-gray-400">{closer.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs text-gray-400">Llamadas</span>
                  </div>
                  <p className="text-lg font-bold text-white">{closer.totalCalls}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-xs text-gray-400">Tasa cierre</span>
                  </div>
                  <p className={cn(
                    'text-lg font-bold',
                    closer.closeRate >= 50 ? 'text-green-400' : closer.closeRate >= 25 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {closer.closeRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-xs text-gray-400">Sentimiento</span>
                  </div>
                  <p className="text-lg font-bold text-white">{closer.avgSentiment.toFixed(1)}/10</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs text-gray-400">Calidad</span>
                  </div>
                  <p className="text-lg font-bold text-white">{closer.avgQuality.toFixed(1)}/10</p>
                </div>
              </div>
            </Link>
          ))}

          {closerStats.length === 0 && (
            <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-400">No hay closers registrados. Agregá uno desde Configuración.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
