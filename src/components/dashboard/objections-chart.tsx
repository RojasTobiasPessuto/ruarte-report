'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ObjectionData {
  objection: string
  count: number
  handledWellRate: number
}

const COLORS = ['#818CF8', '#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81']

export function ObjectionsChart({ data }: { data: ObjectionData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">No hay objeciones registradas</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Objeciones Más Frecuentes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data.slice(0, 6)}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9CA3AF" />
          <YAxis
            type="category"
            dataKey="objection"
            stroke="#9CA3AF"
            width={90}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
            formatter={(value) => [value, 'Veces']}
          />
          <Bar dataKey="count" name="Veces" radius={[0, 4, 4, 0]}>
            {data.slice(0, 6).map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
