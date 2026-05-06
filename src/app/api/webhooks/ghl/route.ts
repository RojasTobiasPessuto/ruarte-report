/**
 * Webhook receiver para GoHighLevel.
 * Recibe eventos de oportunidades en tiempo real y sincroniza a Supabase.
 * 
 * Protegido con Bearer token (GHL_WEBHOOK_SECRET).
 * El cron existente (/api/cron/ghl) sigue corriendo como backup.
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncSingleOpportunity, softDeleteOpportunity } from '@/lib/ghl-sync-single'

const WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const authHeader = request.headers.get('authorization')
    if (!WEBHOOK_SECRET || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.warn('[Webhook GHL] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parsear body
    const body = await request.json()
    const eventType = body.type || body.event || 'unknown'
    const opportunityId = body.id || body.opportunityId

    console.log(`[Webhook GHL] Event: ${eventType}, Opportunity: ${opportunityId}`)

    if (!opportunityId) {
      console.warn('[Webhook GHL] No opportunity ID in payload:', JSON.stringify(body).substring(0, 500))
      return NextResponse.json({ ok: true, action: 'skipped', detail: 'No opportunity ID' })
    }

    // 3. Procesar según tipo de evento
    let result

    switch (eventType) {
      case 'OpportunityDelete':
        // Soft delete: marcar deleted_at, no borrar datos
        result = await softDeleteOpportunity(opportunityId)
        break

      case 'OpportunityCreate':
      case 'OpportunityStageUpdate':
      case 'OpportunityStatusUpdate':
      case 'OpportunityAssignedToUpdate':
      case 'OpportunityMonetaryValueUpdate':
        // Sync completo: traer datos de GHL y upsert
        result = await syncSingleOpportunity(opportunityId)
        break

      default:
        // Evento desconocido: ignorar sin error (no romper el webhook)
        console.log(`[Webhook GHL] Unknown event type: ${eventType}, ignoring`)
        return NextResponse.json({ ok: true, action: 'skipped', detail: `Unknown event: ${eventType}` })
    }

    console.log(`[Webhook GHL] ${eventType} → ${result.action} "${result.name}"`)

    return NextResponse.json({
      ok: true,
      action: result.action,
      name: result.name,
      detail: result.detail,
    })
  } catch (error) {
    console.error('[Webhook GHL] Error:', error)
    // Devolver 200 incluso en error para que GHL no reintente infinitamente
    // El cron de backup capturará cualquier dato perdido
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 200 }
    )
  }
}
