/**
 * POST /api/admin/leads/sync-to-sheet
 * Pushea todos los leads a la pestaña "Leads" del Google Sheet configurado.
 * Sobrescribe la pestaña entera cada vez (mirror de solo salida).
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'
import { replaceSheetData, type SheetValue } from '@/lib/google-sheets'
import { formatAngleTag } from '@/lib/utils'
import type { Lead } from '@/types'

const HEADERS = [
  'Fecha Agenda',
  'Nombre',
  'IG',
  'Subscriber ID',
  'Primer Ángulo',
  'Último Ángulo',
  'Todos los Ángulos',
  'Cant. Ángulos',
  'Tiempo a Agenda (h)',
  'Estado',
  'ManyChat Joined',
  'Registrado en Sistema',
]

function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toISOString().replace('T', ' ').substring(0, 16)
  } catch {
    return iso
  }
}

export async function POST() {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const sheetId = process.env.GOOGLE_SHEETS_ID
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID no configurado' }, { status: 500 })
  }

  const supabase = await createServiceRoleClient()
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('agenda_requested_at', { ascending: false })

  if (error || !leads) {
    return NextResponse.json({ error: error?.message || 'No se pudieron leer leads' }, { status: 500 })
  }

  const rows: SheetValue[][] = (leads as Lead[]).map((l) => [
    formatDate(l.agenda_requested_at),
    l.name || '',
    l.ig_username ? `@${l.ig_username}` : '',
    l.manychat_subscriber_id || '',
    l.first_angle ? formatAngleTag(l.first_angle) : '',
    l.last_angle ? formatAngleTag(l.last_angle) : '',
    (l.all_angles || []).map(formatAngleTag).join(', '),
    l.total_angles,
    l.time_to_agenda_hours ?? '',
    l.status,
    formatDate(l.manychat_joined_at),
    formatDate(l.created_at),
  ])

  try {
    await replaceSheetData(sheetId, 'Leads', HEADERS, rows)
  } catch (e) {
    console.error('Sheets sync error:', e)
    return NextResponse.json({
      error: 'Error al escribir en el Sheet',
      details: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Leads sincronizados al Sheet',
    rows: rows.length,
    sheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
  })
}
