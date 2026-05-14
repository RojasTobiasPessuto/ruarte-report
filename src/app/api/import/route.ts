import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, hasPermission, isAdmin } from '@/lib/permissions'
import { parseFilename, parseDocContent, toCallAnalysis } from '@/lib/import-parser'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUser()
    if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (!isAdmin(ctx) && !hasPermission(ctx, 'importar_llamadas')) {
      return NextResponse.json({ error: 'Sin permisos para importar' }, { status: 403 })
    }

    const formData = await request.formData()
    const uploadedFiles = formData.getAll('files') as File[]

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 })
    }

    const serviceClient = await createServiceRoleClient()

    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      details: [] as Array<{ filename: string; status: string; error?: string }>,
    }

    // Get existing closers (por nombre y email)
    const { data: existingClosers } = await serviceClient
      .from('closers')
      .select('id, name, email')

    const closerMap = new Map<string, string>()
    const closerByEmail = new Map<string, string>()
    for (const closer of existingClosers || []) {
      closerMap.set(closer.name.toLowerCase(), closer.id)
      if (closer.email) closerByEmail.set(closer.email.toLowerCase(), closer.id)
    }

    // Para matchear closer por email de app_user (ej: arriagadainaki@gmail.com → closer IÑAKI)
    const { data: appUsers } = await serviceClient
      .from('app_users')
      .select('email, closer_id')
    for (const u of appUsers || []) {
      if (u.email && u.closer_id) closerByEmail.set(u.email.toLowerCase(), u.closer_id)
    }

    for (const file of uploadedFiles) {
      try {
        const filename = file.name

        // Extract text content from file
        let textContent: string
        if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const result = await mammoth.extractRawText({ buffer })
          textContent = result.value
        } else {
          // .txt files
          textContent = await file.text()
        }

        if (!textContent || textContent.trim().length < 50) {
          results.errors++
          results.details.push({
            filename,
            status: 'error',
            error: 'Archivo vacío o contenido insuficiente',
          })
          continue
        }

        // Parse filename (detecta formato automáticamente)
        const { date, closerName, contactName, format } = parseFilename(filename)

        // Resolver closer: si el identificador parece email, buscar por email;
        // si no, buscar por nombre con fallback a match parcial.
        let closerId: string | undefined
        const closerKey = closerName.toLowerCase().trim()

        if (closerKey.includes('@')) {
          closerId = closerByEmail.get(closerKey)
        } else {
          // Exact name match
          closerId = closerMap.get(closerKey)
          // Si filename dice "Closer"/"Desconocido", buscar en el contenido
          let resolvedCloserName = closerName
          if (!closerId && (closerKey === 'closer' || closerKey === 'desconocido')) {
            const closerInContent = textContent.match(/(?:closer|vendedor|asesor)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)/i)
            if (closerInContent) resolvedCloserName = closerInContent[1].trim()
          }
          if (!closerId) {
            const resolvedLower = resolvedCloserName.toLowerCase()
            closerMap.forEach((existingId, existingName) => {
              if (closerId) return
              if (
                existingName.startsWith(resolvedLower) ||
                existingName.includes(resolvedLower) ||
                resolvedLower.includes(existingName.split(' ')[0])
              ) {
                closerId = existingId
              }
            })
          }
        }

        // ─── Formato TRANSCRIPT (nuevo): solo crea call con transcript, sin analysis ───
        if (format === 'transcript') {
          // Deduplicar por contact_name + closer_id
          const dupQuery = serviceClient
            .from('calls')
            .select('id')
            .eq('contact_name', contactName)
          const { data: existing } = closerId
            ? await dupQuery.eq('closer_id', closerId).maybeSingle()
            : await dupQuery.is('closer_id', null).maybeSingle()

          if (existing) {
            results.skipped++
            results.details.push({ filename, status: 'skipped', error: 'Ya existe un call con ese contacto y closer' })
            continue
          }

          const { error: callError } = await serviceClient.from('calls').insert({
            closer_id: closerId || null,
            contact_name: contactName,
            call_date: date,
            transcript: textContent,
            fathom_summary: textContent.substring(0, 5000),
            status: 'pending',
          })

          if (callError) {
            results.errors++
            results.details.push({ filename, status: 'error', error: callError.message })
            continue
          }

          results.success++
          results.details.push({ filename, status: 'success' })
          continue
        }

        // ─── Formato ANALYSIS (histórico): crea call + call_analyses ───
        // Si no se encontró closer, default a "Hernan Grando" (compatibilidad histórica)
        if (!closerId) {
          closerMap.forEach((existingId, existingName) => {
            if (!closerId && existingName.includes('hernan')) closerId = existingId
          })
        }

        const parsed = parseDocContent(textContent)
        const fullParsed = {
          ...parsed,
          date,
          closerName,
          contactName,
          rawContent: textContent,
        }

        // Deduplicar por date + contact_name (formato histórico tiene fecha real)
        const { data: existingAnalysis } = await serviceClient
          .from('calls')
          .select('id')
          .eq('contact_name', contactName)
          .eq('call_date', date)
          .maybeSingle()

        if (existingAnalysis) {
          results.skipped++
          results.details.push({ filename, status: 'skipped', error: 'Llamada ya existe' })
          continue
        }

        const { data: call, error: callError } = await serviceClient
          .from('calls')
          .insert({
            closer_id: closerId || null,
            contact_name: contactName,
            call_date: date,
            fathom_summary: textContent.substring(0, 5000),
            transcript: null,
            status: 'analyzed',
          })
          .select('id')
          .single()

        if (callError || !call) {
          results.errors++
          results.details.push({
            filename,
            status: 'error',
            error: callError?.message || 'Error al insertar llamada',
          })
          continue
        }

        const analysisData = toCallAnalysis(fullParsed)
        const { error: analysisError } = await serviceClient
          .from('call_analyses')
          .insert({ call_id: call.id, ...analysisData })

        if (analysisError) {
          results.errors++
          results.details.push({
            filename,
            status: 'error',
            error: `Llamada guardada pero análisis falló: ${analysisError.message}`,
          })
          continue
        }

        results.success++
        results.details.push({ filename, status: 'success' })
      } catch (err) {
        results.errors++
        results.details.push({
          filename: file.name,
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
