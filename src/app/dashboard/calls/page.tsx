export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { CallsTable } from '@/components/dashboard/calls-table'
import { CallsFilters } from '@/components/calls/calls-filters'
import type { Call, Closer } from '@/types'

interface SearchParams {
  [key: string]: string | undefined
  closer?: string
  result?: string
  from?: string
  to?: string
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  // Get closers for filter
  const { data: closers } = await supabase
    .from('closers')
    .select('*')
    .eq('active', true)
    .order('name')

  // Build query
  let query = supabase
    .from('calls')
    .select(`
      *,
      closer:closers(*),
      analysis:call_analyses(*)
    `)
    .order('call_date', { ascending: false })

  if (params.closer) {
    query = query.eq('closer_id', params.closer)
  }
  if (params.from) {
    query = query.gte('call_date', params.from)
  }
  if (params.to) {
    query = query.lte('call_date', params.to)
  }

  const { data: calls } = await query

  // Filter by result client-side (it's in the joined table)
  let filteredCalls = (calls || []) as Call[]
  if (params.result) {
    filteredCalls = filteredCalls.filter((c) => c.analysis?.result === params.result)
  }

  return (
    <div>
      <Header title="Llamadas" />
      <div className="p-8 space-y-6">
        <CallsFilters closers={(closers || []) as Closer[]} currentParams={params} />
        <CallsTable calls={filteredCalls} />
      </div>
    </div>
  )
}
