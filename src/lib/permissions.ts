/**
 * Helpers de permisos y roles.
 * Centraliza la lógica de verificación de permisos para todas las páginas.
 */

import type { Role, AppUser, Closer } from '@/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface UserContext {
  user: { id: string; email: string }
  appUser: AppUser
  role: Role | null
  closer: Closer | null
}

/**
 * Obtiene el usuario actual con su role y closer asociado.
 * Server-side only.
 */
export async function getCurrentUser(): Promise<UserContext | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: appUser } = await supabase
    .from('app_users')
    .select(`
      *,
      role_data:roles(*),
      closer:closers(*)
    `)
    .eq('id', user.id)
    .single()

  if (!appUser) {
    return {
      user: { id: user.id, email: user.email || '' },
      appUser: {
        id: user.id,
        email: user.email || '',
        role: 'viewer',
        role_id: null,
        closer_id: null,
        created_at: new Date().toISOString(),
      },
      role: null,
      closer: null,
    }
  }

  return {
    user: { id: user.id, email: user.email || '' },
    appUser: appUser as AppUser,
    role: (appUser.role_data as Role) || null,
    closer: (appUser.closer as Closer) || null,
  }
}

/**
 * Chequea si el usuario tiene un permiso específico.
 * Admin (role legacy 'admin') siempre pasa.
 */
export function hasPermission(
  ctx: UserContext | null,
  permission: keyof Role
): boolean {
  if (!ctx) return false

  // Legacy fallback: si role en app_users es 'admin', acceso total
  if (ctx.appUser.role === 'admin') return true

  if (!ctx.role) return false

  const value = ctx.role[permission]
  return typeof value === 'boolean' ? value : false
}

/**
 * Verifica acceso y redirige si no lo tiene.
 * Usar en server components al inicio de la página.
 */
export async function requirePermission(
  permission: keyof Role,
  redirectTo = '/dashboard'
): Promise<UserContext> {
  const ctx = await getCurrentUser()
  if (!ctx) redirect('/login')
  if (!hasPermission(ctx, permission)) redirect(redirectTo)
  return ctx
}

/**
 * Requiere que el usuario esté autenticado (sin permisos específicos).
 */
export async function requireAuth(): Promise<UserContext> {
  const ctx = await getCurrentUser()
  if (!ctx) redirect('/login')
  return ctx
}

/**
 * Helper para saber si el usuario tiene role 'admin' (role legacy o role_id con can_view_all).
 */
export function isAdmin(ctx: UserContext | null): boolean {
  if (!ctx) return false
  if (ctx.appUser.role === 'admin') return true
  return ctx.role?.name === 'admin' || false
}

/**
 * Helper para saber si el usuario es closer (tiene closer_id asociado).
 */
export function isCloser(ctx: UserContext | null): boolean {
  if (!ctx) return false
  return !!ctx.appUser.closer_id
}

/**
 * Devuelve el closer_id del usuario actual para filtrar queries.
 * Si el usuario tiene can_view_all_* lo devuelve null (sin filtro).
 */
export function getCloserFilter(
  ctx: UserContext | null,
  viewAllPermission: keyof Role
): string | null {
  if (!ctx) return 'INVALID' // forzar que no devuelva nada
  if (hasPermission(ctx, viewAllPermission)) return null
  return ctx.appUser.closer_id || 'INVALID'
}
