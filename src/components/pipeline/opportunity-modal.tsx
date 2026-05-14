'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { OpportunityDetail } from './opportunity-detail'
import type { Opportunity, Sale, PaymentType, Closer } from '@/types'

interface OpportunityModalProps {
  opportunityId: string
  onClose: () => void
  onUpdate?: () => void
  isAdmin: boolean
  canFillForm: boolean
  canCreatePayment: boolean
  canEditPayment: boolean
  canChangeOwner: boolean
}

export function OpportunityModal({
  opportunityId,
  onClose,
  onUpdate,
  isAdmin,
  canFillForm,
  canCreatePayment,
  canEditPayment,
  canChangeOwner,
}: OpportunityModalProps) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [closers, setClosers] = useState<Closer[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true)
      const res = await fetch(`/api/opportunities/${opportunityId}`)
      if (!res.ok) throw new Error('Error al cargar la oportunidad')
      const data = await res.json()

      setOpportunity(data.opportunity)
      setSales(data.sales || [])
      setPaymentTypes(data.paymentTypes || [])
      setClosers(data.closers || [])
    } catch (error) {
      console.error(error)
      if (showSpinner) {
        alert('Error al cargar los datos')
        onClose()
      }
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    loadData(true)

    // Lock scroll
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId])

  // Re-fetch los datos sin remontar el modal (usado después de guardar form/pago)
  async function refresh() {
    await loadData(false)
    if (onUpdate) onUpdate()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-gray-950 border border-gray-800 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {loading ? 'Cargando...' : `Oportunidad: ${opportunity?.contact_name || 'Sin nombre'}`}
            </h3>
            {!loading && (
              <p className="text-xs text-gray-500 mt-0.5">ID: {opportunityId}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm">Obteniendo detalles de la oportunidad...</p>
            </div>
          ) : opportunity ? (
            <div className="space-y-6">
              <OpportunityDetail
                opportunity={opportunity}
                sales={sales}
                paymentTypes={paymentTypes}
                closers={closers}
                canFillForm={canFillForm}
                canCreatePayment={canCreatePayment}
                canEditPayment={canEditPayment}
                canChangeOwner={canChangeOwner}
                isAdmin={isAdmin}
                onRefresh={refresh}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Overlay click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
