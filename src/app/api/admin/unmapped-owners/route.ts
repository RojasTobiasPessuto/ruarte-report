/**
 * GET /api/admin/unmapped-owners
 * Devuelve los ghl_user_id únicos de las oportunidades que NO tienen closer_id.
 * Útil para detectar qué owners de GHL faltan mapear a un Closer.
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'

export async function GET() {
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const supabase = await createServiceRoleClient()

  // Traer todas las opportunities con sus closer_id y ghl_assigned_to
  const { data: opps } = await supabase
    .from('opportunities')
    .select('ghl_opportunity_id, closer_id, contact_name, pipeline_stage, ghl_assigned_to')

  // También necesitamos el assignedTo de cada opp — pero no lo guardamos en DB.
  // Estrategia: traer closers y ver cuántas opps están sin closer
  const withoutCloser = (opps || []).filter((o) => !o.closer_id)
  const withCloser = (opps || []).filter((o) => o.closer_id)

  // Agrupar opps sin closer por ghl_assigned_to
  const byGhlUser: Record<string, { count: number; examples: string[] }> = {}
  for (const opp of withoutCloser) {
    const key = (opp as Record<string, unknown>).ghl_assigned_to as string || '(sin owner)'
    if (!byGhlUser[key]) byGhlUser[key] = { count: 0, examples: [] }
    byGhlUser[key].count++
    if (byGhlUser[key].examples.length < 3 && opp.contact_name) {
      byGhlUser[key].examples.push(opp.contact_name)
    }
  }

  const { data: closers } = await supabase
    .from('closers')
    .select('id, name, ghl_user_id, active')

  return NextResponse.json({
    total_opportunities: opps?.length || 0,
    with_closer: withCloser.length,
    without_closer: withoutCloser.length,
    closers: closers || [],
    unmapped_ghl_users: byGhlUser,
  })
}
