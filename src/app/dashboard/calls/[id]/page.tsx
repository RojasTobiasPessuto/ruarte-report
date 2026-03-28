export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { CallDetail } from '@/components/calls/call-detail'
import { CallMetrics } from '@/components/calls/call-metrics'
import { SentimentChart } from '@/components/dashboard/sentiment-chart'
import { notFound } from 'next/navigation'
import type { Call } from '@/types'

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: call } = await supabase
    .from('calls')
    .select(`
      *,
      closer:closers(*),
      analysis:call_analyses(*)
    `)
    .eq('id', id)
    .single()

  if (!call) {
    notFound()
  }

  const typedCall = call as Call

  return (
    <div>
      <Header title={`Llamada — ${typedCall.contact_name || 'Sin nombre'}`} />
      <div className="p-8 space-y-6">
        <CallDetail call={typedCall} />

        {typedCall.analysis && (
          <>
            <CallMetrics analysis={typedCall.analysis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SentimentChart
                data={typedCall.analysis.sentiment_evolution || []}
                title="Evolución del Sentimiento"
              />

              {/* Objections detail */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Objeciones</h3>
                {typedCall.analysis.objections.length > 0 ? (
                  <div className="space-y-4">
                    {typedCall.analysis.objections.map((obj, i) => (
                      <div key={i} className="border border-gray-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-white">{obj.objection}</p>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              obj.handled_well
                                ? 'bg-green-400/10 text-green-400'
                                : 'bg-red-400/10 text-red-400'
                            }`}
                          >
                            {obj.handled_well ? 'Bien manejada' : 'A mejorar'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          <span className="text-gray-500">Respuesta:</span> {obj.response}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No se detectaron objeciones</p>
                )}
              </div>
            </div>

            {/* Transcript collapsible */}
            {typedCall.transcript && (
              <details className="bg-gray-900 border border-gray-800 rounded-xl">
                <summary className="p-6 cursor-pointer text-lg font-semibold text-white hover:text-indigo-400 transition-colors">
                  Ver Transcripción Completa
                </summary>
                <div className="px-6 pb-6">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {typedCall.transcript}
                  </pre>
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}
