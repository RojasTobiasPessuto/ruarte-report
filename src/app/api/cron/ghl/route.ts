/**
 * Cron job que sincroniza oportunidades del pipeline "Agendas" de GHL.
 * Corre cada 15 min vía cron-job.org.
 * - Lee oportunidades de GHL
 * - Busca/crea Contact (unifica identidad)
 * - Vincula con Lead (ManyChat) y Call (Fathom) si existen
 * - Crea/actualiza Opportunity en DB
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  getAllOpportunities,
  getCustomFieldValue,
  GHL_FIELD_IDS,
  GHL_STAGE_NAMES,
  type GHLOpportunity,
} from '@/lib/ghl'

interface ContactRow {
  id: string
  ghl_contact_id: string | null
  email: string | null
  phone: string | null
  ig_username: string | null
  manychat_subscriber_id: string | null
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
  // Buscar por ghl_contact_id primero
  let { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('ghl_contact_id', data.ghl_contact_id)
    .maybeSingle()

  if (existing) return (existing as ContactRow).id

  // Buscar por email
  if (data.email) {
    const result = await supabase
      .from('contacts')
      .select('*')
      .eq('email', data.email)
      .maybeSingle()
    existing = result.data
  }

  // Buscar por phone
  if (!existing && data.phone) {
    const result = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', data.phone)
      .maybeSingle()
    existing = result.data
  }

  // Buscar por ig_username
  if (!existing && data.ig_username) {
    const result = await supabase
      .from('contacts')
      .select('*')
      .eq('ig_username', data.ig_username)
      .maybeSingle()
    existing = result.data
  }

  if (existing) {
    // Actualizar ghl_contact_id si no lo tenía
    const row = existing as ContactRow
    if (!row.ghl_contact_id) {
      await supabase
        .from('contacts')
        .update({ ghl_contact_id: data.ghl_contact_id, updated_at: new Date().toISOString() })
        .eq('id', row.id)
    }
    return row.id
  }

  // Crear nuevo
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
  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('contact_id', contactId)
    .maybeSingle()
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
    // Auth check via CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceRoleClient()

    // Get all closers with ghl_user_id
    const { data: closers } = await supabase.from('closers').select('id, ghl_user_id')
    const closersByGhlUserId = new Map<string, string>()
    for (const c of closers || []) {
      if (c.ghl_user_id) closersByGhlUserId.set(c.ghl_user_id, c.id)
    }

    // Fetch all opportunities from GHL
    console.log('Fetching opportunities from GHL...')
    const opportunities = await getAllOpportunities()
    console.log(`  Fetched ${opportunities.length} opportunities`)

    let created = 0
    let updated = 0
    let errors = 0

    for (const opp of opportunities) {
      try {
        // 1. Find or create Contact
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

        // 2. Match closer by ghl_user_id
        const closerId = opp.assignedTo ? closersByGhlUserId.get(opp.assignedTo) || null : null

        // 3. Find Lead of same contact
        const leadId = await findLeadByContact(supabase, contactId)

        // 4. Find Call of same contact + closer
        const callId = await findCallByContact(supabase, contactId, closerId)

        // 5. Extract custom fields
        const cf = opp.customFields || []
        const estadoCita = getCustomFieldValue(cf, GHL_FIELD_IDS.estadoCita) as string | null
        const programa = getCustomFieldValue(cf, GHL_FIELD_IDS.programa) as string | null
        const situacion = getCustomFieldValue(cf, GHL_FIELD_IDS.situacion) as string | null
        const descripcion = getCustomFieldValue(cf, GHL_FIELD_IDS.descripcion) as string | null
        const fechaLlamada = getCustomFieldValue(cf, GHL_FIELD_IDS.fechaLlamada) as string | null
        const seguimientoMs = getCustomFieldValue(cf, GHL_FIELD_IDS.seguimiento) as number | null
        const respuestaCalendar = getCustomFieldValue(cf, GHL_FIELD_IDS.respuestaCalendar) as string | null

        // Legacy custom fields
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

        // Upsert by ghl_opportunity_id
        const { data: existing } = await supabase
          .from('opportunities')
          .select('id')
          .eq('ghl_opportunity_id', opp.id)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase
            .from('opportunities')
            .update(oppData)
            .eq('id', existing.id)
          if (error) {
            console.error('Update error:', error)
            errors++
          } else {
            updated++
          }
        } else {
          const { error } = await supabase
            .from('opportunities')
            .insert(oppData)
          if (error) {
            console.error('Insert error:', error)
            errors++
          } else {
            created++
          }
        }
      } catch (e) {
        console.error('Error processing opportunity:', e)
        errors++
      }
    }

    return NextResponse.json({
      message: 'GHL sync completed',
      total: opportunities.length,
      created,
      updated,
      errors,
    })
  } catch (error) {
    console.error('GHL sync error:', error)
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 })
  }
}
