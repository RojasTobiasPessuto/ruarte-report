/**
 * PATCH /api/admin/users/[id]
 * Solo admin: cambia role_id y/o closer_id de un usuario.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getCurrentUser()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isAdmin(ctx)) {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if ('role_id' in body) updates.role_id = body.role_id || null
  if ('closer_id' in body) updates.closer_id = body.closer_id || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('app_users').update(updates).eq('id', id)

  if (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Usuario actualizado' })
}
