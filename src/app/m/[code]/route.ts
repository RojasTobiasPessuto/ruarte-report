import { NextRequest, NextResponse } from 'next/server'

/**
 * Acortador de links para Instagram / bio / posts.
 *
 *   /m/<code>  →  /<destino>?<query predefinida>
 *
 * Para agregar un nuevo código: sumar una entrada al mapa de abajo.
 *
 * Ejemplo:
 *   app.ruartereports.org/m/rr
 *   →  app.ruartereports.org/ver-masterclass?fuente-utm=Bioigrr&cuenta=RR
 */

type ShortLink = { path: string; query: Record<string, string> }

const SHORT_LINKS: Record<string, ShortLink> = {
  // Masterclass — Instagram bio Roberto Ruarte
  rr: {
    path: '/ver-masterclass',
    query: { 'fuente-utm': 'Bioigrr', cuenta: 'RR' },
  },
  // Masterclass — Instagram bio Toronto Ruarte
  tr: {
    path: '/ver-masterclass',
    query: { 'fuente-utm': 'Bioigtr', cuenta: 'TR' },
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const entry = SHORT_LINKS[code.toLowerCase()]

  // Código no encontrado → mandamos a la landing por defecto sin params.
  if (!entry) {
    return NextResponse.redirect(new URL('/ver-masterclass', request.url), 302)
  }

  const target = new URL(entry.path, request.url)
  for (const [k, v] of Object.entries(entry.query)) {
    target.searchParams.set(k, v)
  }
  // Si vienen params extra en /m/<code>?foo=bar, también se reenvían.
  request.nextUrl.searchParams.forEach((v, k) => {
    if (!target.searchParams.has(k)) target.searchParams.set(k, v)
  })

  return NextResponse.redirect(target, 302)
}
