/**
 * Cron job paginado que sincroniza el pipeline "Agendas" de GHL.
 * Procesa 100 oportunidades por ejecución usando cursor en sync_state.
 * - Si hay cursor guardado, continúa desde ahí
 * - Si no hay más páginas, reinicia y completa un ciclo nuevo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  searchOpportunities,
  getCustomFieldValue,
  GHL_FIELD_IDS,
  GHL_STAGE_NAMES,
  GHL_STAGE_IDS,
} from '@/lib/ghl'

const SYNC_KEY = 'ghl_opportunities'
const BATCH_SIZE = 100

// Solo sincronizar estas etapas (ignoramos Agendado Nuevo, Agendado Confirmado y ReAgendado)
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceRoleClient()

    // Read current cursor from sync_state
    const { data: state } = await supabase
      .from('sync_state')
      .select('*')
      .eq('key', SYNC_KEY)
      .maybeSingle()

    // Parse cursor: formato "stageIndex|startAfter|startAfterId"
    // stageIndex = índice en STAGES_TO_SYNC array
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

    console.log(`Fetching stage "${currentStageName}" (${stageIndex + 1}/${STAGES_TO_SYNC.length}), cursor: ${startAfter || 'START'}`)

    const res = await searchOpportunities({
      pipelineStageId: currentStageId,
      limit: BATCH_SIZE,
      startAfter,
      startAfterId,
    })

    const opportunities = res.opportunities
    console.log(`  Got ${opportunities.length} opportunities from "${currentStageName}"`)

    // Get closers map
    const { data: closers } = await supabase.from('closers').select('id, ghl_user_id')
    const closersByGhlUserId = new Map<string, string>()
    for (const c of closers || []) {
      if (c.ghl_user_id) closersByGhlUserId.set(c.ghl_user_id, c.id)
    }

    let created = 0
    let updated = 0
    let errors = 0

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
          fecha_llamada: fechaLlamada ? fechaLlamada : null,
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
          legacy_cantidad_cuotas: legacyCantidadCuotas ? parseInt(legacyCantidadCuotas) : null,
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
            console.error('Update error:', error.message)
            errors++
          } else updated++
        } else {
          const { error } = await supabase.from('opportunities').insert(oppData)
          if (error) {
            console.error('Insert error:', error.message)
            errors++
          } else created++
        }
      } catch (e) {
        console.error('Opportunity error:', e)
        errors++
      }
    }

    // Cursor logic: 3 casos
    // 1) La etapa tiene más páginas → guardar cursor en misma etapa
    // 2) La etapa terminó y hay más etapas → pasar a siguiente etapa, cursor null
    // 3) Todas las etapas terminadas → resetear todo
    const stageHasMore = !!res.meta.nextPageUrl && opportunities.length > 0
    const hasNextStage = stageIndex + 1 < STAGES_TO_SYNC.length
    const newTotalProcessed = totalProcessedBefore + opportunities.length

    let nextMessage: string
    if (stageHasMore && res.meta.startAfter && res.meta.startAfterId) {
      // Caso 1: misma etapa, próxima página
      await supabase.from('sync_state').upsert({
        key: SYNC_KEY,
        cursor_value: `${stageIndex}|${res.meta.startAfter}`,
        cursor_id: res.meta.startAfterId,
        total_processed: newTotalProcessed,
        updated_at: new Date().toISOString(),
      })
      nextMessage = `Stage "${currentStageName}" has more pages, continuing in next cycle`
    } else if (hasNextStage) {
      // Caso 2: pasar a siguiente etapa
      await supabase.from('sync_state').upsert({
        key: SYNC_KEY,
        cursor_value: `${stageIndex + 1}`,
        cursor_id: null,
        total_processed: newTotalProcessed,
        updated_at: new Date().toISOString(),
      })
      nextMessage = `Stage "${currentStageName}" completed, next: "${GHL_STAGE_NAMES[STAGES_TO_SYNC[stageIndex + 1]]}"`
    } else {
      // Caso 3: todas las etapas completadas
      await supabase.from('sync_state').upsert({
        key: SYNC_KEY,
        cursor_value: null,
        cursor_id: null,
        total_processed: 0,
        last_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      nextMessage = 'All stages synced. Cycle complete.'
    }

    return NextResponse.json({
      message: nextMessage,
      stage: currentStageName,
      stage_index: `${stageIndex + 1}/${STAGES_TO_SYNC.length}`,
      batch_size: opportunities.length,
      total_in_stage: res.meta.total,
      total_processed_cycle: newTotalProcessed,
      created,
      updated,
      errors,
      stage_has_more: stageHasMore,
      has_next_stage: hasNextStage,
    })
  } catch (error) {
    console.error('GHL sync error:', error)
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 })
  }
}
