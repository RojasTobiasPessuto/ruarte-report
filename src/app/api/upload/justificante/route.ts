/**
 * POST /api/upload/justificante
 * Sube un archivo al bucket 'justificantes' de Supabase Storage.
 * Devuelve la URL pública.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No hay archivo' }, { status: 400 })
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Archivo muy grande (máx 10MB)' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Generar nombre único
    const ext = file.name.split('.').pop() || 'bin'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`
    const filePath = `${ctx.user.id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error } = await supabase.storage
      .from('justificantes')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: 'Error al subir archivo', details: error.message }, { status: 500 })
    }

    // Obtener URL pública
    const { data } = supabase.storage.from('justificantes').getPublicUrl(filePath)

    return NextResponse.json({
      url: data.publicUrl,
      path: filePath,
      filename: file.name,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Error interno', details: String(err) }, { status: 500 })
  }
}
