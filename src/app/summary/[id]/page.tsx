export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { notFound } from 'next/navigation'
import type { Call } from '@/types'
import type { Metadata } from 'next'
import { BarChart3, Calendar, MessageSquare, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Ruarte Report</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Resumen de Llamada</h1>
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Calendar className="h-4 w-4" />
            <p className="text-sm">
              {format(new Date(typedCall.call_date), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="glass rounded-2xl border border-gray-800/50 p-6 md:p-8 space-y-6 shadow-2xl shadow-black/20 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {typedCall.contact_name && (
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                Participante
              </span>
              <p className="text-white mt-1 font-medium">{typedCall.contact_name}</p>
            </div>
          )}

          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> Resumen
            </span>
            <p className="text-gray-200 mt-2 leading-relaxed">
              {typedCall.analysis!.summary}
            </p>
          </div>

          {typedCall.analysis!.next_steps && (
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3" /> Próximos Pasos
              </span>
              <p className="text-gray-200 mt-2 leading-relaxed">
                {typedCall.analysis!.next_steps}
              </p>
            </div>
          )}

          {typedCall.analysis!.key_topics && typedCall.analysis!.key_topics.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                Temas Tratados
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {typedCall.analysis!.key_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {typedCall.analysis!.follow_up_date && (
            <div className="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="text-xs text-gray-400">Próximo seguimiento</span>
                <p className="text-sm font-medium text-indigo-300">
                  {format(new Date(typedCall.analysis!.follow_up_date), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Generado automáticamente por <span className="text-gray-500">Ruarte Report</span>
        </p>
      </div>
    </div>
  )
}
