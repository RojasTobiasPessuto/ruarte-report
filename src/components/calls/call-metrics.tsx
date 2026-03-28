'use client'

import type { CallAnalysis } from '@/types'
import { cn } from '@/lib/utils'
import {
  Smile,
  Star,
  MessageSquare,
  Zap,
  AlertTriangle,
  ThumbsUp,
  ArrowUpRight,
  Tag,
  DollarSign,
  Gauge,
} from 'lucide-react'

function ScoreCircle({ score, max = 10, label, color }: {
  score: number
  max?: number
  label: string
  color: string
}) {
  const percentage = (score / max) * 100
  return (
    <div className="flex flex-col items-center">
      <div className={cn('text-3xl font-bold', color)}>{score}</div>
      <div className="text-xs text-gray-400 mt-1">/ {max}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function TagList({ items, icon: Icon, color }: {
  items: string[]
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border',
            color
          )}
        >
          <Icon className="h-3 w-3" />
          {item}
        </span>
      ))}
    </div>
  )
}

export function CallMetrics({ analysis }: { analysis: CallAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-center">
          <ScoreCircle score={analysis.sentiment_score} label="Sentimiento" color="text-yellow-400" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-center">
          <ScoreCircle score={analysis.call_quality_score} label="Calidad" color="text-purple-400" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-400">Ratio Hablar/Escuchar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${analysis.talk_listen_ratio?.closer || 50}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {analysis.talk_listen_ratio?.closer || 50}% / {analysis.talk_listen_ratio?.prospect || 50}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Closer</span>
            <span>Prospecto</span>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-gray-400">Urgencia</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full ml-auto',
                analysis.urgency_level === 'high' ? 'bg-red-400/10 text-red-400' :
                analysis.urgency_level === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                'bg-gray-400/10 text-gray-400'
              )}>
                {analysis.urgency_level === 'high' ? 'Alta' :
                 analysis.urgency_level === 'medium' ? 'Media' : 'Baja'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Precio</span>
              <span className="text-xs text-gray-300 ml-auto">
                {analysis.price_discussed ? 'Discutido' : 'No discutido'}
              </span>
            </div>
            {analysis.close_probability !== null && analysis.close_probability !== undefined && (
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-gray-400">Prob. cierre</span>
                <span className="text-xs text-indigo-400 ml-auto">{analysis.close_probability}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysis.power_words.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" /> Palabras de Poder
            </h4>
            <TagList items={analysis.power_words} icon={Zap} color="bg-yellow-400/5 text-yellow-400 border-yellow-400/20" />
          </div>
        )}

        {analysis.strengths.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-400" /> Fortalezas
            </h4>
            <TagList items={analysis.strengths} icon={ThumbsUp} color="bg-green-400/5 text-green-400 border-green-400/20" />
          </div>
        )}

        {analysis.missing_elements.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Qué Faltó
            </h4>
            <TagList items={analysis.missing_elements} icon={AlertTriangle} color="bg-red-400/5 text-red-400 border-red-400/20" />
          </div>
        )}

        {analysis.improvements.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-indigo-400" /> Recomendaciones
            </h4>
            <TagList items={analysis.improvements} icon={ArrowUpRight} color="bg-indigo-400/5 text-indigo-400 border-indigo-400/20" />
          </div>
        )}
      </div>

      {analysis.key_topics.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-400" /> Temas Clave
          </h4>
          <TagList items={analysis.key_topics} icon={Tag} color="bg-blue-400/5 text-blue-400 border-blue-400/20" />
        </div>
      )}
    </div>
  )
}
