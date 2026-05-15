import { NextRequest, NextResponse } from 'next/server'

/**
 * Acortador de links para Instagram bio, Twitter, Stories, Reels.
 *
 *   /m/<code>  →  <target>?<query predefinida>
 *
 * `target` puede ser:
 *   - path relativo a este dominio (ej: "/ver-masterclass")
 *   - URL absoluta a otro dominio (ej: "https://ruartereports.org/empiezaaqui")
 *
 * Para agregar un código nuevo: sumar una entrada al mapa de abajo.
 */

type ShortLink = { target: string; query: Record<string, string> }

const EMPIEZAAQUI = '/empiezaaqui'
const VER_MASTERCLASS = '/ver-masterclass'

const SHORT_LINKS: Record<string, ShortLink> = {
  // ── Instagram BIO → empiezaaqui (canónico, link más usado) ──
  rr: { target: EMPIEZAAQUI, query: { cuenta: 'RR', 'fuente-utm': 'LINK-EN-BIO-RR' } },
  tr: { target: EMPIEZAAQUI, query: { cuenta: 'TR', 'fuente-utm': 'LINK-EN-BIO-TR' } },

  // ── Twitter → empiezaaqui ──
  'tw-rr': { target: EMPIEZAAQUI, query: { cuenta: 'RR', 'fuente-utm': 'twitter' } },
  'tw-tr': { target: EMPIEZAAQUI, query: { cuenta: 'TR', 'fuente-utm': 'twitter' } },

  // ── Instagram Historias → empiezaaqui ──
  'his-rr': { target: EMPIEZAAQUI, query: { cuenta: 'RR', 'fuente-utm': 'historias-instagram' } },
  'his-tr': { target: EMPIEZAAQUI, query: { cuenta: 'TR', 'fuente-utm': 'historias-instagram' } },

  // ── Instagram Reels → empiezaaqui ──
  'reel-rr': { target: EMPIEZAAQUI, query: { cuenta: 'RR', 'fuente-utm': 'reels-instagram' } },
  'reel-tr': { target: EMPIEZAAQUI, query: { cuenta: 'TR', 'fuente-utm': 'reels-instagram' } },

  // ── Twitter → masterclass ──
  'mc-tw-rr': { target: VER_MASTERCLASS, query: { cuenta: 'RR', 'fuente-utm': 'twitter' } },
  'mc-tw-tr': { target: VER_MASTERCLASS, query: { cuenta: 'TR', 'fuente-utm': 'twitter' } },

  // ── Instagram Historias → masterclass ──
  'mc-his-rr': { target: VER_MASTERCLASS, query: { cuenta: 'RR', 'fuente-utm': 'historias-instagram' } },
  'mc-his-tr': { target: VER_MASTERCLASS, query: { cuenta: 'TR', 'fuente-utm': 'historias-instagram' } },

  // ── Instagram Reels → masterclass ──
  'mc-reel-rr': { target: VER_MASTERCLASS, query: { cuenta: 'RR', 'fuente-utm': 'reels-instagram' } },
  'mc-reel-tr': { target: VER_MASTERCLASS, query: { cuenta: 'TR', 'fuente-utm': 'reels-instagram' } },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const entry = SHORT_LINKS[code.toLowerCase()]

  // Código desconocido → mandamos a la home de empiezaaqui sin params.
  if (!entry) {
    return NextResponse.redirect(new URL(EMPIEZAAQUI, request.url), 302)
  }

  const isAbsolute = /^https?:\/\//i.test(entry.target)
  const targetUrl = isAbsolute
    ? new URL(entry.target)
    : new URL(entry.target, request.url)

  // Agregamos la query predefinida del código.
  for (const [k, v] of Object.entries(entry.query)) {
    targetUrl.searchParams.set(k, v)
  }
  // Si vienen params extra en /m/<code>?foo=bar, también se reenvían.
  request.nextUrl.searchParams.forEach((v, k) => {
    if (!targetUrl.searchParams.has(k)) targetUrl.searchParams.set(k, v)
  })

  return NextResponse.redirect(targetUrl, 302)
}
