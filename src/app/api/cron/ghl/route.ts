/**
 * Cron job paginado que sincroniza el pipeline "Agendas" de GHL.
 * Procesa 25 oportunidades por ejecución usando cursor en sync_state.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runGhlSyncBatch } from '@/lib/ghl-sync'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runGhlSyncBatch()
    return NextResponse.json(result)
  } catch (error) {
    console.error('GHL sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}
