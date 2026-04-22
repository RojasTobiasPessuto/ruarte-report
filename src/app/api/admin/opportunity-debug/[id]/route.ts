/**
 * GET /api/admin/opportunity-debug/[id] (admin only)
 * Devuelve los datos raw de una oportunidad para debug.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const supabase = await createServiceRoleClient()

  const { data: opp } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  const { data: sales } = await supabase
    .from('sales')
    .select('*, payments(*)')
    .eq('opportunity_id', id)

  return NextResponse.json({ opportunity: opp, sales })
}
