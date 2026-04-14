/**
 * Backfill fathom_url for existing calls by querying Fathom API.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... FATHOM_KEYS=key1,key2 npx tsx scripts/backfill-fathom-urls.ts
 */

import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_KEY!
const FATHOM_KEYS = (process.env.FATHOM_KEYS || '').split(',').filter(Boolean)

if (!URL || !KEY || FATHOM_KEYS.length === 0) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_KEY, FATHOM_KEYS')
  process.exit(1)
}

const db = createClient(URL, KEY)

async function fetchAllRecordings(apiKey: string): Promise<Record<string, string>> {
  const urlMap: Record<string, string> = {}
  let cursor: string | null = null

  do {
    const params = new URLSearchParams()
    params.set('limit', '100')
    if (cursor) params.set('next_cursor', cursor)

    const res = await fetch(
      `https://api.fathom.ai/external/v1/meetings?${params.toString()}`,
      { headers: { 'X-Api-Key': apiKey } }
    )

    if (!res.ok) {
      console.error('API error:', res.status, await res.text())
      break
    }

    const data = await res.json()
    const items = data.items || data.recordings || data.data || []

    for (const r of items) {
      const id = String(r.recording_id || r.id || '')
      const url = r.share_url || r.url || ''
      if (id && url) urlMap[id] = url
    }

    cursor = data.next_cursor || data.nextCursor || null
  } while (cursor)

  return urlMap
}

async function main() {
  console.log('=== Backfill Fathom URLs ===\n')

  // Build a map of fathom_call_id → url from all keys
  const allUrls: Record<string, string> = {}
  for (const key of FATHOM_KEYS) {
    console.log(`Fetching from key ${key.substring(0, 10)}...`)
    const urls = await fetchAllRecordings(key)
    Object.assign(allUrls, urls)
    console.log(`  Found ${Object.keys(urls).length} recordings`)
  }

  console.log(`\nTotal unique recordings: ${Object.keys(allUrls).length}\n`)

  // Get all calls without fathom_url
  const { data: calls } = await db
    .from('calls')
    .select('id, fathom_call_id, fathom_url')
    .not('fathom_call_id', 'is', null)

  console.log(`Found ${calls?.length || 0} calls with fathom_call_id\n`)

  let updated = 0
  let notFound = 0

  for (const call of calls || []) {
    if (call.fathom_url) continue // skip already filled
    const url = allUrls[call.fathom_call_id]
    if (!url) {
      notFound++
      continue
    }
    const { error } = await db.from('calls').update({ fathom_url: url }).eq('id', call.id)
    if (error) console.error('  Error:', error.message)
    else {
      console.log(`  ${call.fathom_call_id} → ${url}`)
      updated++
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`Updated: ${updated}`)
  console.log(`Not found in Fathom: ${notFound}`)
}

main().catch(console.error)
