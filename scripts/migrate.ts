/**
 * Migration script: Export from old Supabase project, import to new one.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts
 *
 * Requires env vars:
 *   OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY
 *   NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const OLD_URL = process.env.OLD_SUPABASE_URL!
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_KEY!
const NEW_URL = process.env.NEW_SUPABASE_URL!
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_KEY!

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error('Missing env vars. Set OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const oldDb = createClient(OLD_URL, OLD_KEY)
const newDb = createClient(NEW_URL, NEW_KEY)

async function migrate() {
  console.log('=== Starting migration ===\n')

  // 1. Migrate closers
  console.log('Exporting closers...')
  const { data: closers, error: closersErr } = await oldDb
    .from('closers')
    .select('*')
    .order('created_at')

  if (closersErr) {
    console.error('Error exporting closers:', closersErr)
    return
  }
  console.log(`  Found ${closers?.length || 0} closers`)

  if (closers && closers.length > 0) {
    console.log('Importing closers...')
    const { error } = await newDb.from('closers').upsert(closers, { onConflict: 'id' })
    if (error) console.error('  Error importing closers:', error)
    else console.log(`  Imported ${closers.length} closers`)
  }

  // 2. Migrate calls (in batches of 100)
  console.log('\nExporting calls...')
  let allCalls: any[] = []
  let offset = 0
  const batchSize = 100

  while (true) {
    const { data: batch, error: callsErr } = await oldDb
      .from('calls')
      .select('*')
      .order('created_at')
      .range(offset, offset + batchSize - 1)

    if (callsErr) {
      console.error('Error exporting calls:', callsErr)
      break
    }

    if (!batch || batch.length === 0) break
    allCalls = allCalls.concat(batch)
    offset += batchSize

    if (batch.length < batchSize) break
  }

  console.log(`  Found ${allCalls.length} calls`)

  if (allCalls.length > 0) {
    console.log('Importing calls in batches...')
    for (let i = 0; i < allCalls.length; i += batchSize) {
      const batch = allCalls.slice(i, i + batchSize)
      const { error } = await newDb.from('calls').upsert(batch, { onConflict: 'id' })
      if (error) {
        console.error(`  Error importing calls batch ${i}-${i + batch.length}:`, error)
      } else {
        console.log(`  Imported calls ${i + 1}-${i + batch.length}`)
      }
    }
  }

  // 3. Migrate call_analyses (in batches)
  console.log('\nExporting call_analyses...')
  let allAnalyses: any[] = []
  offset = 0

  while (true) {
    const { data: batch, error: analysesErr } = await oldDb
      .from('call_analyses')
      .select('*')
      .order('created_at')
      .range(offset, offset + batchSize - 1)

    if (analysesErr) {
      console.error('Error exporting analyses:', analysesErr)
      break
    }

    if (!batch || batch.length === 0) break
    allAnalyses = allAnalyses.concat(batch)
    offset += batchSize

    if (batch.length < batchSize) break
  }

  console.log(`  Found ${allAnalyses.length} analyses`)

  if (allAnalyses.length > 0) {
    console.log('Importing analyses in batches...')
    for (let i = 0; i < allAnalyses.length; i += batchSize) {
      const batch = allAnalyses.slice(i, i + batchSize)
      const { error } = await newDb.from('call_analyses').upsert(batch, { onConflict: 'id' })
      if (error) {
        console.error(`  Error importing analyses batch ${i}-${i + batch.length}:`, error)
      } else {
        console.log(`  Imported analyses ${i + 1}-${i + batch.length}`)
      }
    }
  }

  // 4. Summary
  console.log('\n=== Migration complete ===')
  console.log(`Closers:  ${closers?.length || 0}`)
  console.log(`Calls:    ${allCalls.length}`)
  console.log(`Analyses: ${allAnalyses.length}`)
  console.log('\nNOTE: app_users are NOT migrated (they depend on auth.users).')
  console.log('You need to create the admin user manually in the new project.')
}

migrate().catch(console.error)
