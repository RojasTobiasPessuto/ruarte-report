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
    gradient: 'from-blue-500/10 to-cyan-500/5',
    iconBg: 'from-blue-500 to-cyan-500',
    color: 'text-blue-400',
    format: (v: number) => v.toString(),
  },
  {
    key: 'closedCalls' as const,
    label: 'Cerradas',
    icon: CheckCircle,
    gradient: 'from-emerald-500/10 to-green-500/5',
    iconBg: 'from-emerald-500 to-green-500',
    color: 'text-emerald-400',
    format: (v: number) => v.toString(),
  },
  {
    key: 'closeRate' as const,
    label: 'Tasa de Cierre',
    icon: TrendingUp,
    gradient: 'from-indigo-500/10 to-purple-500/5',
    iconBg: 'from-indigo-500 to-purple-500',
    color: 'text-indigo-400',
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: 'avgSentiment' as const,
    label: 'Sentimiento',
    icon: SmilePlus,
    gradient: 'from-amber-500/10 to-yellow-500/5',
    iconBg: 'from-amber-500 to-yellow-500',
    color: 'text-amber-400',
    format: (v: number) => `${v.toFixed(1)}/10`,
  },
  {
    key: 'avgQuality' as const,
    label: 'Calidad',
    icon: Star,
    gradient: 'from-purple-500/10 to-pink-500/5',
    iconBg: 'from-purple-500 to-pink-500',
    color: 'text-purple-400',
    format: (v: number) => `${v.toFixed(1)}/10`,
  },
  {
    key: 'totalFollowUps' as const,
    label: 'Follow-ups',
    icon: Clock,
    gradient: 'from-orange-500/10 to-red-500/5',
    iconBg: 'from-orange-500 to-red-500',
    color: 'text-orange-400',
    format: (v: number) => v.toString(),
  },
]

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`bg-gradient-to-br ${card.gradient} border border-gray-800/50 rounded-xl p-3 md:p-5 card-hover`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 font-medium">{card.label}</span>
            <div className={`bg-gradient-to-br ${card.iconBg} p-1.5 rounded-lg shadow-sm`}>
              <card.icon className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className={`text-2xl md:text-2xl font-bold ${card.color}`}>
            {card.format(stats[card.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
