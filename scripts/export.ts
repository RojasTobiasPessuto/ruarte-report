/**
 * Export data from Supabase to local JSON files.
 * Usage: OLD_SUPABASE_URL=... OLD_SUPABASE_SERVICE_KEY=... npx tsx scripts/export.ts
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'

const URL = process.env.OLD_SUPABASE_URL!
const KEY = process.env.OLD_SUPABASE_SERVICE_KEY!

if (!URL || !KEY) {
  console.error('Set OLD_SUPABASE_URL and OLD_SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const db = createClient(URL, KEY)

async function exportAll() {
  mkdirSync('scripts/data', { recursive: true })

  // Closers
  console.log('Exporting closers...')
  const { data: closers } = await db.from('closers').select('*').order('created_at')
  writeFileSync('scripts/data/closers.json', JSON.stringify(closers || [], null, 2))
  console.log(`  ${closers?.length || 0} closers saved`)

  // Calls
  console.log('Exporting calls...')
  let allCalls: any[] = []
  let offset = 0
  while (true) {
    const { data } = await db.from('calls').select('*').order('created_at').range(offset, offset + 99)
    if (!data || data.length === 0) break
    allCalls = allCalls.concat(data)
    offset += 100
    if (data.length < 100) break
  }
  writeFileSync('scripts/data/calls.json', JSON.stringify(allCalls, null, 2))
  console.log(`  ${allCalls.length} calls saved`)

  // Analyses
  console.log('Exporting call_analyses...')
  let allAnalyses: any[] = []
  offset = 0
  while (true) {
    const { data } = await db.from('call_analyses').select('*').order('created_at').range(offset, offset + 99)
    if (!data || data.length === 0) break
    allAnalyses = allAnalyses.concat(data)
    offset += 100
    if (data.length < 100) break
  }
  writeFileSync('scripts/data/call_analyses.json', JSON.stringify(allAnalyses, null, 2))
  console.log(`  ${allAnalyses.length} analyses saved`)

  console.log('\nExport complete! Files saved in scripts/data/')
}

exportAll().catch(console.error)
