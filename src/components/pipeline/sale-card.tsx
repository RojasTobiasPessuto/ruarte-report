'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Check, Trash2, Calendar, FileText } from 'lucide-react'
import type { Sale, PaymentType, Payment } from '@/types'
import { cn } from '@/lib/utils'
import { JustificanteUpload } from './justificante-upload'

export function SaleCard({
  sale,
  paymentTypes,
  canCreatePayment,
  canEditPayment,
  onUpdate,
}: {
  sale: Sale
  paymentTypes: PaymentType[]
  canCreatePayment: boolean
  canEditPayment: boolean
  onUpdate: () => void
}) {
  const [showAddPayment, setShowAddPayment] = useState(false)
  const payments = (sale.payments || []) as Payment[]
  const sortedPayments = [...payments].sort((a, b) => a.nro_cuota - b.nro_cuota)

  const totalPagado = payments.filter((p) => p.pagado).reduce((s, p) => s + Number(p.monto), 0)
  const montoRestante = sale.monto_restante ?? Number(sale.revenue) - totalPagado

  return (
    <div className="border border-gray-800 rounded-xl p-4 bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white">
              {sale.forma_pago || 'Sin forma de pago'}
            </h4>
            {sale.completada && (
              <span className="text-[10px] bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-2.5 w-2.5" /> Completada
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Creada: {format(new Date(sale.created_at), "d MMM yyyy", { locale: es })}
          </p>
        </div>

        {canCreatePayment && !sale.completada && sale.forma_pago !== 'Deposito' && (
          <button
            onClick={() => setShowAddPayment(!showAddPayment)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs rounded-lg border border-indigo-500/20"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar cuota
          </button>
        )}
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <NumberBox label="Revenue" value={sale.revenue} accent="text-white" />
        <NumberBox label="Pagado" value={totalPagado} accent="text-green-400" />
        <NumberBox label="Restante" value={montoRestante} accent={montoRestante > 0 ? 'text-amber-400' : 'text-gray-500'} />
        <NumberBox label="Cuotas" value={`${payments.filter(p => p.pagado).length}/${sale.cantidad_cuotas || '-'}`} accent="text-indigo-400" plain />
      </div>

      {sale.deposito_broker > 0 && (
        <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <span className="text-xs text-purple-400">Depósito en Broker: </span>
          <span className="text-sm font-semibold text-white">${Number(sale.deposito_broker).toLocaleString()}</span>
        </div>
      )}

      {/* Payments list */}
      {sortedPayments.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Historial de cuotas</p>
          {sortedPayments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              canEdit={canEditPayment}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {/* Add payment form */}
      {showAddPayment && (
        <AddPaymentForm
          saleId={sale.id}
          nextCuota={payments.length + 1}
          onClose={() => setShowAddPayment(false)}
          onSaved={() => {
            setShowAddPayment(false)
            onUpdate()
          }}
        />
      )}
    </div>
  )
}

function NumberBox({ label, value, accent, plain }: { label: string; value: number | string; accent: string; plain?: boolean }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
      <p className={cn('text-sm font-semibold mt-0.5', accent)}>
        {plain ? value : `$${Number(value).toLocaleString()}`}
      </p>
    </div>
  )
}

function PaymentRow({ payment, canEdit, onUpdate }: { payment: Payment; canEdit: boolean; onUpdate: () => void }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`¿Eliminar cuota #${payment.nro_cuota}?`)) return
    setDeleting(true)
    const res = await fetch(`/api/payments/${payment.id}`, { method: 'DELETE' })
    if (res.ok) onUpdate()
    else {
      alert('Error al eliminar')
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-800/40 rounded-lg text-xs">
      <span className="text-gray-500 w-8">#{payment.nro_cuota}</span>
      <span className={cn('flex-1 font-medium', payment.pagado ? 'text-green-400' : 'text-gray-400')}>
        ${Number(payment.monto).toLocaleString()}
      </span>
      {payment.fecha_pago && (
        <span className="text-gray-500 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(payment.fecha_pago), "d MMM", { locale: es })}
        </span>
      )}
      {payment.justificante_url && (
        <a
          href={payment.justificante_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300"
          title="Ver justificante"
        >
          <FileText className="h-3.5 w-3.5" />
        </a>
      )}
      {payment.pagado ? (
        <span className="text-[10px] bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full">Pagado</span>
      ) : (
        <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full">Pendiente</span>
      )}
      {canEdit && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function AddPaymentForm({ saleId, nextCuota, onClose, onSaved }: {
  saleId: string
  nextCuota: number
  onClose: () => void
  onSaved: () => void
}) {
  const [monto, setMonto] = useState('')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [fechaProxPago, setFechaProxPago] = useState('')
  const [justificanteUrl, setJustificanteUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch(`/api/sales/${saleId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto: parseFloat(monto),
        fecha_pago: fechaPago,
        fecha_proximo_pago: fechaProxPago || null,
        nro_cuota: nextCuota,
        justificante_url: justificanteUrl,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Error al agregar pago')
      setSaving(false)
      return
    }

    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-gray-800/60 border border-indigo-500/20 rounded-lg space-y-3">
      <p className="text-xs font-semibold text-indigo-400">Nueva cuota #{nextCuota}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto"
          required
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
        />
        <input
          type="date"
          value={fechaPago}
          onChange={(e) => setFechaPago(e.target.value)}
          required
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
        />
        <input
          type="date"
          value={fechaProxPago}
          onChange={(e) => setFechaProxPago(e.target.value)}
          placeholder="Próximo pago"
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white"
        />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Justificante</label>
        <JustificanteUpload value={justificanteUrl} onChange={setJustificanteUrl} compact />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs rounded"
        >
          {saving ? 'Guardando...' : 'Guardar cuota'}
        </button>
      </div>
    </form>
  )
}
