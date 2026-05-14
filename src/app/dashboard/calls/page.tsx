export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { CallsTable } from '@/components/dashboard/calls-table'
import { CallsFilters } from '@/components/calls/calls-filters'
import Link from 'next/link'
import { Upload } from 'lucide-react'
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
  const ctx = await requireAuth()
  if (!isAdmin(ctx) && !hasPermission(ctx, 'ver_llamadas')) {
    redirect('/dashboard/pipeline')
  }
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  // Si no tiene ver_todas_llamadas, filtrar a las suyas
  const viewAllCalls = isAdmin(ctx) || hasPermission(ctx, 'ver_todas_llamadas')
  const canImport = isAdmin(ctx) || hasPermission(ctx, 'importar_llamadas')

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

  if (!viewAllCalls) {
    // Closer ve solo sus propias llamadas
    if (!ctx.appUser.closer_id) {
      return (
        <div>
          <Header title="Llamadas" />
          <div className="p-4 md:p-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-400">No tenés un closer asignado. Contactá al administrador.</p>
            </div>
          </div>
        </div>
      )
    }
    query = query.eq('closer_id', ctx.appUser.closer_id)
  } else if (params.closer) {
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
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CallsFilters closers={(closers || []) as Closer[]} currentParams={params} />
          {canImport && (
            <Link
              href="/dashboard/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importar llamadas
            </Link>
          )}
        </div>
        <CallsTable calls={filteredCalls} />
      </div>
    </div>
  )
}
