import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify user is admin
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
      return NextResponse.json({ error: 'Solo administradores pueden eliminar' }, { status: 403 })
    }

    const { type, id } = await request.json()

    if (!type || !id) {
      return NextResponse.json({ error: 'type e id son requeridos' }, { status: 400 })
    }

    const serviceClient = await createServiceRoleClient()

    switch (type) {
      case 'call': {
        // Delete analysis first (cascade should handle it, but just in case)
        await serviceClient.from('call_analyses').delete().eq('call_id', id)
        const { error } = await serviceClient.from('calls').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'closer': {
        // Set calls to null closer before deleting
        await serviceClient.from('calls').update({ closer_id: null }).eq('closer_id', id)
        const { error } = await serviceClient.from('closers').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'user': {
        // Don't allow deleting yourself
        if (id === user.id) {
          return NextResponse.json({ error: 'No podés eliminarte a vos mismo' }, { status: 400 })
        }
        const { error: dbError } = await serviceClient.from('app_users').delete().eq('id', id)
        if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
        // Also delete auth user
        await serviceClient.auth.admin.deleteUser(id)
        break
      }
      default:
        return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Eliminado correctamente' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
