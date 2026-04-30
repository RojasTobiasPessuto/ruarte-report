export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Calendar, User, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExportVentasPDF } from '@/components/pipeline/export-ventas-pdf'
import { VentasFilters } from '@/components/pipeline/ventas-filters'

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; q?: string }>
}) {
  await requirePermission('can_view_all_payments')
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  // Traer todas las Sales con sus pagos y datos de contacto/closer
  const { data: salesRaw } = await supabase
    .from('sales')
    .select(`
      *,
      opportunity:opportunities(id, contact_name, closer:closers(name)),
      payments(*)
    `)
    .order('created_at', { ascending: false })

  // Flatten payments para procesar filtros y KPIs
  let allPayments = (salesRaw || []).flatMap((sale: any) => 
    (sale.payments || []).map((p: any) => ({
      ...p,
      contacto: sale.opportunity?.contact_name,
      closer: sale.opportunity?.closer?.name,
      opportunity_id: sale.opportunity?.id,
      forma_pago: sale.forma_pago,
      concepto: p.nro_cuota === 1 && sale.forma_pago === 'Pago Completo' ? 'Pago Total' : `Cuota #${p.nro_cuota}`
    }))
  )

  // Aplicar Filtros
  if (params.from) {
    allPayments = allPayments.filter(p => (p.fecha_pago || p.created_at) >= params.from!)
  }
  if (params.to) {
    allPayments = allPayments.filter(p => (p.fecha_pago || p.created_at) <= params.to!)
  }
  if (params.q) {
    const q = params.q.toLowerCase()
    allPayments = allPayments.filter(p => 
      p.contacto?.toLowerCase().includes(q) || 
      p.closer?.toLowerCase().includes(q)
    )
  }

  // Ordenar por fecha
  allPayments.sort((a, b) => new Date(b.fecha_pago || b.created_at).getTime() - new Date(a.fecha_pago || a.created_at).getTime())

  // Calcular KPIs basados en los datos filtrados
  const totalCobrado = allPayments.filter(p => p.pagado).reduce((s, p) => s + Number(p.monto), 0)
  const totalPendiente = allPayments.filter(p => !p.pagado).reduce((s, p) => s + Number(p.monto), 0)
  
  // Para el revenue total, sumamos el revenue de las sales que tienen al menos un pago en el rango (o todas si no hay rango)
  const salesIdsInRange = new Set(allPayments.map(p => p.sale_id))
  const filteredSales = (salesRaw || []).filter((s: any) => salesIdsInRange.has(s.id))
  const totalRevenue = filteredSales.reduce((s, x) => s + Number(x.revenue || 0), 0)
  
  const tasaCobro = totalRevenue > 0 ? (totalCobrado / totalRevenue) * 100 : 0

  // Data para PDF
  const pdfData = allPayments.map(p => ({
    fecha: p.fecha_pago || p.created_at,
    contacto: p.contacto,
    closer: p.closer,
    concepto: p.concepto,
    monto: p.monto,
    estado: p.pagado ? 'pagado' : 'pendiente'
  }))

  const pdfStats = { totalRevenue, totalCobrado, totalRestante: totalPendiente }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header title="Control de Ventas" />
      
      <div className="p-4 md:p-8 space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Financiero</h1>
            <p className="text-gray-400 text-sm">Monitoreo de ingresos y recaudación</p>
          </div>
          <ExportVentasPDF data={pdfData} stats={pdfStats} />
        </div>

        {/* Filters */}
        <VentasFilters />

        {/* Financial KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            label="Revenue (Ventas en Rango)" 
            value={`$${totalRevenue.toLocaleString('es-AR')}`} 
            icon={DollarSign} 
            color="text-indigo-400" 
            trend="Total"
            positive
          />
          <KpiCard 
            label="Cashflow (Cobrado)" 
            value={`$${totalCobrado.toLocaleString('es-AR')}`} 
            icon={ArrowUpRight} 
            color="text-emerald-400" 
            trend={`${tasaCobro.toFixed(1)}% tasa`}
            positive
          />
          <KpiCard 
            label="Pendiente de Cobro" 
            value={`$${totalPendiente.toLocaleString('es-AR')}`} 
            icon={ArrowDownRight} 
            color="text-amber-400" 
            trend="En Rango"
            positive={false}
          />
          <KpiCard 
            label="Transacciones" 
            value={allPayments.length.toString()} 
            icon={CreditCard} 
            color="text-purple-400" 
            trend="Volumen"
            positive
          />
        </div>

        {/* Transacciones Recientes (Libro Diario) */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-800/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Libro Diario de Transacciones</h3>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-widest">Movimientos filtrados</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/80">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contacto</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Closer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Concepto</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Monto</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {allPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                      No se encontraron transacciones con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  allPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="h-3.5 w-3.5 text-gray-600" />
                          {p.fecha_pago ? format(new Date(p.fecha_pago), "dd MMM yyyy", { locale: es }) : format(new Date(p.created_at), "dd MMM yyyy", { locale: es })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{p.contacto || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <User className="h-3 w-3 text-gray-600" />
                          {p.closer || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {p.concepto}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-white">
                          ${Number(p.monto).toLocaleString('es-AR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.pagado ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                            <span className="h-1 w-1 rounded-full bg-emerald-400" />
                            Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                            <span className="h-1 w-1 rounded-full bg-amber-400" />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/pipeline/${p.opportunity_id}`}
                          className="p-1.5 hover:bg-white/5 rounded-lg inline-block text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, trend, positive }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className={cn("p-2 rounded-lg bg-gray-950 border border-gray-800 shadow-inner group-hover:border-gray-700 transition-colors", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest",
          positive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        )}>
          {trend}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <p className={cn("text-2xl font-bold tracking-tight", color)}>{value}</p>
      </div>
      
      {/* Decorative background glow */}
      <div className={cn(
        "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-5 rounded-full",
        positive ? "bg-emerald-500" : "bg-indigo-500"
      )} />
    </div>
  )
}
