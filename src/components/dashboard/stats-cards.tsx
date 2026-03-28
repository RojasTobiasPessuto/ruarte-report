'use client'

import { Phone, CheckCircle, TrendingUp, Star, SmilePlus, Clock } from 'lucide-react'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats
}

const cards = [
  {
    key: 'totalCalls' as const,
    label: 'Total Llamadas',
    icon: Phone,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    format: (v: number) => v.toString(),
  },
  {
    key: 'closedCalls' as const,
    label: 'Cerradas',
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    format: (v: number) => v.toString(),
  },
  {
    key: 'closeRate' as const,
    label: 'Tasa de Cierre',
    icon: TrendingUp,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: 'avgSentiment' as const,
    label: 'Sentimiento Prom.',
    icon: SmilePlus,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    format: (v: number) => `${v.toFixed(1)}/10`,
  },
  {
    key: 'avgQuality' as const,
    label: 'Calidad Prom.',
    icon: Star,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    format: (v: number) => `${v.toFixed(1)}/10`,
  },
  {
    key: 'totalFollowUps' as const,
    label: 'Follow-ups',
    icon: Clock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    format: (v: number) => v.toString(),
  },
]

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">{card.label}</span>
            <div className={`${card.bgColor} p-2 rounded-lg`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {card.format(stats[card.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
