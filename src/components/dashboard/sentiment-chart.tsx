'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface SentimentRadarData {
  stage: string
  score: number
}

export function SentimentChart({
  data,
  title = 'Evolución del Sentimiento',
}: {
  data: SentimentRadarData[]
  title?: string
}) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">No hay datos de sentimiento</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="stage" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            stroke="#4B5563"
            tick={{ fontSize: 10 }}
          />
          <Radar
            name="Sentimiento"
            dataKey="score"
            stroke="#818CF8"
            fill="#818CF8"
            fillOpacity={0.3}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
