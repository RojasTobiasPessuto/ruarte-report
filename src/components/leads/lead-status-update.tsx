'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const statuses = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'perdido', label: 'Perdido' },
]

export function LeadStatusUpdate({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleChange = async (newStatus: string) => {
    setSaving(true)
    setStatus(newStatus)

    const supabase = createClient()
    await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)

    setSaving(false)
    router.refresh()
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="bg-gray-800/80 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
    >
      {statuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
