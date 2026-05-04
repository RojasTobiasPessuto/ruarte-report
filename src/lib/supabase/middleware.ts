import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: 'none',
              secure: true,
            })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas que requieren autenticación
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isProtectedApi = request.nextUrl.pathname.startsWith('/api') && 
                         !request.nextUrl.pathname.startsWith('/api/webhook') && 
                         !request.nextUrl.pathname.startsWith('/api/cron')

  const requiresAuth = isDashboard || isProtectedApi

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone()
    const embed = request.nextUrl.searchParams.get('embed')
    url.pathname = '/login'
    if (embed === 'true') {
      url.searchParams.set('embed', 'true')
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
