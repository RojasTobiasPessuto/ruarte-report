export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { Wallet, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function PaymentsPage() {
  await requirePermission('can_view_all_payments')
  const supabase = await createServerSupabaseClient()

  // Sales with their payments and opportunity
  const { data: salesRaw } = await supabase
    .from('sales')
    .select(`
      *,
      opportunity:opportunities(id, contact_name, pipeline_stage, closer:closers(name)),
      payments(*)
    `)
    .order('created_at', { ascending: false })

  const sales = (salesRaw || []).map((sale: any) => {
    const paid = (sale.payments || []).filter((p: any) => p.pagado).reduce((s: number, p: any) => s + Number(p.monto), 0)
    const restante = Number(sale.revenue) - paid
    return { ...sale, totalPagado: paid, montoRestante: restante }
  })

  const pendientes = sales.filter((s) => s.montoRestante > 0 && !s.completada)
  const completadas = sales.filter((s) => s.completada || s.montoRestante <= 0)

  const totalRevenue = sales.reduce((s, x) => s + Number(x.revenue || 0), 0)
  const totalCobrado = sales.reduce((s, x) => s + Number(x.totalPagado || 0), 0)
  const totalRestante = sales.reduce((s, x) => s + Math.max(0, Number(x.montoRestante || 0)), 0)

  return (
    <div>
      <Header title="Pagos" />
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Total Revenue" value={`$${totalRevenue.toLocaleString('es-AR')}`} color="text-white" icon={Wallet} iconColor="text-indigo-400" />
          <StatCard label="Cobrado" value={`$${totalCobrado.toLocaleString('es-AR')}`} color="text-green-400" icon={CheckCircle} iconColor="text-green-400" />
          <StatCard label="Restante" value={`$${totalRestante.toLocaleString('es-AR')}`} color="text-amber-400" icon={AlertCircle} iconColor="text-amber-400" />
          <StatCard label="Ventas" value={`${completadas.length}/${sales.length}`} color="text-purple-400" icon={CheckCircle} iconColor="text-purple-400" />
        </div>

        {/* Pendientes */}
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            Pagos Pendientes ({pendientes.length})
          </h3>
          {pendientes.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay pagos pendientes</p>
          ) : (
            <div className="space-y-2">
              {pendientes.map((sale: any) => (
                <SaleRow key={sale.id} sale={sale} pending />
              ))}
            </div>
          )}
        </div>

        {/* Completadas */}
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Ventas Completadas ({completadas.length})
          </h3>
          {completadas.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay ventas completadas</p>
          ) : (
            <div className="space-y-2">
              {completadas.map((sale: any) => (
                <SaleRow key={sale.id} sale={sale} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon: Icon, iconColor }: { label: string; value: string; color: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <p className={cn('text-xl font-bold', color)}>{value}</p>
    </div>
  )
}

function SaleRow({ sale, pending }: { sale: any; pending?: boolean }) {
  return (
    <Link
      href={`/dashboard/pipeline/${sale.opportunity?.id}`}
      className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-800/40 hover:bg-gray-800/70 rounded-lg transition-colors"
    >
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-medium text-white">{sale.opportunity?.contact_name || '—'}</p>
        <p className="text-xs text-gray-500">
          {sale.opportunity?.closer?.name || 'Sin closer'} · {sale.forma_pago} · {format(new Date(sale.created_at), "d MMM yyyy", { locale: es })}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-white">${Number(sale.revenue).toLocaleString('es-AR')}</p>
        {pending ? (
          <p className="text-xs text-amber-400">Restante: ${Number(sale.montoRestante).toLocaleString('es-AR')}</p>
        ) : (
          <p className="text-xs text-green-400">Completada</p>
        )}
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
    </Link>
  )
}
