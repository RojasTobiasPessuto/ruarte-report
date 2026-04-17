/**
 * DELETE /api/payments/[id] — solo admin
 * PATCH /api/payments/[id] — solo admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, hasPermission, isAdmin } from '@/lib/permissions'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!hasPermission(ctx, 'can_edit_payment') && !isAdmin(ctx)) {
    return NextResponse.json({ error: 'Solo admin puede eliminar pagos' }, { status: 403 })
  }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Pago eliminado' })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!hasPermission(ctx, 'can_edit_payment') && !isAdmin(ctx)) {
    return NextResponse.json({ error: 'Solo admin puede editar pagos' }, { status: 403 })
  }

  const body = await request.json()
  const allowed = ['monto', 'fecha_pago', 'fecha_proximo_pago', 'pagado', 'nro_cuota']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('payments').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Pago actualizado' })
}
