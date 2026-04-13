'use client'

import { MessageCircle, Target, Calendar, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LeadTimelineProps {
  joinedAt: string | null
  angles: string[]
  agendaRequestedAt: string
}

export function LeadTimeline({ joinedAt, angles, agendaRequestedAt }: LeadTimelineProps) {
  const steps: Array<{
    icon: typeof MessageCircle
    label: string
    sublabel: string
    date: string | null
    color: string
    lineColor: string
  }> = []

  // Step 1: Ingreso a ManyChat
  steps.push({
    icon: MessageCircle,
    label: 'Ingreso a ManyChat',
    sublabel: joinedAt
      ? format(new Date(joinedAt), "d MMM yyyy, HH:mm", { locale: es })
      : 'Fecha no disponible',
    date: joinedAt,
    color: 'bg-blue-500',
    lineColor: 'border-blue-500/30',
  })

  // Steps 2..N: Angles
  for (const angle of angles) {
    steps.push({
      icon: Target,
      label: angle.replace('angulo_', ''),
      sublabel: 'Angulo de venta',
      date: null,
      color: 'bg-indigo-500',
      lineColor: 'border-indigo-500/30',
    })
  }

  // Last step: Solicitud de agenda
  steps.push({
    icon: Calendar,
    label: 'Solicitud de Agenda',
    sublabel: format(new Date(agendaRequestedAt), "d MMM yyyy, HH:mm", { locale: es }),
    date: agendaRequestedAt,
    color: 'bg-emerald-500',
    lineColor: 'border-emerald-500/30',
  })

  // Calculate time between first and last
  let timeBetween: string | null = null
  if (joinedAt) {
    const diffMs = new Date(agendaRequestedAt).getTime() - new Date(joinedAt).getTime()
    const hours = diffMs / (1000 * 60 * 60)
    if (hours > 24) {
      timeBetween = `${(hours / 24).toFixed(1)} dias`
    } else if (hours > 1) {
      timeBetween = `${hours.toFixed(1)} horas`
    } else {
      timeBetween = `${Math.round(hours * 60)} minutos`
    }
  }

  return (
    <div className="relative">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4 relative">
          {/* Vertical line */}
          <div className="flex flex-col items-center">
            <div className={`h-10 w-10 rounded-full ${step.color} flex items-center justify-center shadow-lg z-10`}>
              <step.icon className="h-5 w-5 text-white" />
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 min-h-[40px] border-l-2 border-dashed ${steps[i + 1].lineColor}`} />
            )}
          </div>

          {/* Content */}
          <div className="pb-8 pt-1.5 flex-1">
            <p className="text-sm font-medium text-white">{step.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{step.sublabel}</p>

            {/* Time indicator between first and last */}
            {i === 0 && timeBetween && steps.length > 1 && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs">
                <ArrowDown className="h-3 w-3" />
                {timeBetween} hasta agenda
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
