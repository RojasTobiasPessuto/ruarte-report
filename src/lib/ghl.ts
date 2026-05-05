/**
 * Cliente GoHighLevel API v2
 * Docs: https://highlevel.stoplight.io/docs/integrations/
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

const GHL_TOKEN = process.env.HIGHLEVEL_API_KEY
const GHL_LOCATION_ID = process.env.HIGHLEVEL_LOCATION_ID
export const GHL_PIPELINE_ID = process.env.GHL_PIPELINE_ID || 'P6LRnutPF60CchJsrHn1'

// Field IDs mapeados del pipeline Agendas
export const GHL_FIELD_IDS = {
  estadoCita: 'essLeEclPsiKtqcpuJmD',
  closer: 'mPNJalOIkmCMpjkPF0gh',
  fechaLlamada: 'uNhk9ZcwgHp1fg64AlIA',
  programa: '2NBw0DTGoNoWL6WGuTl9',
  situacion: '4N5KNDWhZL3hmi4PXMts',
  descripcion: '6OEevrUIc55XMulEaNqW',
  formaPago: 'fPUDEPzYiIAZakBZ62sM',
  tipoPago: 'PzCUwVoF9ftt8UQqtnoe',
  revenue: 'I0hZDYqraA1gfDHDpMsI',
  cash: 'YfebFtMdsckkfDayHolB',
  depositoBroker: 'FOy85vmxC9wnkv1lnhL1',
  justificante: 'mhFZw84ryROj1szlCVZ4',
  codigoTransaccion: 'c2DoGzzcaQnYH471abTo',
  cantidadCuotas: 'A6frS2Zi1STk66ty24B1',
  nroCuota: 'P5AMOretf47E3IkQbKBj',
  fechaPago: 'JGvrWkDVF2Cy8fRyixKZ',
  fechaProximoPago: 'CLakZgktYtyXFLxmND4D',
  montoRestante: 'Y3x3aaMS27mdQSU3gpO4',
  seguimiento: 'gJ9Iv4P3B7OWtQidfu7z',
  respuestaCalendar: 'A9dct55A4iyGOMgVXnbA',
} as const

// Stage IDs
export const GHL_STAGE_IDS = {
  agendadoNuevo: '79487648-2abb-43e3-a33c-47e2d71a2b05',
  agendadoConfirmado: 'ce5d8854-20d1-41c5-8790-9a21b4601ed4',
  postLlamada: 'ee2296bf-08ca-49a0-a558-10ae67f01b9b',
  reagendado: '9a584cbb-cc95-4e7c-b50b-f4e0712f9ae5',
  seguimiento: 'dcc40faa-4532-4262-92a0-fc4c17aad231',
  compro: '550bd49c-1a4a-4d71-9709-675bd7a02729',
  noCompro: '07f279fc-e929-4a8e-8c66-f831736cf216',
  cancelado: 'db174649-c13b-4eb9-810e-935099d0d225',
  noAsistio: '61bc8479-8c99-446a-ba92-2b49018e9733',
} as const

// Mapeo stage_id → nombre
export const GHL_STAGE_NAMES: Record<string, string> = {
  [GHL_STAGE_IDS.agendadoNuevo]: 'Agendado (Nuevo)',
  [GHL_STAGE_IDS.agendadoConfirmado]: 'Agendado (Confirmado)',
  [GHL_STAGE_IDS.postLlamada]: 'Post Llamada',
  [GHL_STAGE_IDS.reagendado]: 'ReAgendado',
  [GHL_STAGE_IDS.seguimiento]: 'Seguimiento',
  [GHL_STAGE_IDS.compro]: 'Compro',
  [GHL_STAGE_IDS.noCompro]: 'No Compro',
  [GHL_STAGE_IDS.cancelado]: 'Cancelado',
  [GHL_STAGE_IDS.noAsistio]: 'No Asistio',
}

// Mapeo nombre → stage_id
export const GHL_STAGE_IDS_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(GHL_STAGE_NAMES).map(([id, name]) => [name, id])
)

export interface GHLCustomFieldValue {
  id: string
  type: 'string' | 'number' | 'date' | 'array'
  fieldValueString?: string
  fieldValueNumber?: number
  fieldValueDate?: number
  fieldValueFiles?: Array<{ url: string; meta: { name: string } }>
}

export interface GHLOpportunity {
  id: string
  name: string
  monetaryValue: number
  pipelineId: string
  pipelineStageId: string
  assignedTo: string | null
  status: string
  source: string | null
  lastStatusChangeAt: string
  lastStageChangeAt: string
  createdAt: string
  updatedAt: string
  contactId: string
  locationId: string
  customFields: GHLCustomFieldValue[]
  contact: {
    id: string
    name: string
    companyName: string | null
    email: string
    phone: string
    tags: string[]
  }
  relations?: Array<{
    email?: string
    phone?: string
    fullName?: string
    contactName?: string
  }>
}

function getHeaders(): HeadersInit {
  if (!GHL_TOKEN) throw new Error('HIGHLEVEL_API_KEY not configured')
  return {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: GHL_API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

/**
 * Busca oportunidades del pipeline con paginación.
 */
