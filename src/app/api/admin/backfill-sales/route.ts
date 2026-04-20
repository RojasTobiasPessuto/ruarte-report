/**
 * POST /api/admin/backfill-sales (admin only)
 * Crea Sales + Payments a partir de los datos legacy de oportunidades en estado "Compro".
 * Solo procesa oportunidades que aún no tienen Sales creadas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'

interface OpportunityLegacy {
  id: string
  pipeline_stage: string | null
  legacy_forma_pago: string | null
  legacy_tipo_pago: string | null
  legacy_revenue: number | null
  legacy_cash: number | null
  legacy_deposito_broker: number | null
  legacy_monto_restante: number | null
  legacy_codigo_transaccion: string | null
  legacy_cantidad_cuotas: number | null
}

const FORMA_PAGO_VALIDS = ['Fee', 'Pago Completo', 'Pago Dividido', 'Pago Programado', 'Deposito']

function normalizeFormaPago(input: string | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  // Match exacto (case sensitive porque el constraint en DB es exacto)
  if (FORMA_PAGO_VALIDS.includes(trimmed)) return trimmed
  // Match case-insensitive
  const lower = trimmed.toLowerCase()
  for (const valid of FORMA_PAGO_VALIDS) {
    if (valid.toLowerCase() === lower) return valid
  }
  return null
}

export async function POST(request: NextRequest) {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  const supabase = await createServiceRoleClient()

  // Buscar payment types para mapear tipo_pago
  const { data: paymentTypes } = await supabase.from('payment_types').select('*')
  const paymentTypesByName = new Map<string, string>()
  for (const pt of paymentTypes || []) {
    paymentTypesByName.set(pt.name.toLowerCase(), pt.id)
  }

  // Buscar oportunidades en Compro con datos legacy y SIN sales creadas
  const { data: opps } = await supabase
    .from('opportunities')
    .select(`
      id, pipeline_stage,
      legacy_forma_pago, legacy_tipo_pago, legacy_revenue, legacy_cash,
      legacy_deposito_broker, legacy_monto_restante, legacy_codigo_transaccion,
      legacy_cantidad_cuotas
    `)
    .eq('pipeline_stage', 'Compro')

  const oppsArray = (opps || []) as OpportunityLegacy[]

  let salesCreated = 0
  let paymentsCreated = 0
  let skipped = 0
  const errorSamples: string[] = []

  for (const opp of oppsArray) {
    try {
      // Skip si ya tiene sales
      const { count: existingCount } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('opportunity_id', opp.id)

      if ((existingCount || 0) > 0) {
        skipped++
        continue
      }

      // Validar que tenga al menos revenue o deposito_broker
      const revenue = Number(opp.legacy_revenue || 0)
      const cash = Number(opp.legacy_cash || 0)
      const depositoBroker = Number(opp.legacy_deposito_broker || 0)
      const montoRestante = Number(opp.legacy_monto_restante || 0)

      if (revenue === 0 && depositoBroker === 0) {
        skipped++
        continue
      }

      const formaPago = normalizeFormaPago(opp.legacy_forma_pago)
      const paymentTypeId = opp.legacy_tipo_pago
        ? paymentTypesByName.get(opp.legacy_tipo_pago.toLowerCase()) || null
        : null

      const isCompleted = formaPago === 'Pago Completo'
        || formaPago === 'Deposito'
        || (revenue > 0 && montoRestante <= 0)

      // Crear Sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          opportunity_id: opp.id,
          payment_type_id: paymentTypeId,
          forma_pago: formaPago,
          revenue,
          cantidad_cuotas: opp.legacy_cantidad_cuotas || 0,
          deposito_broker: depositoBroker,
          codigo_transaccion: opp.legacy_codigo_transaccion,
          completada: isCompleted,
        })
        .select('id')
        .single()

      if (saleError || !sale) {
        if (errorSamples.length < 5) errorSamples.push(`Sale ${opp.id}: ${saleError?.message || 'unknown'}`)
        continue
      }

      salesCreated++

      // Crear Payment(s) según forma de pago
      if (formaPago === 'Pago Completo' && revenue > 0) {
        // 1 payment con todo el revenue
        await supabase.from('payments').insert({
          sale_id: sale.id,
          nro_cuota: 1,
          monto: revenue,
          fecha_pago: new Date().toISOString().slice(0, 10),
          pagado: true,
        })
        paymentsCreated++
      } else if ((formaPago === 'Pago Dividido' || formaPago === 'Fee') && cash > 0) {
        // 1 payment con el cash actual (representa lo cobrado hasta ahora)
        await supabase.from('payments').insert({
          sale_id: sale.id,
          nro_cuota: 1,
          monto: cash,
          fecha_pago: new Date().toISOString().slice(0, 10),
          pagado: true,
        })
        paymentsCreated++
      }
      // Pago Programado y Deposito no generan payments inmediatos
    } catch (e) {
      if (errorSamples.length < 5) {
        errorSamples.push(`Opp ${opp.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return NextResponse.json({
    message: 'Backfill completado',
    total_opportunities_in_compro: oppsArray.length,
    sales_created: salesCreated,
    payments_created: paymentsCreated,
    skipped,
    error_samples: errorSamples.length > 0 ? errorSamples : undefined,
  })
}
