/**
 * POST /api/admin/sync
 * Acciones admin para el cron de GHL:
 *  - action: "reset" → borra cursor, arranca desde 0
 *  - action: "run" → ejecuta el cron inmediatamente
 *  - action: "status" → devuelve el estado actual del sync
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'
import { GHL_STAGE_IDS, GHL_STAGE_NAMES } from '@/lib/ghl'
import { runGhlSyncBatch } from '@/lib/ghl-sync'

const SYNC_KEY = 'ghl_opportunities'

const STAGES_TO_SYNC = [
  GHL_STAGE_IDS.postLlamada,
  GHL_STAGE_IDS.seguimiento,
  GHL_STAGE_IDS.compro,
  GHL_STAGE_IDS.noCompro,
  GHL_STAGE_IDS.cancelado,
  GHL_STAGE_IDS.noAsistio,
]

export async function POST(request: NextRequest) {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const action = body.action as string

  const supabase = await createServiceRoleClient()

  if (action === 'reset') {
    // Borrar cursor
    await supabase.from('sync_state').delete().eq('key', SYNC_KEY)
    return NextResponse.json({ message: 'Cursor reseteado. Próxima ejecución del cron arrancará desde Post Llamada.' })
  }

  if (action === 'run') {
    try {
      const MAX_BATCHES = 8
      const results = []
      let totalCreated = 0
      let totalUpdated = 0
      let totalErrors = 0
      let totalProcessed = 0
      let totalOrphansCleaned = 0

      for (let i = 0; i < MAX_BATCHES; i++) {
        const result = await runGhlSyncBatch()
        results.push(result)
        totalCreated += result.created
        totalUpdated += result.updated
        totalErrors += result.errors
        totalProcessed += result.batch_size
        if (result.orphans_cleaned) totalOrphansCleaned += result.orphans_cleaned

        if (!result.stage_has_more && !result.has_next_stage) break
      }

      return NextResponse.json({
        message: `Ejecutados ${results.length} batches exitosamente`,
        total_created: totalCreated,
        total_updated: totalUpdated,
        total_errors: totalErrors,
        total_processed: totalProcessed,
        total_orphans_cleaned: totalOrphansCleaned,
        status: 'success'
      })
    } catch (err) {
      console.error('Manual sync error:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ 
        error: 'Error ejecutando sync', 
        details: errorMessage
      }, { status: 500 })
    }
  }

  if (action === 'run_single') {
    // Un solo batch (más rápido pero menos oportunidades)
    try {
      const result = await runGhlSyncBatch()
      return NextResponse.json({ message: 'Sync ejecutado', result })
    } catch (err) {
      console.error('Manual sync error:', err)
      return NextResponse.json({ error: 'Error ejecutando sync', details: String(err) }, { status: 500 })
    }
  }

  if (action === 'status') {
    const { data: state } = await supabase
      .from('sync_state')
      .select('*')
      .eq('key', SYNC_KEY)
      .maybeSingle()

    let currentStageName = 'No iniciado'
    if (state?.cursor_value) {
      const stageIndex = parseInt(state.cursor_value.split('|')[0]) || 0
      const stageId = STAGES_TO_SYNC[stageIndex]
      currentStageName = GHL_STAGE_NAMES[stageId] || 'Desconocido'
    }

    const { count: totalOpps } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      cursor: state?.cursor_value || null,
      current_stage: currentStageName,
      total_processed_cycle: state?.total_processed || 0,
      last_completed_at: state?.last_completed_at || null,
      updated_at: state?.updated_at || null,
      total_opportunities_in_db: totalOpps || 0,
    })
  }

  return NextResponse.json({ error: 'Acción inválida. Usá: reset, run, status' }, { status: 400 })
}
