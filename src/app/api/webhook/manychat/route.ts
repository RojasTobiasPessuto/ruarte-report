import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const MANYCHAT_API_BASE = 'https://api.manychat.com'
const MANYCHAT_TOKEN = process.env.MANYCHAT_API_TOKEN

interface ManyChatTag {
  id: number
  name: string
}

interface ManyChatSubscriber {
  id: string
  name: string
  first_name: string
  last_name: string
  ig_username?: string
  instagram_id?: string
  phone?: string
  email?: string
  tags: ManyChatTag[]
  created_at?: string
  subscribed_at?: string
  custom_fields?: Array<{ id: number; name: string; value: unknown }>
}

async function getSubscriberInfo(subscriberId: string): Promise<ManyChatSubscriber | null> {
  if (!MANYCHAT_TOKEN) {
    console.error('MANYCHAT_API_TOKEN not configured')
    return null
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
    return null
  }

  const result = await response.json()
  return result.data || null
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    const subscriberId = payload.subscriber_id || payload.id
    if (!subscriberId) {
      return NextResponse.json({ error: 'subscriber_id is required' }, { status: 400 })
    }

    // Get full subscriber info from ManyChat API
    const subscriber = await getSubscriberInfo(subscriberId)

    // Extract data from webhook payload + ManyChat API
    const name = subscriber?.name
      || `${payload.first_name || ''} ${payload.last_name || ''}`.trim()
      || payload.name
      || null

    const igUsername = subscriber?.ig_username
      || payload.ig_username
      || null

    const joinedAt = subscriber?.created_at
      || subscriber?.subscribed_at
      || payload.joined_at
      || null

    // Filter tags by "angulo_" prefix
    const allTags = subscriber?.tags || []
    const angleTags = allTags
      .filter((tag: ManyChatTag) => tag.name.toLowerCase().startsWith('angulo_'))
      .map((tag: ManyChatTag) => tag.name)

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

    if (existing) {
      // Update existing lead
      const { error } = await supabase
        .from('leads')
        .update({
          name,
          ig_username: igUsername,
          first_angle: firstAngle,
          all_angles: angleTags,
          last_angle: lastAngle,
          total_angles: totalAngles,
          manychat_joined_at: joinedAt,
          agenda_requested_at: now.toISOString(),
          time_to_agenda_hours: timeToAgendaHours,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating lead:', error)
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Lead updated', id: existing.id })
    }

    // Insert new lead
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
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
        status: 'nuevo',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting lead:', insertError)
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Lead created', id: lead?.id })
  } catch (error) {
    console.error('ManyChat webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
