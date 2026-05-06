'use client'

import { useState } from 'react'
import type { Opportunity, PaymentType, Sale, EstadoCita, Programa, Situacion, FormaPago } from '@/types'
import { JustificanteUpload } from './justificante-upload'

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
    if (programa === 'LITE') {
      return { showFollowUp: false, showSaleFields: true, showBrokerOnly: true }
    }
    const isPamm = programa === 'PAMM - Manejo de Portafolio'
    return {
      showFollowUp: false,
      showSaleFields: !isPamm,
      showBrokerOnly: isPamm,
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
  existingSale,
  onClose,
  onSaved,
}: {
  opportunity: Opportunity
  paymentTypes: PaymentType[]
  existingSale?: Sale | null
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

  // Sale fields — pre-cargados si hay una sale existente
  const firstPayment = existingSale?.payments?.[0]
  const [formaPago, setFormaPago] = useState<FormaPago | ''>(
    (existingSale?.forma_pago as FormaPago) || (opportunity.legacy_forma_pago as FormaPago) || ''
  )
  // Fallback: si sale no tiene payment_type_id, matchear por legacy_tipo_pago contra el catálogo
  const initialTipoPagoId = (() => {
    if (existingSale?.payment_type_id) return existingSale.payment_type_id
    const legacy = opportunity.legacy_tipo_pago
    if (legacy) {
      const match = paymentTypes.find((pt) => pt.name.toLowerCase() === legacy.toLowerCase())
      if (match) return match.id
    }
    return ''
  })()
  const [tipoPagoId, setTipoPagoId] = useState(initialTipoPagoId)
  const [revenue, setRevenue] = useState(
    existingSale?.revenue?.toString() || opportunity.legacy_revenue?.toString() || ''
  )
  const [cash, setCash] = useState(
    firstPayment?.monto?.toString() || opportunity.legacy_cash?.toString() || ''
  )
  const [depositoBroker, setDepositoBroker] = useState(
    existingSale?.deposito_broker?.toString() || opportunity.legacy_deposito_broker?.toString() || ''
  )
  const [cantidadCuotas, setCantidadCuotas] = useState(
    existingSale?.cantidad_cuotas?.toString() || opportunity.legacy_cantidad_cuotas?.toString() || ''
  )
  const [fechaPago, setFechaPago] = useState(
    firstPayment?.fecha_pago || new Date().toISOString().slice(0, 10)
  )
  const [fechaProximoPago, setFechaProximoPago] = useState(firstPayment?.fecha_proximo_pago || '')
  // Defensive: aceptar tanto array como string legacy
  const initialJustificantes: string[] | null = (() => {
    const v = firstPayment?.justificante_urls
    if (!v) return null
    if (Array.isArray(v)) return v
    if (typeof v === 'string') return [v]
    return null
  })()
  const [justificanteUrls, setJustificanteUrls] = useState<string[] | null>(initialJustificantes)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { showFollowUp, showSaleFields, showBrokerOnly } = getVisibleFields(situacion, programa)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    // --- Lógica Estricta de Validación Frontend ---
    let isCompleted = false
    if (estadoCita === 'No Asistido') {
      isCompleted = true
    } else if (estadoCita && programa && situacion) {
      isCompleted = true

      if (situacion === 'Seguimiento') {
        if (!fechaSeguimiento) isCompleted = false
      }

      const insideSales = ['Adentro en Llamada', 'Adentro en Seguimiento', 'ReCompra'].includes(situacion)
      if (insideSales) {
        if (programa === 'PAMM - Manejo de Portafolio') {
          // PAMM: Solo broker es obligatorio
          if (
            !depositoBroker || Number(depositoBroker) <= 0 || 
            !fechaPago || 
            !justificanteUrls || justificanteUrls.length === 0
          ) {
            isCompleted = false
          }
        } else {
          // Mastermind, Formación, LITE, etc.
          // La venta es obligatoria
          if (
            !formaPago || 
            !tipoPagoId || 
            !fechaPago || 
            !justificanteUrls || justificanteUrls.length === 0 || 
            !revenue || Number(revenue) <= 0 || 
            cash === '' || cash === null
          ) {
            isCompleted = false
          }
          if (formaPago === 'Pago Dividido' && (!cantidadCuotas || Number(cantidadCuotas) <= 0)) {
            isCompleted = false
          }
          // Nota: Para LITE, depositoBroker es opcional, así que no se valida aquí.
        }
      }
    }

    if (!isCompleted) {
      setError('Faltan campos obligatorios para guardar la Post-Agenda en esta etapa. Por favor completá todos los datos de seguimiento/venta.')
      setSaving(false)
      return
    }

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
          fecha_pago: fechaPago,
          fecha_proximo_pago: fechaProximoPago || null,
          justificante_urls: justificanteUrls,
          // Si también se permite broker (LITE), incluirlo
          deposito_broker: (showBrokerOnly && depositoBroker) ? parseFloat(depositoBroker) : 0,
        }
      } else if (showBrokerOnly) {
        body.sale = {
          forma_pago: 'Deposito' as FormaPago,
          payment_type_id: tipoPagoId || null,
          revenue: 0,
          cash: 0,
          deposito_broker: depositoBroker ? parseFloat(depositoBroker) : 0,
          fecha_pago: fechaPago,
          justificante_urls: justificanteUrls,
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
            className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
          />
        </Field>
      </div>

      <Field label="Descripción de Llamada">
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 resize-y"
        />
      </Field>

      {/* Seguimiento */}
      {showFollowUp && (
        <Field label="Fecha Próximo Seguimiento">
          <input
            type="date"
            value={fechaSeguimiento}
            onChange={(e) => setFechaSeguimiento(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
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
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
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
                    className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                  />
                </Field>
                {formaPago !== 'Pago Programado' && (
                  <Field label="Cash (monto ingresado)">
                    <input
                      type="number"
                      value={cash}
                      onChange={(e) => setCash(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
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
                    className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
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
                    className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                  />
                </Field>
              </>
            )}

            <Field label="Fecha de Pago">
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
              />
            </Field>

            <Field label="Justificante (Primer pago)">
              <JustificanteUpload value={justificanteUrls} onChange={setJustificanteUrls} />
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
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
              />
            </Field>
            <Field label="Fecha de Pago">
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50"
              />
            </Field>
            <Field label="Justificante">
              <JustificanteUpload value={justificanteUrls} onChange={setJustificanteUrls} />
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50">
      <option value="">Seleccionar...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}
