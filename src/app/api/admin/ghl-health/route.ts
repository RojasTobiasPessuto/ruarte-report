/**
 * GET /api/admin/ghl-health
 * Test directo de la API de GHL para diagnosticar.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'
import { searchOpportunities, GHL_STAGE_IDS, GHL_STAGE_NAMES } from '@/lib/ghl'

const STAGES = [
  GHL_STAGE_IDS.postLlamada,
  GHL_STAGE_IDS.seguimiento,
  GHL_STAGE_IDS.compro,
  GHL_STAGE_IDS.noCompro,
  GHL_STAGE_IDS.cancelado,
  GHL_STAGE_IDS.noAsistio,
]

export async function GET() {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const results: Record<string, unknown> = {}

  for (const stageId of STAGES) {
    const stageName = GHL_STAGE_NAMES[stageId]
    try {
      const res = await searchOpportunities({
        pipelineStageId: stageId,
        limit: 5,
      })
      results[stageName] = {
        total: res.meta.total,
        returned: res.opportunities.length,
        first_opportunity: res.opportunities[0]
          ? {
              id: res.opportunities[0].id,
              name: res.opportunities[0].name,
              assignedTo: res.opportunities[0].assignedTo,
            }
          : null,
      }
    } catch (e) {
      results[stageName] = {
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }

  return NextResponse.json({
    api_key_present: !!process.env.HIGHLEVEL_API_KEY,
    location_id: process.env.HIGHLEVEL_LOCATION_ID,
    pipeline_id: process.env.GHL_PIPELINE_ID,
    stages: results,
  })
}
