import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { analyzeCall } from '@/lib/claude'
import { sendCallSummaryNotification } from '@/lib/highlevel'
import type { FathomWebhookPayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get('x-webhook-secret')
    if (process.env.FATHOM_WEBHOOK_SECRET && webhookSecret !== process.env.FATHOM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: FathomWebhookPayload = await request.json()

    const supabase = await createServiceRoleClient()

    // Check if call already exists
    const { data: existing } = await supabase
      .from('calls')
      .select('id')
      .eq('fathom_call_id', payload.call_id)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Call already processed', id: existing.id })
    }

    // Try to match closer by attendee email
    let closerId: string | null = null
    if (payload.attendees && payload.attendees.length > 0) {
      for (const attendee of payload.attendees) {
        const { data: closer } = await supabase
          .from('closers')
          .select('id')
          .eq('email', attendee.email)
          .eq('active', true)
          .single()

        if (closer) {
          closerId = closer.id
          break
        }
      }
    }

    // Determine contact (first non-closer attendee)
    const contactAttendee = payload.attendees?.find(
      (a) => {
        if (!closerId) return true
        return true // We'll use the first attendee as contact for now
      }
    )

    // Insert call record
    const { data: call, error: insertError } = await supabase
      .from('calls')
      .insert({
        closer_id: closerId,
        contact_name: contactAttendee?.name || payload.title,
        contact_email: contactAttendee?.email || null,
        fathom_call_id: payload.call_id,
        call_date: payload.created_at || new Date().toISOString(),
        duration_minutes: payload.duration ? Math.round(payload.duration / 60) : null,
        transcript: payload.transcript,
        fathom_summary: payload.summary,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !call) {
      console.error('Error inserting call:', insertError)
      return NextResponse.json({ error: 'Failed to save call' }, { status: 500 })
    }

    // Analyze with Claude
    try {
      const analysis = await analyzeCall({
        transcript: payload.transcript,
        fathom_summary: payload.summary,
        contact_name: contactAttendee?.name,
      })

      // Save analysis
      await supabase.from('call_analyses').insert({
        call_id: call.id,
        summary: analysis.summary as string,
        result: analysis.result as string,
        result_reason: analysis.result_reason as string,
        close_probability: analysis.close_probability as number | null,
        sentiment_score: analysis.sentiment_score as number,
        sentiment_evolution: analysis.sentiment_evolution,
        call_quality_score: analysis.call_quality_score as number,
        talk_listen_ratio: analysis.talk_listen_ratio,
        objections: analysis.objections,
        power_words: analysis.power_words,
        missing_elements: analysis.missing_elements,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        next_steps: analysis.next_steps as string,
        follow_up_date: analysis.follow_up_date as string | null,
        price_discussed: analysis.price_discussed as boolean,
        urgency_level: analysis.urgency_level as string,
        key_topics: analysis.key_topics,
        raw_analysis: analysis,
      })

      // Update call status
      await supabase.from('calls').update({ status: 'analyzed' }).eq('id', call.id)

      // Send notification via HighLevel
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const summaryUrl = `${appUrl}/summary/${call.id}`

      if (contactAttendee?.email && process.env.HIGHLEVEL_API_KEY) {
        const notified = await sendCallSummaryNotification(
          contactAttendee.email,
          contactAttendee.name || 'Cliente',
          summaryUrl
        )

        if (notified) {
          await supabase.from('calls').update({ status: 'notified' }).eq('id', call.id)
        }
      }

      return NextResponse.json({
        message: 'Call processed successfully',
        id: call.id,
        summaryUrl,
      })
    } catch (analysisError) {
      console.error('Error analyzing call:', analysisError)
      await supabase.from('calls').update({ status: 'error' }).eq('id', call.id)
      return NextResponse.json({
        message: 'Call saved but analysis failed',
        id: call.id,
      }, { status: 207 })
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
