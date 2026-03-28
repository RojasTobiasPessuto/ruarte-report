'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TrendDataPoint {
  date: string
  closeRate: number
  avgSentiment: number
  avgQuality: number
}

export function TrendChart({ data }: { data: TrendDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">No hay datos de tendencia disponibles</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Tendencia Semanal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="closeRate"
            name="Tasa de Cierre %"
            stroke="#818CF8"
            strokeWidth={2}
            dot={{ fill: '#818CF8' }}
          />
          <Line
            type="monotone"
            dataKey="avgSentiment"
            name="Sentimiento"
            stroke="#34D399"
            strokeWidth={2}
            dot={{ fill: '#34D399' }}
          />
          <Line
            type="monotone"
            dataKey="avgQuality"
            name="Calidad"
            stroke="#FBBF24"
            strokeWidth={2}
            dot={{ fill: '#FBBF24' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
