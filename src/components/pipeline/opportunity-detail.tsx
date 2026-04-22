'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  User, Mail, Phone as PhoneIcon, AtSign, Calendar, Video,
  DollarSign, Check, FileText,
} from 'lucide-react'
import type {
  Opportunity, Sale, PaymentType, Payment,
  EstadoCita, Programa, Situacion, FormaPago,
} from '@/types'
import { PostAgendaForm } from './post-agenda-form'
import { SaleCard } from './sale-card'
import { cn } from '@/lib/utils'

export function OpportunityDetail({
  opportunity,
  sales,
  paymentTypes,
  canFillForm,
  canCreatePayment,
  canEditPayment,
}: {
  opportunity: Opportunity
  sales: Sale[]
  paymentTypes: PaymentType[]
  canFillForm: boolean
  canCreatePayment: boolean
  canEditPayment: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  const stageColor: Record<string, string> = {
    'Agendado (Nuevo)': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    'Agendado (Confirmado)': 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    'Post Llamada': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'ReAgendado': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    'Seguimiento': 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    'Compro': 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    'No Compro': 'bg-red-400/10 text-red-400 border-red-400/20',
    'Cancelado': 'bg-red-400/10 text-red-400 border-red-400/20',
    'No Asistio': 'bg-red-400/10 text-red-400 border-red-400/20',
  }

  const stage = opportunity.pipeline_stage || 'Agendado (Nuevo)'
  const isPostLlamada = stage === 'Post Llamada'

  return (
    <>
      {/* Contact Info Card */}
      <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">
                {opportunity.contact_name || 'Sin nombre'}
              </h2>
              <span className={cn(
                'text-xs font-medium px-3 py-1 rounded-full border',
                stageColor[stage]
              )}>
                {stage}
              </span>
              {opportunity.form_completed && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/20 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Form completado
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-400">
              {opportunity.contact_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {opportunity.contact_email}
                </span>
              )}
              {opportunity.contact_phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="h-3.5 w-3.5" /> {opportunity.contact_phone}
                </span>
              )}
              {opportunity.contact?.ig_username && (
                <span className="flex items-center gap-1 text-indigo-400">
                  <AtSign className="h-3.5 w-3.5" /> @{opportunity.contact.ig_username}
                </span>
              )}
              {opportunity.closer && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {opportunity.closer.name}
                </span>
              )}
            </div>
          </div>

          {canFillForm && (
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-4 py-2 text-white text-sm rounded-lg flex items-center gap-2 ${
                !opportunity.form_completed && isPostLlamada
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <FileText className="h-4 w-4" />
              {showForm
                ? 'Cerrar'
                : opportunity.form_completed || !isPostLlamada
                  ? 'Editar Post-Agenda'
                  : 'Completar Post-Agenda'}
            </button>
          )}
        </div>

        {/* Key data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {opportunity.fecha_llamada && (
            <div className="bg-gray-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Fecha Llamada
              </span>
              <p className="text-sm text-white mt-1">{opportunity.fecha_llamada}</p>
            </div>
          )}
          {opportunity.programa && (
            <div className="bg-gray-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Programa</span>
              <p className="text-sm text-white mt-1">{opportunity.programa}</p>
            </div>
          )}
          {opportunity.situacion && (
            <div className="bg-gray-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Situación</span>
              <p className="text-sm text-white mt-1">{opportunity.situacion}</p>
            </div>
          )}
          {opportunity.volumen_real !== null && opportunity.volumen_real !== undefined && (
            <div className="bg-gray-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Volumen Real
              </span>
              <p className="text-sm text-white mt-1">${Number(opportunity.volumen_real).toLocaleString('es-AR')}</p>
            </div>
          )}
        </div>

        {opportunity.descripcion_llamada && (
          <div className="mt-4 bg-gray-800/30 rounded-xl p-4">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Descripción de Llamada</span>
            <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">{opportunity.descripcion_llamada}</p>
          </div>
        )}

        {/* Links a llamada Fathom */}
        {opportunity.call?.fathom_url && (
          <div className="mt-4">
            <a
              href={opportunity.call.fathom_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm rounded-lg border border-purple-500/20"
            >
              <Video className="h-4 w-4" /> Ver grabación en Fathom
            </a>
          </div>
        )}
      </div>

      {/* Post-Agenda Form */}
      {showForm && canFillForm && (
        <PostAgendaForm
          opportunity={opportunity}
          paymentTypes={paymentTypes}
          existingSale={sales[0] || null}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            router.refresh()
          }}
        />
      )}

      {/* Sales */}
      {sales.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Ventas ({sales.length})
          </h3>
          <div className="space-y-4">
            {sales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                paymentTypes={paymentTypes}
                canCreatePayment={canCreatePayment}
                canEditPayment={canEditPayment}
                onUpdate={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
