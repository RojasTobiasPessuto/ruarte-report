import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/permissions'

export async function GET() {
  const ctx = await getCurrentUser()

  if (!ctx) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json({
    user: ctx.user,
    role: ctx.role,
    closer: ctx.closer,
    is_admin: isAdmin(ctx),
    role_name: ctx.role?.name || ctx.appUser.role,
  })
}
