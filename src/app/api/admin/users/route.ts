import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (appUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden crear usuarios' }, { status: 403 })
    }

    const { email, password, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    // Create auth user with service role
    const serviceClient = await createServiceRoleClient()
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return NextResponse.json({ error: createError?.message || 'Error al crear usuario' }, { status: 400 })
    }

    // Create app user record
    const { error: insertError } = await serviceClient
      .from('app_users')
      .insert({
        id: newUser.user.id,
        email,
        role: role || 'viewer',
      })

    if (insertError) {
      // Cleanup: delete auth user if app_users insert fails
      await serviceClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Error al registrar usuario en la app' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: { id: newUser.user.id, email, role: role || 'viewer' },
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (appUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const { data: users } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at')

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
