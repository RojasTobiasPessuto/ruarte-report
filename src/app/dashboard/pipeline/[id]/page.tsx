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

  // Permitir acceso si es admin, o si puede llenar post-agenda, o si puede ver todas las oportunidades
  if (!isAdmin(ctx) && !hasPermission(ctx, 'can_fill_post_agenda') && !hasPermission(ctx, 'can_view_all_opportunities')) {
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

  // Check access: si no tiene can_view_all_opportunities, debe ser suyo
  const viewAll = isAdmin(ctx) || hasPermission(ctx, 'can_view_all_opportunities')
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

  // Get all active closers for owner change (only for admins/managers)
  const canChangeOwner = isAdmin(ctx) || hasPermission(ctx, 'can_view_all_opportunities')
  const { data: closers } = canChangeOwner
    ? await supabase.from('closers').select('*').eq('active', true).order('name')
    : { data: [] }

  const canViewAll = isAdmin(ctx) || hasPermission(ctx, 'can_view_all_opportunities')
  const isOwnOpp = !!ctx.appUser.closer_id && opp.closer_id === ctx.appUser.closer_id
  
  // Admin y Manager (canViewAll) editan cualquier oportunidad. 
  // Closers solo las suyas (isOwnOpp).
  const EDITABLE_STAGES = ['Post Llamada', 'Seguimiento']
  const canFillForm = isAdmin(ctx) 
    || (canViewAll && EDITABLE_STAGES.includes(opp.pipeline_stage || ''))
    || (hasPermission(ctx, 'can_fill_post_agenda') && EDITABLE_STAGES.includes(opp.pipeline_stage || '') && isOwnOpp)

  // Pagos: admin y manager cualquier venta; closers solo las suyas.
  const canCreatePayment = canViewAll || (hasPermission(ctx, 'can_create_payment') && isOwnOpp)
  const canEditPayment = canViewAll || (hasPermission(ctx, 'can_edit_payment') && isOwnOpp)

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
          isAdmin={isAdmin(ctx)}
        />
      </div>
    </div>
  )
}
