import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncLeadsToSheet } from '@/lib/sync-leads-to-sheet'

const MANYCHAT_API_BASE = 'https://api.manychat.com'
const MANYCHAT_TOKEN = process.env.MANYCHAT_API_TOKEN

interface ManyChatTag {
  id: number
  name: string
}

async function getSubscriberTags(subscriberId: string): Promise<ManyChatTag[]> {
  if (!MANYCHAT_TOKEN) {
    console.error('MANYCHAT_API_TOKEN not configured')
    return []
  }

  const response = await fetch(
    `${MANYCHAT_API_BASE}/fb/subscriber/getInfo?subscriber_id=${subscriberId}`,
    {
      headers: {
        'Authorization': `Bearer ${MANYCHAT_TOKEN}`,
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    console.error('ManyChat API error:', response.status, await response.text())
    return []
  }

  const result = await response.json()
  return result.data?.tags || []
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Full Contact Data format from ManyChat
    const subscriberId = payload.id || payload.subscriber_id
    if (!subscriberId) {
      return NextResponse.json({ error: 'subscriber_id/id is required' }, { status: 400 })
    }

    // Extract data from Full Contact Data
    const name = payload.name
      || `${payload.first_name || ''} ${payload.last_name || ''}`.trim()
      || null

    const igUsername = payload.ig_username || null
    const joinedAt = payload.subscribed || null

    // GET tags from ManyChat API (not included in Full Contact Data)
    const allTags = await getSubscriberTags(String(subscriberId))

    // Capturamos ángulos: cualquier tag que empiece con "ang" (case-insensitive).
    // Esto cubre "Ang*", "ang_*", "angulo_*", etc.
    const angleTags = allTags
      .filter((tag) => tag.name.toLowerCase().startsWith('ang'))
      .map((tag) => tag.name)

    const firstAngle = angleTags.length > 0 ? angleTags[0] : null
    const lastAngle = angleTags.length > 0 ? angleTags[angleTags.length - 1] : null
    const totalAngles = angleTags.length

    // Calculate time to agenda in hours
    const now = new Date()
    let timeToAgendaHours: number | null = null
    if (joinedAt) {
      const joinedDate = new Date(joinedAt)
      const diffMs = now.getTime() - joinedDate.getTime()
      timeToAgendaHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
    }

    const supabase = await createServiceRoleClient()

    // Check if lead already exists (update if so)
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('manychat_subscriber_id', String(subscriberId))
      .single()

    const leadData = {
      manychat_subscriber_id: String(subscriberId),
      name,
      ig_username: igUsername,
      first_angle: firstAngle,
      all_angles: angleTags,
      last_angle: lastAngle,
      total_angles: totalAngles,
      manychat_joined_at: joinedAt,
      agenda_requested_at: now.toISOString(),
      time_to_agenda_hours: timeToAgendaHours,
    }

    let leadId: string | null = null
    let action: 'created' | 'updated' = 'created'

    if (existing) {
      const { error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating lead:', error)
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
      }
      leadId = existing.id
      action = 'updated'
    } else {
      const { data: lead, error: insertError } = await supabase
        .from('leads')
        .insert({ ...leadData, status: 'nuevo' })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error inserting lead:', insertError)
        return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
      }
      leadId = lead?.id || null
    }

    // Push a Google Sheet (best-effort, no bloquea la respuesta al webhook si falla)
    const syncResult = await syncLeadsToSheet()
    if (!syncResult.ok && !syncResult.skipped) {
      console.error('Sheets sync failed (non-fatal):', syncResult.error)
    }

    return NextResponse.json({
      message: `Lead ${action}`,
      id: leadId,
      sheet_synced: syncResult.ok,
    })
  } catch (error) {
    console.error('ManyChat webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
