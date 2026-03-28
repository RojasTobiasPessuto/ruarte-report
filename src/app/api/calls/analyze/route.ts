import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { analyzeCall } from '@/lib/claude'
import { sendCallSummaryNotification } from '@/lib/highlevel'

export async function POST(request: NextRequest) {
  try {
    const { callId } = await request.json()

    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get the call
    const { data: call, error: fetchError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single()

    if (fetchError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    if (!call.transcript) {
      return NextResponse.json({ error: 'Call has no transcript' }, { status: 400 })
    }

    // Delete existing analysis if re-analyzing
    await supabase.from('call_analyses').delete().eq('call_id', callId)

    // Analyze
    const analysis = await analyzeCall({
      transcript: call.transcript,
      fathom_summary: call.fathom_summary || undefined,
      contact_name: call.contact_name || undefined,
    })

    // Save
    await supabase.from('call_analyses').insert({
      call_id: callId,
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

    await supabase.from('calls').update({ status: 'analyzed' }).eq('id', callId)

    // Notify
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const summaryUrl = `${appUrl}/summary/${callId}`

    if (call.contact_email && process.env.HIGHLEVEL_API_KEY) {
      const notified = await sendCallSummaryNotification(
        call.contact_email,
        call.contact_name || 'Cliente',
        summaryUrl
      )
      if (notified) {
        await supabase.from('calls').update({ status: 'notified' }).eq('id', callId)
      }
    }

    return NextResponse.json({
      message: 'Analysis completed',
      id: callId,
      summaryUrl,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
