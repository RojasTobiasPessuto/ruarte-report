'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CloserComparisonData {
  name: string
  closeRate: number
  avgSentiment: number
  avgQuality: number
  totalCalls: number
}

export function CloserComparison({ data }: { data: CloserComparisonData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">No hay datos de closers disponibles</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Comparación de Closers</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9CA3AF" />
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
          <Bar dataKey="closeRate" name="Tasa de Cierre %" fill="#818CF8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avgSentiment" name="Sentimiento Prom." fill="#34D399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avgQuality" name="Calidad Prom." fill="#FBBF24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
