/**
 * Import data from local JSON files to Supabase.
 * Usage: NEW_SUPABASE_URL=... NEW_SUPABASE_SERVICE_KEY=... npx tsx scripts/import.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const URL = process.env.NEW_SUPABASE_URL!
const KEY = process.env.NEW_SUPABASE_SERVICE_KEY!

if (!URL || !KEY) {
  console.error('Set NEW_SUPABASE_URL and NEW_SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const db = createClient(URL, KEY)

async function importAll() {
  // Closers
  console.log('Importing closers...')
  const closers = JSON.parse(readFileSync('scripts/data/closers.json', 'utf-8'))
  if (closers.length > 0) {
    const { error } = await db.from('closers').upsert(closers, { onConflict: 'id' })
    if (error) console.error('  Error:', error)
    else console.log(`  ${closers.length} closers imported`)
  }

  // Calls (in batches)
  console.log('Importing calls...')
  const calls = JSON.parse(readFileSync('scripts/data/calls.json', 'utf-8'))
  for (let i = 0; i < calls.length; i += 50) {
    const batch = calls.slice(i, i + 50)
    const { error } = await db.from('calls').upsert(batch, { onConflict: 'id' })
    if (error) console.error(`  Error batch ${i}-${i + batch.length}:`, error)
    else console.log(`  Imported calls ${i + 1}-${i + batch.length}`)
  }

  // Analyses (in batches)
  console.log('Importing analyses...')
  const analyses = JSON.parse(readFileSync('scripts/data/call_analyses.json', 'utf-8'))
  for (let i = 0; i < analyses.length; i += 50) {
    const batch = analyses.slice(i, i + 50)
    const { error } = await db.from('call_analyses').upsert(batch, { onConflict: 'id' })
    if (error) console.error(`  Error batch ${i}-${i + batch.length}:`, error)
    else console.log(`  Imported analyses ${i + 1}-${i + batch.length}`)
  }

  console.log('\nImport complete!')
  console.log(`Closers:  ${closers.length}`)
  console.log(`Calls:    ${calls.length}`)
  console.log(`Analyses: ${analyses.length}`)
}

importAll().catch(console.error)
