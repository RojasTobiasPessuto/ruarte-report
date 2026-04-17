'use client'

import { useState } from 'react'
import type { Opportunity, PaymentType, EstadoCita, Programa, Situacion, FormaPago } from '@/types'

const ESTADO_CITA_OPTIONS: EstadoCita[] = ['Nueva', 'Confirmada', 'Cancelada', 'Asistido', 'No Asistido']
const PROGRAMA_OPTIONS: Programa[] = ['Mastermind', 'Formación', 'Programa PLUS', 'LITE', 'PAMM - Manejo de Portafolio', 'No Califica']
const SITUACION_OPTIONS: Situacion[] = ['Adentro en Llamada', 'Adentro en Seguimiento', 'Seguimiento', 'Perdido', 'ReCompra']
const FORMA_PAGO_OPTIONS: FormaPago[] = ['Fee', 'Pago Completo', 'Pago Dividido', 'Pago Programado', 'Deposito']

/**
 * Lógica de visibilidad según reglas del plan.
 */
function getVisibleFields(situacion: Situacion | '', programa: Programa | '') {
  // Base: solo campos siempre visibles
  if (!situacion || situacion === 'Perdido') {
    return { showFollowUp: false, showSaleFields: false, showBrokerOnly: false }
  }
  if (situacion === 'Seguimiento') {
    return { showFollowUp: true, showSaleFields: false, showBrokerOnly: false }
  }
  // Adentro en Llamada / Adentro en Seguimiento / ReCompra
  const insideSales = ['Adentro en Llamada', 'Adentro en Seguimiento', 'ReCompra'].includes(situacion)
  if (insideSales) {
    const isLiteOrPamm = programa === 'LITE' || programa === 'PAMM - Manejo de Portafolio'
    return {
      showFollowUp: false,
      showSaleFields: !isLiteOrPamm,
      showBrokerOnly: isLiteOrPamm,
    }
  }
  return { showFollowUp: false, showSaleFields: false, showBrokerOnly: false }
}

function showCuotas(formaPago: FormaPago | '') {
  return formaPago === 'Pago Dividido' || formaPago === 'Fee'
}

function showRevenueCash(formaPago: FormaPago | '') {
  return formaPago === 'Pago Completo' || formaPago === 'Pago Dividido' || formaPago === 'Fee' || formaPago === 'Pago Programado'
}

