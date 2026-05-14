export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, hasPermission, isAdmin } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { OpportunityDetail } from '@/components/pipeline/opportunity-detail'
import { BackButton } from '@/components/layout/back-button'
import { notFound, redirect } from 'next/navigation'
import type { Opportunity, Sale, PaymentType } from '@/types'

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireAuth()

  // Permitir acceso si es admin o si tiene visibilidad del menú Oportunidades
  if (!isAdmin(ctx) && !hasPermission(ctx, 'ver_oportunidades')) {
    redirect('/dashboard')
  }

  const supabase = await createServerSupabaseClient()

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select(`
      *,
      contact:contacts(*),
      closer:closers(*),
      lead:leads(*),
      call:calls(*)
    `)
    .eq('id', id)
    .single()

  if (!opportunity) notFound()

  const opp = opportunity as Opportunity

  // Check access: si no tiene ver_todas_oportunidades, debe ser suyo
  const viewAll = isAdmin(ctx) || hasPermission(ctx, 'ver_todas_oportunidades')
  if (!viewAll) {
    if (opp.closer_id !== ctx.appUser.closer_id) {
      redirect('/dashboard/pipeline')
    }
  }

  // Get sales of this opportunity
  const { data: salesData } = await supabase
    .from('sales')
    .select(`
      *,
      payment_type:payment_types(*),
      payments(*)
    `)
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false })

  // Calculate monto_restante for each sale
  const sales = ((salesData || []) as Sale[]).map((sale) => {
    const paid = (sale.payments || [])
      .filter((p) => p.pagado)
      .reduce((sum, p) => sum + Number(p.monto), 0)
    return { ...sale, monto_restante: Number(sale.revenue) - paid }
  })

  // Get payment types for form
  const { data: paymentTypes } = await supabase
    .from('payment_types')
    .select('*')
    .eq('active', true)
    .order('name')

  // Get all active closers for owner change (admin + editar_todas_oportunidades)
  const canChangeOwner = isAdmin(ctx) || hasPermission(ctx, 'editar_todas_oportunidades')
  const { data: closers } = canChangeOwner
    ? await supabase.from('closers').select('*').eq('active', true).order('name')
    : { data: [] }

  const canViewAll = isAdmin(ctx) || hasPermission(ctx, 'ver_todas_oportunidades')
  const isOwnOpp = !!ctx.appUser.closer_id && opp.closer_id === ctx.appUser.closer_id

  // Admin y manager (editar_todas_oportunidades) editan cualquier opp en cualquier stage.
  // Closer (editar_oportunidades) solo edita sus propias opps en stages editables.
  const EDITABLE_STAGES = ['Post Llamada', 'Seguimiento']
  const canFillForm = isAdmin(ctx)
    || hasPermission(ctx, 'editar_todas_oportunidades')
    || (hasPermission(ctx, 'editar_oportunidades') && EDITABLE_STAGES.includes(opp.pipeline_stage || '') && isOwnOpp)

  // Pagos: necesita acceso a la opp (ver_todas o ser propia) + el flag específico.
  const hasOppAccess = canViewAll || isOwnOpp
  const canCreatePayment = isAdmin(ctx) || (hasPermission(ctx, 'crear_pago') && hasOppAccess)
  const canEditPayment = isAdmin(ctx) || (hasPermission(ctx, 'editar_pago') && hasOppAccess)

  return (
    <div>
      <Header title={`Oportunidad — ${opp.contact_name || 'Sin nombre'}`} />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <BackButton fallbackPath="/dashboard/pipeline" />
        <OpportunityDetail
          opportunity={opp}
          sales={sales}
          paymentTypes={(paymentTypes || []) as PaymentType[]}
          closers={(closers || [])}
          canFillForm={canFillForm}
          canCreatePayment={canCreatePayment}
          canEditPayment={canEditPayment}
          canChangeOwner={canChangeOwner}
          canViewAll={canViewAll}
          isAdmin={isAdmin(ctx)}
        />
      </div>
    </div>
  )
}
