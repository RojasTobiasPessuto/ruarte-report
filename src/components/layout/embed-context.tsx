'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

const EmbedContext = createContext<boolean>(false)

export function EmbedProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get('embed') === 'true'

  return (
    <EmbedContext.Provider value={isEmbedded}>
      {children}
    </EmbedContext.Provider>
  )
}

export function useIsEmbedded() {
  return useContext(EmbedContext)
}

export function useEmbedUrl() {
  const isEmbedded = useIsEmbedded()
  return (path: string) => {
    if (!isEmbedded) return path
    const [baseUrl, query] = path.split('?')
    const params = new URLSearchParams(query || '')
    params.set('embed', 'true')
    return `${baseUrl}?${params.toString()}`
  }
}