export function PostAgendaForm({
  opportunity,
  paymentTypes,
  onClose,
  onSaved,
}: {
  opportunity: Opportunity
  paymentTypes: PaymentType[]
  onClose: () => void
  onSaved: () => void
}) {
  const [estadoCita, setEstadoCita] = useState<EstadoCita | ''>((opportunity.estado_cita as EstadoCita) || '')
  const [programa, setPrograma] = useState<Programa | ''>((opportunity.programa as Programa) || '')
  const [situacion, setSituacion] = useState<Situacion | ''>((opportunity.situacion as Situacion) || '')
  const [descripcion, setDescripcion] = useState(opportunity.descripcion_llamada || '')
  const [volumenReal, setVolumenReal] = useState(opportunity.volumen_real?.toString() || '')
  const [fechaSeguimiento, setFechaSeguimiento] = useState(
    opportunity.fecha_seguimiento ? opportunity.fecha_seguimiento.slice(0, 10) : ''
  )

  // Sale fields
  const [formaPago, setFormaPago] = useState<FormaPago | ''>('')
  const [tipoPagoId, setTipoPagoId] = useState('')
  const [revenue, setRevenue] = useState('')
  const [cash, setCash] = useState('')
  const [depositoBroker, setDepositoBroker] = useState('')
  const [cantidadCuotas, setCantidadCuotas] = useState('')
  const [fechaProximoPago, setFechaProximoPago] = useState('')
  const [codigoTransaccion, setCodigoTransaccion] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { showFollowUp, showSaleFields, showBrokerOnly } = getVisibleFields(situacion, programa)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        estado_cita: estadoCita,
        programa,
        situacion,
        descripcion_llamada: descripcion,
        volumen_real: volumenReal ? parseFloat(volumenReal) : null,
        fecha_seguimiento: showFollowUp && fechaSeguimiento ? fechaSeguimiento : null,
      }

      // Si hay venta, agregar datos de venta
      if (showSaleFields && formaPago) {
        body.sale = {
          forma_pago: formaPago,
          payment_type_id: tipoPagoId || null,
          revenue: revenue ? parseFloat(revenue) : 0,
          cash: cash ? parseFloat(cash) : 0,
          cantidad_cuotas: cantidadCuotas ? parseInt(cantidadCuotas) : 0,
          fecha_proximo_pago: fechaProximoPago || null,
          codigo_transaccion: codigoTransaccion || null,
        }
      } else if (showBrokerOnly) {
        body.sale = {
          forma_pago: 'Deposito' as FormaPago,
          payment_type_id: tipoPagoId || null,
          revenue: 0,
          cash: 0,
          deposito_broker: depositoBroker ? parseFloat(depositoBroker) : 0,
        }
      }

      const res = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al guardar')
        setSaving(false)
        return
      }

      onSaved()
    } catch {
      setError('Error de conexión')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6 space-y-5">
      <h3 className="text-lg font-semibold text-white">Formulario Post-Agenda</h3>

      {/* Campos siempre visibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Estado de la Cita">
          <Select value={estadoCita} onChange={(v) => setEstadoCita(v as EstadoCita | '')} options={ESTADO_CITA_OPTIONS} />
        </Field>
        <Field label="Programa">
          <Select value={programa} onChange={(v) => setPrograma(v as Programa | '')} options={PROGRAMA_OPTIONS} />
        </Field>
        <Field label="Situación">
          <Select value={situacion} onChange={(v) => setSituacion(v as Situacion | '')} options={SITUACION_OPTIONS} />
        </Field>
        <Field label="Volumen Real">
          <input
            type="number"
            value={volumenReal}
            onChange={(e) => setVolumenReal(e.target.value)}
            placeholder="0"
            className="input"
          />
        </Field>
      </div>

      <Field label="Descripción de Llamada">
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="input w-full"
        />
      </Field>

      {/* Seguimiento */}
      {showFollowUp && (
        <Field label="Fecha Próximo Seguimiento">
          <input
            type="date"
            value={fechaSeguimiento}
            onChange={(e) => setFechaSeguimiento(e.target.value)}
            className="input"
          />
        </Field>
      )}

      {/* Sale fields (programas normales) */}
      {showSaleFields && (
        <div className="border border-gray-800 rounded-xl p-4 space-y-4 bg-gray-800/30">
          <h4 className="text-sm font-semibold text-white">Datos de Venta</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Forma de Pago">
              <Select value={formaPago} onChange={(v) => {
                setFormaPago(v as FormaPago | '')
                // Auto-completar cash si es Pago Completo
                if (v === 'Pago Completo' && revenue) setCash(revenue)
              }} options={FORMA_PAGO_OPTIONS} />
            </Field>
            <Field label="Tipo de Pago">
              <select
                value={tipoPagoId}
                onChange={(e) => setTipoPagoId(e.target.value)}
                className="input"
              >
                <option value="">Seleccionar...</option>
                {paymentTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </Field>

            {showRevenueCash(formaPago) && (
              <>
                <Field label="Revenue (total)">
                  <input
                    type="number"
                    value={revenue}
                    onChange={(e) => {
                      setRevenue(e.target.value)
                      if (formaPago === 'Pago Completo') setCash(e.target.value)
                    }}
                    placeholder="0"
                    className="input"
                  />
                </Field>
                {formaPago !== 'Pago Programado' && (
                  <Field label="Cash (monto ingresado)">
                    <input
                      type="number"
                      value={cash}
                      onChange={(e) => setCash(e.target.value)}
                      placeholder="0"
                      className="input"
                      readOnly={formaPago === 'Pago Completo'}
                    />
                  </Field>
                )}
              </>
            )}

            {showCuotas(formaPago) && (
              <>
                <Field label="Cantidad de Cuotas">
                  <select
                    value={cantidadCuotas}
                    onChange={(e) => setCantidadCuotas(e.target.value)}
                    className="input"
                  >
                    <option value="">Seleccionar...</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha Próximo Pago">
                  <input
                    type="date"
                    value={fechaProximoPago}
                    onChange={(e) => setFechaProximoPago(e.target.value)}
                    className="input"
                  />
                </Field>
              </>
            )}

            <Field label="Código Transacción">
              <input
                type="text"
                value={codigoTransaccion}
                onChange={(e) => setCodigoTransaccion(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Broker only (LITE / PAMM) */}
      {showBrokerOnly && (
        <div className="border border-gray-800 rounded-xl p-4 space-y-4 bg-gray-800/30">
          <h4 className="text-sm font-semibold text-white">Depósito en Broker</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Depósito en Broker">
              <input
                type="number"
                value={depositoBroker}
                onChange={(e) => setDepositoBroker(e.target.value)}
                placeholder="0"
                className="input"
              />
            </Field>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg"
        >
          {saving ? 'Guardando...' : 'Guardar Post-Agenda'}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: rgba(17, 24, 39, 0.8);
          border: 1px solid rgba(55, 65, 81, 0.5);
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
      `}</style>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">Seleccionar...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}