export async function searchOpportunities(options: {
  pipelineId?: string
  pipelineStageId?: string
  limit?: number
  startAfter?: number
  startAfterId?: string
} = {}): Promise<{ opportunities: GHLOpportunity[]; meta: { total: number; nextPageUrl: string | null; startAfter?: number; startAfterId?: string } }> {
  const params = new URLSearchParams()
  params.set('location_id', GHL_LOCATION_ID!)
  params.set('pipeline_id', options.pipelineId || GHL_PIPELINE_ID)
  if (options.pipelineStageId) params.set('pipeline_stage_id', options.pipelineStageId)
  params.set('limit', String(options.limit || 100))
  if (options.startAfter) params.set('startAfter', String(options.startAfter))
  if (options.startAfterId) params.set('startAfterId', options.startAfterId)
  


  const url = `${GHL_API_BASE}/opportunities/search?${params.toString()}`
  const response = await fetch(url, { headers: getHeaders() })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GHL API error ${response.status}: ${text.substring(0, 300)}`)
  }

  return response.json()
}

/**
 * Obtiene TODAS las oportunidades del pipeline (paginación automática).
 */
export async function getAllOpportunities(pipelineId?: string): Promise<GHLOpportunity[]> {
  const all: GHLOpportunity[] = []
  let startAfter: number | undefined
  let startAfterId: string | undefined

  while (true) {
    const res = await searchOpportunities({
      pipelineId,
      limit: 100,
      startAfter,
      startAfterId,
    })
    all.push(...res.opportunities)
    if (!res.meta.nextPageUrl || res.opportunities.length === 0) break
    startAfter = res.meta.startAfter
    startAfterId = res.meta.startAfterId
    if (!startAfter || !startAfterId) break
  }

  return all
}

/**
 * Obtiene un contacto de GHL por ID.
 */
export async function getContact(contactId: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    headers: getHeaders(),
  })

  if (!response.ok) return null
  const data = await response.json()
  return data.contact || null
}

/**
 * Actualiza una oportunidad en GHL (stage + custom fields).
 */
export async function updateOpportunity(
  opportunityId: string,
  updates: {
    pipelineStageId?: string
    status?: 'open' | 'won' | 'lost' | 'abandoned'
    assignedTo?: string
    customFields?: Array<{ id: string; key?: string; field_value: unknown }>
  }
): Promise<{ success: boolean; status?: number; error?: string; body?: unknown }> {
  const body: Record<string, unknown> = {}
  if (updates.pipelineStageId) body.pipelineStageId = updates.pipelineStageId
  if (updates.status) body.status = updates.status
  if (updates.assignedTo !== undefined) body.assignedTo = updates.assignedTo
  if (updates.customFields) body.customFields = updates.customFields

  console.log(`[GHL] PUT opportunity ${opportunityId}:`, JSON.stringify(body).substring(0, 500))

  const response = await fetch(`${GHL_API_BASE}/opportunities/${opportunityId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  let parsedBody: unknown
  try { parsedBody = JSON.parse(responseText) } catch { parsedBody = responseText }

  if (!response.ok) {
    console.error(`[GHL] Update error ${response.status}:`, responseText.substring(0, 500))
    return { success: false, status: response.status, error: responseText.substring(0, 500), body: parsedBody }
  }

  console.log(`[GHL] Update success for ${opportunityId}`)
  return { success: true, status: response.status, body: parsedBody }
}

/**
 * Extrae un custom field del array de customFields por su ID.
 */
export function getCustomFieldValue(
  customFields: GHLCustomFieldValue[],
  fieldId: string
): string | number | null {
  const field = customFields.find((f) => f.id === fieldId)
  if (!field) return null
  if (field.fieldValueString !== undefined) return field.fieldValueString
  if (field.fieldValueNumber !== undefined) return field.fieldValueNumber
  if (field.fieldValueDate !== undefined) return field.fieldValueDate
  return null
}

/**
 * Parsea una fecha en formato español de GHL a ISO 8601.
 * Ejemplos:
 *   "23 de abril de 2026 / 14:00" → "2026-04-23T14:00:00.000Z"
 *   "1 de mayo de 2026 / 9:30"    → "2026-05-01T09:30:00.000Z"
 * Devuelve null si no matchea el formato.
 */
export function parseSpanishDate(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null

  const MONTHS: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8,
    octubre: 9, noviembre: 10, diciembre: 11,
  }

  // "DIA de MES de AÑO / HH:MM"
  const regex = /(\d{1,2})\s+de\s+([a-zA-Záéíóúñ]+)\s+de\s+(\d{4})(?:\s*\/\s*(\d{1,2}):(\d{2}))?/i
  const match = input.trim().match(regex)
  if (!match) return null

  const day = parseInt(match[1])
  const monthName = match[2].toLowerCase()
  const year = parseInt(match[3])
  const hour = match[4] ? parseInt(match[4]) : 0
  const minute = match[5] ? parseInt(match[5]) : 0

  const month = MONTHS[monthName]
  if (month === undefined) return null
  if (day < 1 || day > 31 || year < 2000 || year > 2100) return null

  try {
    const date = new Date(Date.UTC(year, month, day, hour, minute, 0))
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

/**
 * Extrae el IG username del contacto si viene en attributions o tags.
 */
export function extractIgUsername(opp: GHLOpportunity): string | null {
  // Buscar en tags o en nombre del contacto patrones de IG
  const tags = opp.contact?.tags || []
  for (const tag of tags) {
    if (tag.startsWith('ig:') || tag.startsWith('@')) {
      return tag.replace(/^(ig:|@)/, '')
    }
  }
  return null
}
