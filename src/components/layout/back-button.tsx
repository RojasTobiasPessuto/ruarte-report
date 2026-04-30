'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useIsEmbedded } from '@/components/layout/embed-context'

export function BackButton({ 
  fallbackPath = '/dashboard',
  label = 'Volver'
}: { 
  fallbackPath?: string
  label?: string
}) {
  const router = useRouter()
  const isEmbedded = useIsEmbedded()

  const handleBack = () => {
    // Si podemos ir atrás en el historial, vamos
    if (window.history.length > 1) {
      router.back()
    } else {
      // Si no, vamos al fallback con el parámetro embed si corresponde
      const target = isEmbedded 
        ? `${fallbackPath}${fallbackPath.includes('?') ? '&' : '?'}embed=true`
        : fallbackPath
      router.push(target)
    }
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors mb-4 group"
    >
      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  )
}
