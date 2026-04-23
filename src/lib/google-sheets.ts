/**
 * Cliente mínimo para Google Sheets API v4 usando auth vía Service Account (JWT).
 * No requiere dependencias externas — usa `crypto` nativo de Node.
 *
 * Env vars (dos opciones, en orden de prioridad):
 *   GOOGLE_SHEETS_CREDENTIALS_JSON — JSON completo del service account (más simple)
 *   GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY — por separado (legacy)
 *
 * También:
 *   GOOGLE_SHEETS_ID — ID del Sheet destino
 */

import { createSign } from 'crypto'

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

let cachedToken: { token: string; expires: number } | null = null

function getCredentials() {
  // Opción 1: JSON completo (más simple, solo pegás el contenido del archivo)
  const jsonStr = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON
  if (jsonStr) {
    try {
      const creds = JSON.parse(jsonStr) as { client_email?: string; private_key?: string }
      if (creds.client_email && creds.private_key) {
        return { clientEmail: creds.client_email, privateKey: creds.private_key }
      }
    } catch (e) {
      throw new Error(`GOOGLE_SHEETS_CREDENTIALS_JSON inválido: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Opción 2: variables separadas
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (clientEmail && privateKey) {
    return { clientEmail, privateKey }
  }

  throw new Error('Faltan credenciales de Google Sheets. Cargá GOOGLE_SHEETS_CREDENTIALS_JSON o GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY')
}

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expires > now + 60_000) {
    return cachedToken.token
  }

  const { clientEmail, privateKey } = getCredentials()
  const iat = Math.floor(now / 1000)
  const exp = iat + 3600

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    exp,
    iat,
  }

  const b64 = (s: string) => Buffer.from(s).toString('base64url')
  const signingInput = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(payload))}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(privateKey, 'base64url')
  const jwt = `${signingInput}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    throw new Error(`Google token error ${res.status}: ${(await res.text()).substring(0, 300)}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = {
    token: data.access_token,
    expires: now + data.expires_in * 1000,
  }
  return data.access_token
}

export type SheetValue = string | number | boolean | null

/**
 * Limpia un rango del Sheet (ej: "Leads!A:Z").
 */
export async function clearRange(sheetId: string, range: string): Promise<void> {
  const token = await getAccessToken()
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}:clear`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Sheets clear error ${res.status}: ${(await res.text()).substring(0, 300)}`)
  }
}

/**
 * Escribe valores a partir de un rango (ej: "Leads!A1"). Sobrescribe lo existente.
 */
export async function writeRange(
  sheetId: string,
  range: string,
  values: SheetValue[][]
): Promise<void> {
  const token = await getAccessToken()
  const url = `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    throw new Error(`Sheets write error ${res.status}: ${(await res.text()).substring(0, 300)}`)
  }
}

/**
 * Helper: reemplaza el contenido de una hoja con un dataset completo.
 * Primero limpia el rango y después escribe los datos nuevos.
 */
export async function replaceSheetData(
  sheetId: string,
  sheetName: string,
  headers: string[],
  rows: SheetValue[][]
): Promise<void> {
  await clearRange(sheetId, `${sheetName}!A:ZZ`)
  await writeRange(sheetId, `${sheetName}!A1`, [headers, ...rows])
}
