/**
 * PATCH /api/opportunities/[id]
 * Guarda el formulario post-agenda:
 * - Actualiza la oportunidad
 * - Crea Sale + primer Payment si corresponde
 * - Sincroniza con GHL (stage + custom fields)
 * - Dispara webhook saliente
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, hasPermission, isAdmin } from '@/lib/permissions'
import { sendOutboundWebhook, buildWebhookPayload } from '@/lib/outbound-webhook'
import {
  updateOpportunity,
  GHL_FIELD_IDS,
  GHL_STAGE_IDS,
  GHL_STAGE_IDS_BY_NAME,
} from '@/lib/ghl'
import type { Opportunity, Sale, Situacion, EstadoCita, FormaPago } from '@/types'

/**
 * Mapea Situación + Estado Cita a Pipeline Stage.
 */
function getTargetStage(situacion: string | null, estadoCita: string | null): string | null {
  if (estadoCita === 'Cancelada') return 'Cancelado'
  if (estadoCita === 'No Asistido') return 'No Asistio'
  if (!situacion) return null
  switch (situacion) {
    case 'Seguimiento':
      return 'Seguimiento'
    case 'Adentro en Llamada':
    case 'Adentro en Seguimiento':
    case 'ReCompra':
      return 'Compro'
    case 'Perdido':
      return 'No Compro'
    default:
      return null
  }
}

interface SaleInput {
  forma_pago: FormaPago
  payment_type_id: string | null
  revenue: number
  cash: number
  deposito_broker?: number
  cantidad_cuotas: number
  fecha_proximo_pago: string | null
  codigo_transaccion: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!hasPermission(ctx, 'can_fill_post_agenda') && !isAdmin(ctx)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const supabase = await createServiceRoleClient()

  // Verify ownership
  const { data: opp } = await supabase
    .from('opportunities')
    .select('*, contact:contacts(*), closer:closers(*)')
    .eq('id', id)
    .single()

  if (!opp) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const canViewAll = isAdmin(ctx) || hasPermission(ctx, 'can_view_all_opportunities')
  if (!canViewAll && opp.closer_id !== ctx.appUser.closer_id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const {
    estado_cita,
    programa,
    situacion,
    descripcion_llamada,
    volumen_real,
    fecha_seguimiento,
    sale: saleInput,
  } = body as {
    estado_cita?: EstadoCita
    programa?: string
    situacion?: Situacion
    descripcion_llamada?: string
    volumen_real?: number | null
    fecha_seguimiento?: string | null
    sale?: SaleInput
  }

  // Calculate target stage
  const targetStage = getTargetStage(situacion || null, estado_cita || null)

  const updateData: Record<string, unknown> = {
    estado_cita,
    programa,
    situacion,
    descripcion_llamada,
    volumen_real,
    fecha_seguimiento,
    form_completed: true,
    updated_at: new Date().toISOString(),
  }

  if (targetStage) {
    updateData.pipeline_stage = targetStage
    updateData.ghl_pipeline_stage_id = GHL_STAGE_IDS_BY_NAME[targetStage] || null
  }

  const { error: updateError } = await supabase
    .from('opportunities')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    console.error('Error updating opportunity:', updateError)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  // Create Sale if applicable
  let createdSale: Sale | null = null
  let createdPaymentId: string | null = null

  if (saleInput && saleInput.forma_pago) {
    const saleData = {
      opportunity_id: id,
      payment_type_id: saleInput.payment_type_id || null,
      forma_pago: saleInput.forma_pago,
      revenue: Number(saleInput.revenue) || 0,
      cantidad_cuotas: Number(saleInput.cantidad_cuotas) || 0,
      deposito_broker: Number(saleInput.deposito_broker) || 0,
      codigo_transaccion: saleInput.codigo_transaccion || null,
      completada: saleInput.forma_pago === 'Pago Completo' || saleInput.forma_pago === 'Deposito',
    }

    // Buscar si ya existe una sale para esta oportunidad (editar en lugar de crear)
    const { data: existingSale } = await supabase
      .from('sales')
      .select('*, payments(*)')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSale) {
      // Update existente
      const { data: updatedSale, error: updError } = await supabase
        .from('sales')
        .update({ ...saleData, updated_at: new Date().toISOString() })
        .eq('id', existingSale.id)
        .select('*')
        .single()

      if (updError) {
        console.error('Error updating sale:', updError)
        return NextResponse.json({ error: 'Error al actualizar venta', details: updError.message }, { status: 500 })
      }
      createdSale = updatedSale as Sale
    } else {
      // Create nueva
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select('*')
        .single()

      if (saleError) {
        console.error('Error creating sale:', saleError)
        return NextResponse.json({ error: 'Error al crear venta', details: saleError.message }, { status: 500 })
      }
      createdSale = newSale as Sale
    }

    // Manejar primer Payment: si existe y es el mismo monto, no crear otro
    const shouldCreatePayment = ['Pago Completo', 'Pago Dividido', 'Fee'].includes(saleInput.forma_pago)
    const cashAmount = Number(saleInput.cash) || 0
    const existingFirstPayment = existingSale?.payments?.find((p: { nro_cuota: number }) => p.nro_cuota === 1)

    if (shouldCreatePayment && cashAmount > 0 && createdSale) {
      if (existingFirstPayment) {
        // Update el payment #1 existente
        await supabase
          .from('payments')
          .update({
            monto: cashAmount,
            fecha_proximo_pago: saleInput.fecha_proximo_pago || null,
            pagado: true,
          })
          .eq('id', existingFirstPayment.id)
        createdPaymentId = existingFirstPayment.id
      } else {
        const { data: newPayment } = await supabase
          .from('payments')
          .insert({
            sale_id: createdSale.id,
            nro_cuota: 1,
            monto: cashAmount,
            fecha_pago: new Date().toISOString().slice(0, 10),
            fecha_proximo_pago: saleInput.fecha_proximo_pago || null,
            pagado: true,
          })
          .select('id')
          .single()
        createdPaymentId = newPayment?.id || null
      }
    }
  }

