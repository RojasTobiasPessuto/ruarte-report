/**
 * Sincroniza todos los leads de la DB a la pestaña "Leads" del Google Sheet.
 * Usado desde:
 *   - Webhook de ManyChat (cada vez que entra o se actualiza un lead)
 *   - Admin refresh-angles (después de actualizar todos los ángulos)
 *   - Endpoint admin manual
 *
 * Retorna null si faltan env vars (silent skip), o cantidad de rows sincronizadas.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { replaceSheetData, type SheetValue } from '@/lib/google-sheets'
import { formatAngleTag } from '@/lib/utils'
import type { Lead } from '@/types'

const HEADERS = [
  'Fecha que pidio Agenda',
  'Nombre',
  'IG',
  'Subscriber ID',
  'Primer Ángulo',
  'Último Ángulo',
  'Todos los Ángulos',
  'Cant. Ángulos',
  'Tiempo a Agenda (h)',
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

export interface SyncResult {
  ok: boolean
  rows?: number
  error?: string
  skipped?: boolean
}

export async function syncLeadsToSheet(): Promise<SyncResult> {
  const sheetId = process.env.GOOGLE_SHEETS_ID
  if (!sheetId) {
    return { ok: false, skipped: true, error: 'GOOGLE_SHEETS_ID no configurado' }
  }

  const hasCredentials = !!(
    process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ||
    (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY)
  )
  if (!hasCredentials) {
    return { ok: false, skipped: true, error: 'Credenciales de Google Sheets no configuradas' }
  }

  const supabase = await createServiceRoleClient()
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('agenda_requested_at', { ascending: false })

  if (error || !leads) {
    return { ok: false, error: error?.message || 'No se pudieron leer leads' }
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
    formatDate(l.manychat_joined_at),
    formatDate(l.created_at),
  ])

  try {
    await replaceSheetData(sheetId, 'Leads', HEADERS, rows)
    return { ok: true, rows: rows.length }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
