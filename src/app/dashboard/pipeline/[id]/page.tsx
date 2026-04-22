export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, hasPermission, isAdmin } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { OpportunityDetail } from '@/components/pipeline/opportunity-detail'
import { notFound, redirect } from 'next/navigation'
import type { Opportunity, Sale, PaymentType } from '@/types'

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireAuth()

  // Solo admin y closer pueden entrar al pipeline detail
  if (!isAdmin(ctx) && !hasPermission(ctx, 'can_fill_post_agenda')) {
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

  const userIsAdmin = isAdmin(ctx)
  // La oportunidad pertenece al closer del usuario (null para admins, que pueden editar cualquier cosa)
  const isOwnOpp = !!ctx.appUser.closer_id && opp.closer_id === ctx.appUser.closer_id
  // Admin edita cualquier oportunidad. Closer/Manager solo las de su closer asignado en "Post Llamada" o "Seguimiento".
  const EDITABLE_STAGES = ['Post Llamada', 'Seguimiento']
  const canFillForm = userIsAdmin
    || (hasPermission(ctx, 'can_fill_post_agenda') && EDITABLE_STAGES.includes(opp.pipeline_stage || '') && isOwnOpp)
  // Pagos: admin cualquier venta; otros solo las de su closer.
  const canCreatePayment = userIsAdmin || (hasPermission(ctx, 'can_create_payment') && isOwnOpp)
  const canEditPayment = userIsAdmin || (hasPermission(ctx, 'can_edit_payment') && isOwnOpp)

  return (
    <div>
      <Header title={`Oportunidad — ${opp.contact_name || 'Sin nombre'}`} />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <OpportunityDetail
          opportunity={opp}
          sales={sales}
          paymentTypes={(paymentTypes || []) as PaymentType[]}
          canFillForm={canFillForm}
          canCreatePayment={canCreatePayment}
          canEditPayment={canEditPayment}
        />
      </div>
    </div>
  )
}
