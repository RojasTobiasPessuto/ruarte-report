/**
 * Sync individual de una oportunidad de GHL.
 * Usado por webhooks para actualizar en tiempo real.
 * Reutiliza la misma lógica de mapeo que ghl-sync.ts (batch).
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  getOpportunity,
  getCustomFieldValue,
  parseSpanishDate,
  GHL_FIELD_IDS,
  GHL_PIPELINE_ID,
  GHL_STAGE_NAMES,
} from '@/lib/ghl'

export interface SingleSyncResult {
  action: 'created' | 'updated' | 'deleted' | 'skipped'
  name: string
  detail?: string
}

/**
 * Busca o crea un contacto en Supabase a partir de datos de GHL.
 * Misma lógica que findOrCreateContact en ghl-sync.ts.
 */
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
  // Buscar por ghl_contact_id
  let { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('ghl_contact_id', data.ghl_contact_id)
    .maybeSingle()

  if (existing) return existing.id

  // Buscar por email
  if (data.email) {
    const result = await supabase.from('contacts').select('*').eq('email', data.email).maybeSingle()
    existing = result.data
  }

  // Buscar por phone
  if (!existing && data.phone) {
    const result = await supabase.from('contacts').select('*').eq('phone', data.phone).maybeSingle()
    existing = result.data
  }

  // Buscar por ig_username
  if (!existing && data.ig_username) {
    const result = await supabase.from('contacts').select('*').eq('ig_username', data.ig_username).maybeSingle()
    existing = result.data
  }

  if (existing) {
    if (!existing.ghl_contact_id) {
      await supabase
        .from('contacts')
        .update({ ghl_contact_id: data.ghl_contact_id, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return existing.id
  }

  // Crear nuevo contacto
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
    console.error('[Webhook] Error creating contact:', error)
    return null
  }

  return created?.id || null
}

/**
 * Sincroniza UNA oportunidad de GHL a Supabase.
 * - Nunca elimina por cambio de etapa
 * - Solo marca deleted_at en soft delete
 * - Mapea exactamente los mismos campos que el batch sync
 */
export async function syncSingleOpportunity(ghlOpportunityId: string): Promise<SingleSyncResult> {
  const supabase = await createServiceRoleClient()

  // 1. Obtener datos completos de GHL
  const opp = await getOpportunity(ghlOpportunityId)

  if (!opp) {
    // La oportunidad no existe en GHL → soft delete
    const { data: existing } = await supabase
      .from('opportunities')
      .select('id, contact_name')
      .eq('ghl_opportunity_id', ghlOpportunityId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('opportunities')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      return { action: 'deleted', name: existing.contact_name || ghlOpportunityId }
    }

    return { action: 'skipped', name: ghlOpportunityId, detail: 'Not found in GHL or DB' }
  }

  // 2. Verificar que es del pipeline correcto
  if (opp.pipelineId !== GHL_PIPELINE_ID) {
    return { action: 'skipped', name: opp.name, detail: `Wrong pipeline: ${opp.pipelineId}` }
  }

  // 3. Mapear datos (misma lógica que ghl-sync.ts líneas 212-284)
  const igUsername = opp.contact?.tags?.find((t) => t.startsWith('ig:'))?.replace('ig:', '') || null

  const contactId = await findOrCreateContact(supabase, {
    ghl_contact_id: opp.contactId,
    name: opp.contact?.name || opp.name,
    email: opp.contact?.email || null,
    phone: opp.contact?.phone || null,
    ig_username: igUsername,
  })

  if (!contactId) {
    return { action: 'skipped', name: opp.name, detail: 'Could not find or create contact' }
  }

  // Buscar closer por ghl_user_id
  const { data: closers } = await supabase.from('closers').select('id, ghl_user_id')
  const closersByGhlUserId = new Map<string, string>()
  for (const c of closers || []) {
    if (c.ghl_user_id) closersByGhlUserId.set(c.ghl_user_id, c.id)
  }
  const closerId = opp.assignedTo ? closersByGhlUserId.get(opp.assignedTo) || null : null

  // Buscar lead y call asociados
  const { data: leadData } = await supabase.from('leads').select('id').eq('contact_id', contactId).maybeSingle()
  const leadId = leadData?.id || null

  let callQuery = supabase
    .from('calls')
    .select('id')
    .eq('contact_id', contactId)
    .order('call_date', { ascending: false })
    .limit(1)
  if (closerId) callQuery = callQuery.eq('closer_id', closerId)
  const { data: callData } = await callQuery
  const callId = callData && callData.length > 0 ? callData[0].id : null

  // Extraer custom fields
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

  // 4. Armar objeto para upsert
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
    pipeline_stage: GHL_STAGE_NAMES[opp.pipelineStageId] || opp.pipelineStageId,
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
    deleted_at: null, // Limpiar soft delete si se re-sincroniza
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 5. Upsert: buscar si ya existe
  const { data: existingOpp } = await supabase
    .from('opportunities')
    .select('id')
    .eq('ghl_opportunity_id', opp.id)
    .maybeSingle()

  if (existingOpp) {
    const { error } = await supabase.from('opportunities').update(oppData).eq('id', existingOpp.id)
    if (error) {
      console.error(`[Webhook] Update error [${opp.id}]:`, error.message)
      throw new Error(`Update failed: ${error.message}`)
    }
    return { action: 'updated', name: opp.contact?.name || opp.name }
  } else {
    const { error } = await supabase.from('opportunities').insert(oppData)
    if (error) {
      console.error(`[Webhook] Insert error [${opp.id}]:`, error.message)
      throw new Error(`Insert failed: ${error.message}`)
    }
    return { action: 'created', name: opp.contact?.name || opp.name }
  }
}

/**
 * Soft-delete de una oportunidad (cuando GHL envía OpportunityDelete).
 * No borra datos, solo marca deleted_at.
 */
export async function softDeleteOpportunity(ghlOpportunityId: string): Promise<SingleSyncResult> {
  const supabase = await createServiceRoleClient()

  const { data: existing } = await supabase
    .from('opportunities')
    .select('id, contact_name')
    .eq('ghl_opportunity_id', ghlOpportunityId)
    .maybeSingle()

  if (!existing) {
    return { action: 'skipped', name: ghlOpportunityId, detail: 'Not found in DB' }
  }

  await supabase
    .from('opportunities')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  return { action: 'deleted', name: existing.contact_name || ghlOpportunityId }
}
