/**
 * Outbound webhook: envía eventos del sistema a una URL externa configurable.
 * Reemplaza el flujo GHL → Make → Google Sheet.
 * Si OUTBOUND_WEBHOOK_URL está vacía, no dispara nada (no error).
 */

import type { OutboundWebhookPayload } from '@/types'

const WEBHOOK_URL = process.env.OUTBOUND_WEBHOOK_URL
const WEBHOOK_SECRET = process.env.OUTBOUND_WEBHOOK_SECRET

export async function sendOutboundWebhook(
  payload: OutboundWebhookPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  if (!WEBHOOK_URL) {
    // No configurado, skip silently
    return { success: true, status: 0 }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Ruarte-Report/1.0',
    }

    if (WEBHOOK_SECRET) {
      headers['X-Webhook-Secret'] = WEBHOOK_SECRET
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(
        `Outbound webhook failed: ${response.status}`,
        errorText.substring(0, 300)
      )
      return { success: false, status: response.status, error: errorText }
    }

    return { success: true, status: response.status }
  } catch (error) {
    console.error('Outbound webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Helper para construir el payload a partir de Opportunity + Sale + Payment.
 */
export function buildWebhookPayload(
  event: OutboundWebhookPayload['event'],
  data: {
    opportunity: {
      id: string
      ghl_opportunity_id: string | null
      pipeline_stage: string | null
      estado_cita: string | null
      programa: string | null
      situacion: string | null
      descripcion_llamada: string | null
      volumen_real: number | null
      fecha_llamada: string | null
    }
    contact: {
      name: string | null
      email: string | null
      phone: string | null
      ig_username: string | null
    }
    closer?: { name: string | null; email: string | null } | null
    sale?: {
      id: string
      forma_pago: string | null
      tipo_pago: string | null
      revenue: number
      monto_restante: number
      cantidad_cuotas: number
      deposito_broker: number
      codigo_transaccion: string | null
      completada: boolean
    }
    payment?: {
      nro_cuota: number
      monto: number
      fecha_pago: string | null
      fecha_proximo_pago: string | null
      pagado: boolean
    }
  }
): OutboundWebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    opportunity: data.opportunity,
    contact: data.contact,
    closer: data.closer ?? null,
    sale: data.sale,
    payment: data.payment,
  }
}
