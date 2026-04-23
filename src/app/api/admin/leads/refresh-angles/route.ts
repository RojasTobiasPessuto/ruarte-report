/**
 * POST /api/admin/leads/refresh-angles
 * Re-sincroniza los ángulos de todos los leads contra la API de ManyChat.
 * Útil cuando cambió el criterio de filtrado (ej: de "angulo_*" a "Ang*").
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'
import { syncLeadsToSheet } from '@/lib/sync-leads-to-sheet'

const MANYCHAT_API_BASE = 'https://api.manychat.com'

interface ManyChatTag {
  id: number
  name: string
}

async function getSubscriberTags(subscriberId: string, token: string): Promise<ManyChatTag[]> {
  const res = await fetch(
    `${MANYCHAT_API_BASE}/fb/subscriber/getInfo?subscriber_id=${subscriberId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ManyChat ${res.status}: ${text.substring(0, 200)}`)
  }
  const data = await res.json()
  return data.data?.tags || []
}

export async function POST() {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const token = process.env.MANYCHAT_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'MANYCHAT_API_TOKEN no configurado' }, { status: 500 })
  }

  const supabase = await createServiceRoleClient()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, manychat_subscriber_id, name')
    .not('manychat_subscriber_id', 'is', null)

  if (error || !leads) {
    return NextResponse.json({ error: error?.message || 'No se pudieron leer leads' }, { status: 500 })
  }

  let updated = 0
  let unchanged = 0
  let errors = 0
  const errorSamples: string[] = []

  for (const lead of leads) {
    try {
      const tags = await getSubscriberTags(lead.manychat_subscriber_id!, token)
      const angleTags = tags
        .filter((t) => t.name.toLowerCase().startsWith('ang'))
        .map((t) => t.name)

      const firstAngle = angleTags[0] || null
      const lastAngle = angleTags[angleTags.length - 1] || null
      const totalAngles = angleTags.length

      const { error: updErr, count } = await supabase
        .from('leads')
        .update({
          first_angle: firstAngle,
          last_angle: lastAngle,
          all_angles: angleTags,
          total_angles: totalAngles,
        }, { count: 'exact' })
        .eq('id', lead.id)

      if (updErr) {
        errors++
        if (errorSamples.length < 3) errorSamples.push(`${lead.name}: ${updErr.message}`)
        continue
      }

      if (count && count > 0) updated++
      else unchanged++
    } catch (e) {
      errors++
      if (errorSamples.length < 3) {
        errorSamples.push(`${lead.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // Push al Google Sheet después de refrescar
  const syncResult = await syncLeadsToSheet()

  return NextResponse.json({
    total: leads.length,
    updated,
    unchanged,
    errors,
    error_samples: errorSamples.length > 0 ? errorSamples : undefined,
    sheet_synced: syncResult.ok,
    sheet_error: syncResult.ok || syncResult.skipped ? undefined : syncResult.error,
  })
}
