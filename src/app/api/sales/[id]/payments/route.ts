/**
 * POST /api/sales/[id]/payments
 * Agrega una nueva cuota a una venta.
 * Recalcula monto_restante, marca Sale como completada si corresponde.
 * Sincroniza con GHL + dispara webhook.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, hasPermission, isAdmin } from '@/lib/permissions'
import { sendOutboundWebhook, buildWebhookPayload } from '@/lib/outbound-webhook'
import { updateOpportunity, GHL_FIELD_IDS } from '@/lib/ghl'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: saleId } = await params
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!hasPermission(ctx, 'can_create_payment') && !isAdmin(ctx)) {
    return NextResponse.json({ error: 'Sin permisos para crear pagos' }, { status: 403 })
  }

  const supabase = await createServiceRoleClient()

  // Fetch sale with opportunity
  const { data: sale } = await supabase
    .from('sales')
    .select(`
      *,
      opportunity:opportunities(*, contact:contacts(*), closer:closers(*)),
      payments(*)
    `)
    .eq('id', saleId)
    .single()

  if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })

  // Verify ownership
  const canViewAll = isAdmin(ctx) || hasPermission(ctx, 'can_view_all_opportunities')
  if (!canViewAll && sale.opportunity?.closer_id !== ctx.appUser.closer_id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { monto, fecha_pago, fecha_proximo_pago, nro_cuota, justificante_urls } = body as {
    monto: number
    fecha_pago: string
    fecha_proximo_pago?: string | null
    nro_cuota?: number
    justificante_urls?: string[] | null
  }

  if (!monto || monto <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }

  // Determine nro_cuota
  const existingPayments = (sale.payments || []) as Array<{ nro_cuota: number; monto: number; pagado: boolean }>
  const computedNroCuota = nro_cuota || (existingPayments.length > 0
    ? Math.max(...existingPayments.map((p) => p.nro_cuota)) + 1
    : 1)

  // Insert payment
  const { data: newPayment, error } = await supabase
    .from('payments')
    .insert({
      sale_id: saleId,
      nro_cuota: computedNroCuota,
      monto,
      fecha_pago,
      fecha_proximo_pago: fecha_proximo_pago || null,
      justificante_urls: justificante_urls || null,
      pagado: true,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Error al crear pago', details: error.message }, { status: 500 })
  }

  // Recalculate monto_restante and mark completed if needed
  const paidBefore = existingPayments.filter((p) => p.pagado).reduce((s, p) => s + Number(p.monto || 0), 0)
  const totalPagado = paidBefore + monto
  const montoRestante = Number(sale.revenue) - totalPagado

  if (montoRestante <= 0) {
    await supabase
      .from('sales')
      .update({ completada: true, updated_at: new Date().toISOString() })
      .eq('id', saleId)
  }

  // Sync with GHL
  if (sale.opportunity?.ghl_opportunity_id) {
    try {
      const customFields: Array<{ id: string; field_value: unknown }> = [
        { id: GHL_FIELD_IDS.cash, field_value: monto },
        { id: GHL_FIELD_IDS.nroCuota, field_value: computedNroCuota },
        { id: GHL_FIELD_IDS.fechaPago, field_value: fecha_pago },
        { id: GHL_FIELD_IDS.fechaProximoPago, field_value: fecha_proximo_pago || '' },
        { id: GHL_FIELD_IDS.montoRestante, field_value: Math.max(0, montoRestante) },
      ]
      // Pasar los justificantes al custom field FILE_UPLOAD de GHL (múltiples)
      if (justificante_urls && justificante_urls.length > 0) {
        customFields.push({
          id: GHL_FIELD_IDS.justificante,
          field_value: justificante_urls.map((url) => ({ url })),
        })
      }
      await updateOpportunity(sale.opportunity.ghl_opportunity_id, { customFields })
    } catch (err) {
      console.error('GHL sync error (non-fatal):', err)
    }
  }

  // Outbound webhook
  try {
    const payload = buildWebhookPayload('payment.created', {
      opportunity: {
        id: sale.opportunity.id,
        ghl_opportunity_id: sale.opportunity.ghl_opportunity_id,
        pipeline_stage: sale.opportunity.pipeline_stage,
        estado_cita: sale.opportunity.estado_cita,
        programa: sale.opportunity.programa,
        situacion: sale.opportunity.situacion,
        descripcion_llamada: sale.opportunity.descripcion_llamada,
        volumen_real: sale.opportunity.volumen_real,
        fecha_llamada: sale.opportunity.fecha_llamada,
      },
      contact: {
        name: sale.opportunity.contact_name,
        email: sale.opportunity.contact_email,
        phone: sale.opportunity.contact_phone,
        ig_username: sale.opportunity.contact?.ig_username || null,
      },
      closer: sale.opportunity.closer ? {
        name: sale.opportunity.closer.name,
        email: sale.opportunity.closer.email,
      } : null,
      sale: {
        id: sale.id,
        forma_pago: sale.forma_pago,
        tipo_pago: null,
        revenue: Number(sale.revenue),
        monto_restante: Math.max(0, montoRestante),
        cantidad_cuotas: sale.cantidad_cuotas,
        deposito_broker: Number(sale.deposito_broker),
        codigo_transaccion: sale.codigo_transaccion,
        completada: montoRestante <= 0,
      },
      payment: {
        nro_cuota: computedNroCuota,
        monto,
        fecha_pago,
        fecha_proximo_pago: fecha_proximo_pago || null,
        pagado: true,
      },
    })
    await sendOutboundWebhook(payload)

    // Si completó la venta, mandar también sale.completed
    if (montoRestante <= 0) {
      const completedPayload = { ...payload, event: 'sale.completed' as const }
      await sendOutboundWebhook(completedPayload)
    }
  } catch (err) {
    console.error('Webhook error (non-fatal):', err)
  }

  return NextResponse.json({ message: 'Pago creado', payment: newPayment })
}
