import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { listRecordings, formatTranscript, calculateDuration, getRecordingId, getSummaryText, extractContactName } from '@/lib/fathom'
import { analyzeCall } from '@/lib/claude'
import { sendCallSummaryNotification } from '@/lib/highlevel'

/**
 * Cron job that polls Fathom API for new recordings.
 * Runs every 10 minutes via Vercel Cron.
 * Also supports multiple Fathom API keys (one per closer account).
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this header for cron jobs)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceRoleClient()

    // Collect all Fathom API keys (support multiple closer accounts)
    const fathomKeys: string[] = []
    if (process.env.FATHOM_API_KEY) fathomKeys.push(process.env.FATHOM_API_KEY)
    if (process.env.FATHOM_API_KEY_2) fathomKeys.push(process.env.FATHOM_API_KEY_2)

    if (fathomKeys.length === 0) {
      return NextResponse.json({ error: 'No Fathom API keys configured' }, { status: 400 })
    }

    // Get the last processed call date to only fetch new ones
    const { data: lastCall } = await supabase
      .from('calls')
      .select('call_date')
      .not('fathom_call_id', 'is', null)
      .order('call_date', { ascending: false })
      .limit(1)
      .single()

    // Default to 24 hours ago if no previous calls
    const createdAfter = lastCall
      ? lastCall.call_date
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Get existing closers for email matching
    const { data: closers } = await supabase
      .from('closers')
      .select('id, name, email')
      .eq('active', true)

    const closersByEmail = new Map<string, string>()
    const closersByName = new Map<string, string>()
    for (const closer of closers || []) {
      if (closer.email) closersByEmail.set(closer.email.toLowerCase(), closer.id)
      closersByName.set(closer.name.toLowerCase(), closer.id)
    }

    let totalProcessed = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const apiKey of fathomKeys) {
      try {
        const recordings = await listRecordings(apiKey, {
          createdAfter,
          includeTranscript: true,
          includeSummary: true,
        })

        for (const recording of recordings) {
          try {
            // Get unique recording ID
            const fathomId = getRecordingId(recording)
            if (!fathomId) {
              console.error('Recording has no ID:', JSON.stringify(recording).substring(0, 200))
              totalErrors++
              continue
            }

            // Skip if already processed
            const { data: existing } = await supabase
              .from('calls')
              .select('id')
              .eq('fathom_call_id', fathomId)
              .single()

            if (existing) {
              totalSkipped++
              continue
            }

            // Match closer by recorder email or attendee emails
            let closerId: string | null = null

            // First try: recorder email
            if (recording.recorded_by?.email) {
              closerId = closersByEmail.get(recording.recorded_by.email.toLowerCase()) || null
            }

            // Second try: match attendees against known closers
            if (!closerId && recording.calendar_invitees) {
              for (const attendee of recording.calendar_invitees) {
                const match = closersByEmail.get(attendee.email.toLowerCase())
                if (match) {
                  closerId = match
                  break
                }
              }
            }

            // Find contact (first external attendee who isn't the closer)
            const closerEmailSet = new Set(
              Array.from(closersByEmail.keys())
            )
            const contact = recording.calendar_invitees?.find(
              (a) => a.is_external || !closersByEmail.has(a.email.toLowerCase())
            )

            // Extract client name from multiple sources
            const contactName = extractContactName(recording, closerEmailSet)
              || contact?.name
              || null

            // Build transcript string
            const transcript = recording.transcript && Array.isArray(recording.transcript)
              ? formatTranscript(recording.transcript)
              : null

            const summary = getSummaryText(recording)

            // Calculate duration
            const duration = recording.recording_start_time && recording.recording_end_time
              ? calculateDuration(recording.recording_start_time, recording.recording_end_time)
              : null

            // Insert call
            const { data: call, error: insertError } = await supabase
              .from('calls')
              .insert({
                closer_id: closerId,
                contact_name: contactName || 'Sin nombre',
                contact_email: contact?.email || null,
                fathom_call_id: fathomId,
                fathom_url: recording.share_url || recording.url || null,
                call_date: recording.created_at,
                duration_minutes: duration,
                transcript,
                fathom_summary: summary,
                status: 'pending',
              })
              .select('id')
              .single()

            if (insertError || !call) {
              console.error('Error inserting call:', insertError)
              totalErrors++
              continue
            }

            // Analyze with Claude
            if (transcript || summary) {
              try {
                const analysis = await analyzeCall({
                  transcript: transcript || summary || '',
                  fathom_summary: summary || undefined,
                  contact_name: contact?.name,
                })

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

                // Update contact name if Claude found it and current name is generic
                const currentName = contactName || 'Sin nombre'
                const claudeName = analysis.contact_name as string | null
                if (claudeName && (currentName === 'Sin nombre' || currentName === 'Impromptu Google Meet Meeting' || currentName.includes('Meeting'))) {
                  await supabase.from('calls').update({ status: 'analyzed', contact_name: claudeName }).eq('id', call.id)
                } else {
                  await supabase.from('calls').update({ status: 'analyzed' }).eq('id', call.id)
                }

                // Send notification via HighLevel
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ruarte-report.vercel.app'
                const summaryUrl = `${appUrl}/summary/${call.id}`

                if (contact?.email && process.env.HIGHLEVEL_API_KEY) {
                  const notified = await sendCallSummaryNotification(
                    contact.email,
                    contact.name || 'Cliente',
                    summaryUrl
                  )
                  if (notified) {
                    await supabase.from('calls').update({ status: 'notified' }).eq('id', call.id)
                  }
                }
              } catch (analysisError) {
                console.error('Analysis error:', analysisError)
                await supabase.from('calls').update({ status: 'error' }).eq('id', call.id)
              }
            }

            totalProcessed++
          } catch (recordingError) {
            console.error('Error processing recording:', recordingError)
            totalErrors++
          }
        }
      } catch (apiError) {
        console.error('Fathom API error:', apiError)
        totalErrors++
      }
    }

    return NextResponse.json({
      message: 'Cron completed',
      processed: totalProcessed,
      skipped: totalSkipped,
      errors: totalErrors,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
