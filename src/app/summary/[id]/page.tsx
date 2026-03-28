export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { notFound } from 'next/navigation'
import type { Call } from '@/types'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServiceRoleClient()
  const { data: call } = await supabase
    .from('calls')
    .select('contact_name')
    .eq('id', id)
    .single()

  return {
    title: call ? `Resumen — ${call.contact_name || 'Llamada'}` : 'Resumen de Llamada',
    description: 'Resumen de la llamada de ventas — Ruarte Report',
  }
}

export default async function PublicSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServiceRoleClient()

  const { data: call } = await supabase
    .from('calls')
    .select(`
      *,
      closer:closers(name),
      analysis:call_analyses(summary, next_steps, key_topics, result, follow_up_date)
    `)
    .eq('id', id)
    .single()

  if (!call || !call.analysis) {
    notFound()
  }

  const typedCall = call as Call

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 text-indigo-400 text-xs font-medium px-3 py-1 rounded-full mb-4">
            Ruarte Report
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Resumen de Llamada</h1>
          <p className="text-gray-400">
            {format(new Date(typedCall.call_date), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6">
          {typedCall.contact_name && (
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participante
              </span>
              <p className="text-white mt-1">{typedCall.contact_name}</p>
            </div>
          )}

          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Resumen
            </span>
            <p className="text-gray-200 mt-2 leading-relaxed">
              {typedCall.analysis!.summary}
            </p>
          </div>

          {typedCall.analysis!.next_steps && (
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Próximos Pasos
              </span>
              <p className="text-gray-200 mt-2 leading-relaxed">
                {typedCall.analysis!.next_steps}
              </p>
            </div>
          )}

          {typedCall.analysis!.key_topics && typedCall.analysis!.key_topics.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Temas Tratados
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {typedCall.analysis!.key_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {typedCall.analysis!.follow_up_date && (
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-lg p-4">
              <span className="text-xs font-medium text-indigo-400">
                Próximo seguimiento: {format(new Date(typedCall.analysis!.follow_up_date), "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Generado automáticamente por Ruarte Report
        </p>
      </div>
    </div>
  )
}
