/**
 * Fix contact names for existing calls.
 * Extracts lead name from fathom_summary or analysis.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/fix-names.ts
 */

import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_KEY!

if (!URL || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const db = createClient(URL, KEY)

// Known closer names to exclude
const CLOSER_NAMES = ['hernan', 'hernan grando', 'patricio', 'patricio rocha', 'closer', 'ruarte', 'tobias', 'tobias rojas']

function isValidName(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (lower.length < 2 || lower.length > 50) return false
  if (CLOSER_NAMES.some(c => lower.includes(c))) return false
  if (['meeting', 'google', 'impromptu', 'sin nombre', 'no mencionado', 'general',
       'null', 'undefined', 'the', 'test', 'prueba', 'llamada'].some(w => lower === w || lower.startsWith(w + ' '))) return false
  // Must start with uppercase
  if (!/^[A-ZÁÉÍÓÚÑ]/.test(name.trim())) return false
  return true
}

function extractNameFromSummary(text: string): string | null {
  if (!text) return null

  const patterns = [
    // "Qualify/assess/coach Name Surname" patterns from Fathom summaries
    /(?:Qualify|Assess|Coach|Onboard|Guide|Help|Advise|Meet)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s+(?:for|on|with|about|to|as)/i,

    // "Name Surname, a/an ..." or "Name Surname wants/needs/is"
    /\*\*(?:Problem|Client|Lead|Prospect)[:\s]*\*\*\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)[,\s]+(?:a|an|un|una|is|wants|needs|has|lacks|fue)/i,

    // "for Name Surname" after purpose
    /(?:for|para|de|con)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})[\.\,\]]/,

    // "Name Surname" at start of a key takeaway
    /\*\*[^*]+\*\*\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)[,\s]+(?:a|an|un|una|quiere|necesita|tiene|busca|es|está|fue|wants|needs|is|has)/i,

    // "Nombre del lead: X"
    /Nombre del lead[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\n|$|,)/i,

    // Fathom pattern: "services for Name"
    /services?\s+(?:for|to)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i,

    // "investment ... for Name"
    /(?:investment|coaching|trading|program)\s+.*?(?:for|to)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i,

    // "con Lead: Name" from imported filenames
    /con Lead[_:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\.|$|\n)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const name = match[1].trim().replace(/\s+$/, '')
      if (isValidName(name)) return name
    }
  }

  return null
}

async function fixNames() {
  console.log('=== Fixing contact names ===\n')

  // Get all calls with analyses
  let allCalls: any[] = []
  let offset = 0
  while (true) {
    const { data } = await db
      .from('calls')
      .select('id, contact_name, fathom_summary')
      .order('call_date', { ascending: false })
      .range(offset, offset + 99)
    if (!data || data.length === 0) break
    allCalls = allCalls.concat(data)
    offset += 100
    if (data.length < 100) break
  }

  // Get analyses
  const { data: analyses } = await db
    .from('call_analyses')
    .select('call_id, summary, raw_analysis')

  const analysisMap = new Map<string, any>()
  for (const a of analyses || []) {
    analysisMap.set(a.call_id, a)
  }

  console.log(`Found ${allCalls.length} total calls\n`)

  let updated = 0
  let skipped = 0
  let noName = 0

  for (const call of allCalls) {
    const currentName = call.contact_name || ''
    const isGeneric = !currentName ||
      currentName === 'Sin nombre' ||
      currentName.includes('Impromptu') ||
      currentName.includes('Meeting') ||
      currentName === 'pide tiempo' ||
      currentName === 'Trading Models' ||
      currentName === 'receptivo' ||
      currentName.includes('mostró genuino')

    if (!isGeneric) {
      skipped++
      continue
    }

    let newName: string | null = null

    // Try from fathom_summary
    if (call.fathom_summary) {
      newName = extractNameFromSummary(call.fathom_summary)
    }

    // Try from analysis
    if (!newName) {
      const analysis = analysisMap.get(call.id)
      if (analysis?.summary) {
        newName = extractNameFromSummary(analysis.summary)
      }
      if (!newName && analysis?.raw_analysis) {
        // Check contact_name in raw_analysis
        if (typeof analysis.raw_analysis === 'object' && analysis.raw_analysis.contact_name) {
          const cn = analysis.raw_analysis.contact_name
          if (typeof cn === 'string' && isValidName(cn)) {
            newName = cn
          }
        }
      }
    }

    if (newName) {
      const { error } = await db
        .from('calls')
        .update({ contact_name: newName })
        .eq('id', call.id)

      if (error) {
        console.error(`  Error: ${error.message}`)
      } else {
        console.log(`  "${currentName}" -> "${newName}"`)
        updated++
      }
    } else {
      console.log(`  [NO NAME FOUND] "${currentName}" | summary: ${(call.fathom_summary || '').substring(0, 100)}...`)
      noName++
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`Updated:  ${updated}`)
  console.log(`Already named:  ${skipped}`)
  console.log(`Could not find:  ${noName}`)
}

fixNames().catch(console.error)
