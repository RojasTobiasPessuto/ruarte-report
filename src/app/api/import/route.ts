import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseFilename, parseDocContent, toCallAnalysis } from '@/lib/import-parser'

export async function POST(request: NextRequest) {
  try {
    // Verify user is admin
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (appUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden importar' }, { status: 403 })
    }

    const { files } = await request.json() as {
      files: Array<{ filename: string; content: string }>
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 })
    }

    const serviceClient = await createServiceRoleClient()

    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      details: [] as Array<{ filename: string; status: string; error?: string }>,
    }

    // Get existing closers
    const { data: existingClosers } = await serviceClient
      .from('closers')
      .select('*')

    const closerMap = new Map<string, string>()
    for (const closer of existingClosers || []) {
      closerMap.set(closer.name.toLowerCase(), closer.id)
    }

    for (const file of files) {
      try {
        // Parse filename
        const { date, closerName, contactName } = parseFilename(file.filename)

        // Find or create closer
        let closerId: string | undefined = closerMap.get(closerName.toLowerCase())
        if (!closerId) {
          const { data: newCloser } = await serviceClient
            .from('closers')
            .insert({ name: closerName })
            .select('id')
            .single()

          if (newCloser) {
            closerId = newCloser.id as string
            closerMap.set(closerName.toLowerCase(), closerId!)
          }
        }

        // Parse content
        const parsed = parseDocContent(file.content)
        const fullParsed = {
          ...parsed,
          date,
          closerName,
          contactName,
          rawContent: file.content,
        }

        // Check if call already exists (by date + contact name)
        const { data: existing } = await serviceClient
          .from('calls')
          .select('id')
          .eq('contact_name', contactName)
          .eq('call_date', date)
          .single()

        if (existing) {
          results.skipped++
          results.details.push({
            filename: file.filename,
            status: 'skipped',
            error: 'Llamada ya existe',
          })
          continue
        }

        // Insert call
        const { data: call, error: callError } = await serviceClient
          .from('calls')
          .insert({
            closer_id: closerId || null,
            contact_name: contactName,
            call_date: date,
            fathom_summary: file.content.substring(0, 5000),
            transcript: null,
            status: 'analyzed',
          })
          .select('id')
          .single()

        if (callError || !call) {
          results.errors++
          results.details.push({
            filename: file.filename,
            status: 'error',
            error: callError?.message || 'Error al insertar llamada',
          })
          continue
        }

        // Insert analysis
        const analysisData = toCallAnalysis(fullParsed)
        const { error: analysisError } = await serviceClient
          .from('call_analyses')
          .insert({
            call_id: call.id,
            ...analysisData,
          })

        if (analysisError) {
          results.errors++
          results.details.push({
            filename: file.filename,
            status: 'error',
            error: `Llamada guardada pero análisis falló: ${analysisError.message}`,
          })
          continue
        }

        results.success++
        results.details.push({
          filename: file.filename,
          status: 'success',
        })
      } catch (err) {
        results.errors++
        results.details.push({
          filename: file.filename,
          status: 'error',
          error: err instanceof Error ? err.message : 'Error desconocido',
        })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
