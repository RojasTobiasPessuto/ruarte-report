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
  fecha_pago: string
  fecha_proximo_pago: string | null
  justificante_urls?: string[] | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userIsAdmin = isAdmin(ctx)
  if (!hasPermission(ctx, 'can_fill_post_agenda') && !userIsAdmin) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const supabase = await createServiceRoleClient()

  // Get opportunity with relations
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select(`
      *,
      contact:contacts(*),
      closer:closers(*),
      lead:leads(*),
      call:calls(*)
    `)
    .eq('id', id)
    .single()

  if (oppError || !opportunity) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }

  const opp = opportunity as Opportunity

  // Check access: si no tiene can_view_all_opportunities, debe ser suyo
  const viewAll = userIsAdmin || hasPermission(ctx, 'can_view_all_opportunities')
  if (!viewAll) {
    if (opp.closer_id !== ctx.appUser.closer_id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
  }

  // Get sales of this opportunity
  const { data: salesData } = await supabase
    .from('sales')
    .select(`
      *,
      payment_type:payment_types(*),
      payments(*)
    `)
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false })

  // Calculate monto_restante for each sale
  const sales = ((salesData || []) as Sale[]).map((sale) => {
    const paid = (sale.payments || [])
      .filter((p) => p.pagado)
      .reduce((sum, p) => sum + Number(p.monto), 0)
    return { ...sale, monto_restante: Number(sale.revenue) - paid }
  })

  // Get payment types
  const { data: paymentTypes } = await supabase
    .from('payment_types')
    .select('*')
    .eq('active', true)
    .order('name')

  // Get closers
  const { data: closers } = await supabase
    .from('closers')
    .select('*')
    .eq('active', true)
    .order('name')

  return NextResponse.json({
    opportunity: opp,
    sales,
    paymentTypes: paymentTypes || [],
    closers: closers || [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userIsAdmin = isAdmin(ctx)

  if (!hasPermission(ctx, 'can_fill_post_agenda') && !userIsAdmin) {
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

  // Lógica de permisos de edición:
  // 1. Admin: edita cualquier cosa siempre.
  // 2. Manager (can_view_all_opportunities): edita cualquier oportunidad pero solo en etapas permitidas.
  // 3. Closer: solo edita sus propias oportunidades en etapas permitidas.
  const canEditAny = userIsAdmin || hasPermission(ctx, 'can_view_all_opportunities')
  const EDITABLE_STAGES_FOR_NON_ADMIN = ['Post Llamada', 'Seguimiento']

  if (!userIsAdmin) {
    // Validar etapa
    if (!EDITABLE_STAGES_FOR_NON_ADMIN.includes(opp.pipeline_stage)) {
      return NextResponse.json({
        error: 'Solo se puede editar el Post-Agenda cuando la oportunidad está en etapa "Post Llamada" o "Seguimiento". Contactá al administrador.',
      }, { status: 403 })
    }

    // Validar propiedad (si no es manager que puede verlo todo)
    if (!canEditAny) {
      if (!ctx.appUser.closer_id || opp.closer_id !== ctx.appUser.closer_id) {
        return NextResponse.json({
          error: 'Solo podés editar el Post-Agenda de las oportunidades asignadas a tu closer.',
        }, { status: 403 })
      }
    }
  }

  const body = await request.json()
  const {
    estado_cita,
    programa,
    situacion,
    descripcion_llamada,
    volumen_real,
    fecha_seguimiento,
    closer_id,
    sale: saleInput,
  } = body as {
    estado_cita?: EstadoCita
    programa?: string
    situacion?: Situacion
    descripcion_llamada?: string
    volumen_real?: number | null
    fecha_seguimiento?: string | null
    closer_id?: string
    sale?: SaleInput
  }

  // Calculate target stage
  const targetStage = getTargetStage(situacion || null, estado_cita || null)

  // Solo actualizar campos que vengan con valor (evita sobrescribir con null)
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // Lógica estricta de validación para form_completed
  const isPostAgendaUpdate = 
    estado_cita !== undefined || 
    programa !== undefined || 
    situacion !== undefined || 
    fecha_seguimiento !== undefined || 
    saleInput !== undefined

  if (isPostAgendaUpdate) {
    const evalEstado = estado_cita !== undefined ? estado_cita : opp.estado_cita
    const evalPrograma = programa !== undefined ? programa : opp.programa
    const evalSituacion = situacion !== undefined ? situacion : opp.situacion
    const evalFechaSeg = fecha_seguimiento !== undefined ? fecha_seguimiento : opp.fecha_seguimiento

    let isCompleted = false

    if (evalEstado === 'No Asistido') {
      isCompleted = true // Exception 1: No asistió, no se pide nada más.
    } else if (evalEstado && evalPrograma && evalSituacion) {
      isCompleted = true

      // Exception 2: Seguimiento requiere fecha
      if (evalSituacion === 'Seguimiento') {
        if (!evalFechaSeg) isCompleted = false
      }

      // Exception 3: Venta
      const insideSales = ['Adentro en Llamada', 'Adentro en Seguimiento', 'ReCompra'].includes(evalSituacion as string)
      
      if (insideSales) {
        if (!saleInput) {
          isCompleted = false
        } else {
          const isLiteOrPamm = evalPrograma === 'LITE' || evalPrograma === 'PAMM - Manejo de Portafolio'
          
          if (isLiteOrPamm) {
            // Broker only: Depósito en Broker, Justificante, Fecha de pago (Tipo de pago es opcional pero usualmente nulo o específico)
            if (
              saleInput.deposito_broker === undefined || saleInput.deposito_broker === null || saleInput.deposito_broker <= 0 ||
              !saleInput.fecha_pago ||
              !saleInput.justificante_urls || saleInput.justificante_urls.length === 0
            ) {
              isCompleted = false
            }
          } else {
            // Venta normal: Forma, Tipo, Fecha, Justificante, Revenue, Cash
            if (
              !saleInput.forma_pago ||
              !saleInput.payment_type_id ||
              !saleInput.fecha_pago ||
              !saleInput.justificante_urls || saleInput.justificante_urls.length === 0 ||
              saleInput.revenue === undefined || saleInput.revenue === null || saleInput.revenue <= 0 ||
              saleInput.cash === undefined || saleInput.cash === null
            ) {
              isCompleted = false
            }
            // Regla Pago Dividido
            if (saleInput.forma_pago === 'Pago Dividido') {
              if (!saleInput.cantidad_cuotas || saleInput.cantidad_cuotas <= 0) {
                isCompleted = false
              }
            }
          }
        }
      }
    }

    updateData.form_completed = isCompleted
  }

  if (estado_cita) updateData.estado_cita = estado_cita
  if (programa) updateData.programa = programa
  if (situacion) updateData.situacion = situacion
  if (descripcion_llamada !== undefined && descripcion_llamada !== null && descripcion_llamada !== '') {
    updateData.descripcion_llamada = descripcion_llamada
  }
  if (volumen_real !== undefined && volumen_real !== null) {
    updateData.volumen_real = volumen_real
  }
  if (fecha_seguimiento) updateData.fecha_seguimiento = fecha_seguimiento

  if (targetStage) {
    updateData.pipeline_stage = targetStage
    updateData.ghl_pipeline_stage_id = GHL_STAGE_IDS_BY_NAME[targetStage] || null
  }

  // Owner change logic
  let newGhlAssignedTo: string | null = null
  if (closer_id && closer_id !== opp.closer_id) {
    if (!userIsAdmin && !hasPermission(ctx, 'can_view_all_opportunities')) {
      return NextResponse.json({ error: 'No tenés permisos para cambiar el dueño de la oportunidad' }, { status: 403 })
    }
    updateData.closer_id = closer_id
    
    // Buscar el GHL User ID del nuevo closer
    const { data: newCloser } = await supabase
      .from('closers')
      .select('ghl_user_id')
      .eq('id', closer_id)
      .single()
    
    if (newCloser?.ghl_user_id) {
      newGhlAssignedTo = newCloser.ghl_user_id
      updateData.ghl_assigned_to = newCloser.ghl_user_id
    }
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
      codigo_transaccion: null,
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
            fecha_pago: saleInput.fecha_pago,
            fecha_proximo_pago: saleInput.fecha_proximo_pago || null,
            justificante_urls: saleInput.justificante_urls ?? existingFirstPayment.justificante_urls ?? null,
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
            fecha_pago: saleInput.fecha_pago,
            fecha_proximo_pago: saleInput.fecha_proximo_pago || null,
            justificante_urls: saleInput.justificante_urls || null,
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
      // Sale fields a GHL
      if (saleInput?.forma_pago) customFields.push({ id: GHL_FIELD_IDS.formaPago, field_value: saleInput.forma_pago })
      if (saleInput?.revenue !== undefined) customFields.push({ id: GHL_FIELD_IDS.revenue, field_value: saleInput.revenue })
      if (saleInput?.cash !== undefined) customFields.push({ id: GHL_FIELD_IDS.cash, field_value: saleInput.cash })
      if (saleInput?.fecha_pago) customFields.push({ id: GHL_FIELD_IDS.fechaPago, field_value: saleInput.fecha_pago })
      if (saleInput?.deposito_broker !== undefined) customFields.push({ id: GHL_FIELD_IDS.depositoBroker, field_value: saleInput.deposito_broker })
      if (saleInput?.cantidad_cuotas !== undefined) customFields.push({ id: GHL_FIELD_IDS.cantidadCuotas, field_value: String(saleInput.cantidad_cuotas) })
      // Justificante: NO se sincroniza con GHL (solo en la app)
      // Los archivos quedan en Supabase Storage y se muestran en la app

      const stageId = targetStage ? GHL_STAGE_IDS_BY_NAME[targetStage] : undefined

      await updateOpportunity(opp.ghl_opportunity_id, {
        pipelineStageId: stageId,
        assignedTo: newGhlAssignedTo || undefined,
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
      payment: createdPaymentId ? {
        nro_cuota: 1,
        monto: saleInput?.cash || 0,
        fecha_pago: saleInput?.fecha_pago || null,
        fecha_proximo_pago: saleInput?.fecha_proximo_pago || null,
        pagado: true,
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
