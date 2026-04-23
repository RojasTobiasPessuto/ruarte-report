/**
 * POST /api/admin/leads/sync-to-sheet
 * Trigger manual del sync (útil para testing o retry).
 * El sync se dispara automáticamente en el webhook de ManyChat también.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'
import { syncLeadsToSheet } from '@/lib/sync-leads-to-sheet'

export async function POST() {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const result = await syncLeadsToSheet()
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Leads sincronizados al Sheet',
    rows: result.rows,
    sheet_url: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}/edit`,
  })
}