  // Sync with GHL
  if (opp.ghl_opportunity_id) {
    try {
      const customFields: Array<{ id: string; field_value: unknown }> = []
      if (estado_cita) customFields.push({ id: GHL_FIELD_IDS.estadoCita, field_value: estado_cita })
      if (programa) customFields.push({ id: GHL_FIELD_IDS.programa, field_value: programa })
      if (situacion) customFields.push({ id: GHL_FIELD_IDS.situacion, field_value: situacion })
      if (descripcion_llamada) customFields.push({ id: GHL_FIELD_IDS.descripcion, field_value: descripcion_llamada })

      const stageId = targetStage ? GHL_STAGE_IDS_BY_NAME[targetStage] : undefined

      await updateOpportunity(opp.ghl_opportunity_id, {
        pipelineStageId: stageId,
        customFields: customFields.length > 0 ? customFields : undefined,
      })
    } catch (ghlErr) {
      console.error('GHL sync error (non-fatal):', ghlErr)
    }
  }

  // Outbound webhook
  try {
    const payload = buildWebhookPayload(createdSale ? 'sale.created' : 'opportunity.updated', {
      opportunity: {
        id: opp.id,
        ghl_opportunity_id: opp.ghl_opportunity_id,
        pipeline_stage: targetStage || opp.pipeline_stage,
        estado_cita: estado_cita || opp.estado_cita,
        programa: programa || opp.programa,
        situacion: situacion || opp.situacion,
        descripcion_llamada: descripcion_llamada || opp.descripcion_llamada,
        volumen_real: volumen_real ?? opp.volumen_real,
        fecha_llamada: opp.fecha_llamada,
      },
      contact: {
        name: opp.contact_name,
        email: opp.contact_email,
        phone: opp.contact_phone,
        ig_username: opp.contact?.ig_username || null,
      },
      closer: opp.closer ? { name: opp.closer.name, email: opp.closer.email } : null,
      sale: createdSale ? {
        id: createdSale.id,
        forma_pago: createdSale.forma_pago,
        tipo_pago: null,
        revenue: Number(createdSale.revenue),
        monto_restante: Number(createdSale.revenue) - (saleInput?.cash || 0),
        cantidad_cuotas: createdSale.cantidad_cuotas,
        deposito_broker: Number(createdSale.deposito_broker),
        codigo_transaccion: createdSale.codigo_transaccion,
        completada: createdSale.completada,
      } : undefined,
    })
    await sendOutboundWebhook(payload)
  } catch (webhookErr) {
    console.error('Webhook error (non-fatal):', webhookErr)
  }

  return NextResponse.json({
    message: 'Oportunidad actualizada',
    sale_id: createdSale?.id || null,
    payment_id: createdPaymentId,
  })
}
