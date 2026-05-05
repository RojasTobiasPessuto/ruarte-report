/**
 * Lógica de sync GHL reutilizable.
 * Usada por el cron (/api/cron/ghl) y por el trigger manual (/api/admin/sync).
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  searchOpportunities,
  getCustomFieldValue,
  parseSpanishDate,
  GHL_FIELD_IDS,
  GHL_STAGE_NAMES,
  GHL_STAGE_IDS,
} from '@/lib/ghl'

const SYNC_KEY = 'ghl_opportunities'
const BATCH_SIZE = 10

const STAGES_TO_SYNC = [
  GHL_STAGE_IDS.postLlamada,
  GHL_STAGE_IDS.seguimiento,
  GHL_STAGE_IDS.compro,
  GHL_STAGE_IDS.noCompro,
  GHL_STAGE_IDS.cancelado,
  GHL_STAGE_IDS.noAsistio,
]

interface ContactRow {
  id: string
  ghl_contact_id: string | null
}

async function findOrCreateContact(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  data: {
    ghl_contact_id: string
    name: string | null
    email: string | null
    phone: string | null
    ig_username: string | null
  }
): Promise<string | null> {
  let { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('ghl_contact_id', data.ghl_contact_id)
    .maybeSingle()

  if (existing) return (existing as ContactRow).id

  if (data.email) {
    const result = await supabase.from('contacts').select('*').eq('email', data.email).maybeSingle()
    existing = result.data
  }

  if (!existing && data.phone) {
    const result = await supabase.from('contacts').select('*').eq('phone', data.phone).maybeSingle()
    existing = result.data
  }

  if (!existing && data.ig_username) {
    const result = await supabase.from('contacts').select('*').eq('ig_username', data.ig_username).maybeSingle()
    existing = result.data
  }

  if (existing) {
    const row = existing as ContactRow
    if (!row.ghl_contact_id) {
      await supabase
        .from('contacts')
        .update({ ghl_contact_id: data.ghl_contact_id, updated_at: new Date().toISOString() })
        .eq('id', row.id)
    }
    return row.id
  }

  const { data: created, error } = await supabase
    .from('contacts')
    .insert({
      ghl_contact_id: data.ghl_contact_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      ig_username: data.ig_username,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating contact:', error)
    return null
  }

  return created?.id || null
}

async function findLeadByContact(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  contactId: string
): Promise<string | null> {
  const { data } = await supabase.from('leads').select('id').eq('contact_id', contactId).maybeSingle()
  return data?.id || null
}

async function findCallByContact(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  contactId: string,
  closerId: string | null
): Promise<string | null> {
  let query = supabase
    .from('calls')
    .select('id')
    .eq('contact_id', contactId)
    .order('call_date', { ascending: false })
    .limit(1)

  if (closerId) query = query.eq('closer_id', closerId)

  const { data } = await query
  return data && data.length > 0 ? data[0].id : null
}

export interface SyncResult {
  message: string
  stage: string
  stage_index: string
  batch_size: number
  total_in_stage: number
  total_processed_cycle: number
  created: number
  updated: number
  errors: number
  error_samples?: string[]
  stage_has_more: boolean
  has_next_stage: boolean
  orphans_cleaned?: number
  cursor_used?: { startAfter?: number; startAfterId?: string } | null
  cursor_reset?: boolean
}

export async function runGhlSyncBatch(): Promise<SyncResult> {
  const supabase = await createServiceRoleClient()

  const { data: state } = await supabase
    .from('sync_state')
    .select('*')
    .eq('key', SYNC_KEY)
    .maybeSingle()

  let stageIndex = 0
  let startAfter: number | undefined
  let startAfterId: string | undefined

  if (state?.cursor_value) {
    const parts = state.cursor_value.split('|')
    stageIndex = parseInt(parts[0]) || 0
    if (parts[1]) startAfter = parseInt(parts[1])
    if (state.cursor_id) startAfterId = state.cursor_id
  }

  const totalProcessedBefore = state?.total_processed || 0
  const currentStageId = STAGES_TO_SYNC[stageIndex]
  const currentStageName = GHL_STAGE_NAMES[currentStageId]

  // Si es el primer batch del ciclo (no había cursor antes), guardar timestamp
  const isFirstBatchOfCycle = !state?.cursor_value
  let cycleStartedAt: string = state?.cycle_started_at as string
  if (isFirstBatchOfCycle || !cycleStartedAt) {
    cycleStartedAt = new Date().toISOString()
  }

  let res = await searchOpportunities({
    pipelineStageId: currentStageId,
    limit: BATCH_SIZE,
    startAfter,
    startAfterId,
  })

  // Auto-recuperación: si el cursor no devuelve nada pero la stage tiene oportunidades,
  // el cursor está trabado. Limpiar y reintentar desde el principio de la stage.
  let cursorReset = false
  if (
    (startAfter || startAfterId) &&
    res.opportunities.length === 0 &&
    res.meta.total > 0
  ) {
    console.log(
      `[GHL Sync] Cursor trabado en "${currentStageName}" (total=${res.meta.total}, devolvió 0). Reseteando y reintentando.`
    )
    cursorReset = true
    startAfter = undefined
    startAfterId = undefined
    res = await searchOpportunities({
      pipelineStageId: currentStageId,
      limit: BATCH_SIZE,
    })
  }

  const opportunities = res.opportunities

  const { data: closers } = await supabase.from('closers').select('id, ghl_user_id')
  const closersByGhlUserId = new Map<string, string>()
  for (const c of closers || []) {
    if (c.ghl_user_id) closersByGhlUserId.set(c.ghl_user_id, c.id)
  }

  let created = 0
  let updated = 0
  let errors = 0
  const errorSamples: string[] = []

  for (const opp of opportunities) {
    try {
      const igUsername = opp.contact?.tags?.find((t) => t.startsWith('ig:'))?.replace('ig:', '') || null

      const contactId = await findOrCreateContact(supabase, {
        ghl_contact_id: opp.contactId,
        name: opp.contact?.name || opp.name,
        email: opp.contact?.email || null,
        phone: opp.contact?.phone || null,
        ig_username: igUsername,
      })

      if (!contactId) {
        errors++
        continue
      }

      const closerId = opp.assignedTo ? closersByGhlUserId.get(opp.assignedTo) || null : null
      const leadId = await findLeadByContact(supabase, contactId)
      const callId = await findCallByContact(supabase, contactId, closerId)

      const cf = opp.customFields || []
      const estadoCita = getCustomFieldValue(cf, GHL_FIELD_IDS.estadoCita) as string | null
      const programa = getCustomFieldValue(cf, GHL_FIELD_IDS.programa) as string | null
      const situacion = getCustomFieldValue(cf, GHL_FIELD_IDS.situacion) as string | null
      const descripcion = getCustomFieldValue(cf, GHL_FIELD_IDS.descripcion) as string | null
      const fechaLlamada = getCustomFieldValue(cf, GHL_FIELD_IDS.fechaLlamada) as string | null
      const seguimientoMs = getCustomFieldValue(cf, GHL_FIELD_IDS.seguimiento) as number | null
      const respuestaCalendar = getCustomFieldValue(cf, GHL_FIELD_IDS.respuestaCalendar) as string | null

      const legacyFormaPago = getCustomFieldValue(cf, GHL_FIELD_IDS.formaPago) as string | null
      const legacyTipoPago = getCustomFieldValue(cf, GHL_FIELD_IDS.tipoPago) as string | null
      const legacyRevenue = getCustomFieldValue(cf, GHL_FIELD_IDS.revenue) as number | null
      const legacyCash = getCustomFieldValue(cf, GHL_FIELD_IDS.cash) as number | null
      const legacyDeposito = getCustomFieldValue(cf, GHL_FIELD_IDS.depositoBroker) as number | null
      const legacyMontoRestante = getCustomFieldValue(cf, GHL_FIELD_IDS.montoRestante) as number | null
      const legacyCodigoTrans = getCustomFieldValue(cf, GHL_FIELD_IDS.codigoTransaccion) as string | null
      const legacyCantidadCuotas = getCustomFieldValue(cf, GHL_FIELD_IDS.cantidadCuotas) as string | null

      const oppData = {
        contact_id: contactId,
        ghl_opportunity_id: opp.id,
        ghl_contact_id: opp.contactId,
        ghl_assigned_to: opp.assignedTo || null,
        lead_id: leadId,
        call_id: callId,
        closer_id: closerId,
        contact_name: opp.contact?.name || opp.name,
        contact_email: opp.contact?.email || null,
        contact_phone: opp.contact?.phone || null,
        pipeline_stage: GHL_STAGE_NAMES[opp.pipelineStageId] || null,
        ghl_pipeline_stage_id: opp.pipelineStageId,
        estado_cita: estadoCita,
        programa,
        situacion,
        descripcion_llamada: descripcion,
        fecha_llamada: parseSpanishDate(fechaLlamada),
        fecha_seguimiento: seguimientoMs ? new Date(seguimientoMs).toISOString() : null,
        respuesta_calendario: respuestaCalendar,
        source: opp.source,
        legacy_forma_pago: legacyFormaPago,
        legacy_tipo_pago: legacyTipoPago,
        legacy_revenue: legacyRevenue,
        legacy_cash: legacyCash,
        legacy_deposito_broker: legacyDeposito,
        legacy_monto_restante: legacyMontoRestante,
        legacy_codigo_transaccion: legacyCodigoTrans,
        legacy_cantidad_cuotas: legacyCantidadCuotas && !isNaN(parseInt(legacyCantidadCuotas))
          ? parseInt(legacyCantidadCuotas)
          : null,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: existingOpp } = await supabase
        .from('opportunities')
        .select('id')
        .eq('ghl_opportunity_id', opp.id)
        .maybeSingle()

      if (existingOpp) {
        const { error } = await supabase.from('opportunities').update(oppData).eq('id', existingOpp.id)
        if (error) {
          console.error(`Update error [${opp.id}]:`, error.message)
          if (errorSamples.length < 3) errorSamples.push(`Update ${opp.name}: ${error.message}`)
          errors++
        } else updated++
      } else {
        const { error } = await supabase.from('opportunities').insert(oppData)
        if (error) {
          console.error(`Insert error [${opp.id}]:`, error.message)
          if (errorSamples.length < 3) errorSamples.push(`Insert ${opp.name}: ${error.message}`)
          errors++
        } else created++
      }
    } catch (e) {
      console.error('Opportunity error:', e)
      if (errorSamples.length < 3) errorSamples.push(`Exception: ${e instanceof Error ? e.message : String(e)}`)
      errors++
    }
  }

  const stageHasMore = !!res.meta.nextPageUrl && opportunities.length > 0
  const hasNextStage = stageIndex + 1 < STAGES_TO_SYNC.length
  const newTotalProcessed = totalProcessedBefore + opportunities.length

  let nextMessage: string
  let orphansCleaned = 0

  if (stageHasMore && res.meta.startAfter && res.meta.startAfterId) {
    await supabase.from('sync_state').upsert({
      key: SYNC_KEY,
      cursor_value: `${stageIndex}|${res.meta.startAfter}`,
      cursor_id: res.meta.startAfterId,
      total_processed: newTotalProcessed,
      cycle_started_at: cycleStartedAt,
      updated_at: new Date().toISOString(),
    })
    nextMessage = `Stage "${currentStageName}" tiene más páginas`
  } else if (hasNextStage) {
    await supabase.from('sync_state').upsert({
      key: SYNC_KEY,
      cursor_value: `${stageIndex + 1}`,
      cursor_id: null,
      total_processed: newTotalProcessed,
      cycle_started_at: cycleStartedAt,
      updated_at: new Date().toISOString(),
    })
    nextMessage = `"${currentStageName}" completada. Siguiente: "${GHL_STAGE_NAMES[STAGES_TO_SYNC[stageIndex + 1]]}"`
  } else {
    // Ciclo completo: limpiar oportunidades huérfanas
    // (las que no se actualizaron durante este ciclo = no están más en GHL en las etapas trackeadas)
    if (cycleStartedAt) {
      const { data: deletedOpps, error: deleteError } = await supabase
        .from('opportunities')
        .delete()
        .not('ghl_opportunity_id', 'is', null)
        .lt('synced_at', cycleStartedAt)
        .select('id')

      if (!deleteError && deletedOpps) {
        orphansCleaned = deletedOpps.length
        if (orphansCleaned > 0) {
          console.log(`[GHL Sync] Cleaned ${orphansCleaned} orphan opportunities (synced_at < ${cycleStartedAt})`)
        }
      } else if (deleteError) {
        console.error('[GHL Sync] Error cleaning orphans:', deleteError.message)
      }
    }

    await supabase.from('sync_state').upsert({
      key: SYNC_KEY,
      cursor_value: null,
      cursor_id: null,
      total_processed: 0,
      cycle_started_at: null,
      last_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    nextMessage = orphansCleaned > 0
      ? `Ciclo completo. ${orphansCleaned} huérfanas limpiadas.`
      : 'Ciclo completo. Todas las etapas sincronizadas.'
  }

  return {
    message: nextMessage,
    stage: currentStageName,
    stage_index: `${stageIndex + 1}/${STAGES_TO_SYNC.length}`,
    batch_size: opportunities.length,
    total_in_stage: res.meta.total,
    total_processed_cycle: newTotalProcessed,
    orphans_cleaned: orphansCleaned > 0 ? orphansCleaned : undefined,
    created,
    updated,
    errors,
    error_samples: errorSamples.length > 0 ? errorSamples : undefined,
    stage_has_more: stageHasMore,
    has_next_stage: hasNextStage,
    cursor_used: startAfter || startAfterId ? { startAfter, startAfterId } : null,
    cursor_reset: cursorReset || undefined,
  }
}
