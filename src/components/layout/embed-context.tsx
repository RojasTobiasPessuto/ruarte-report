'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const EmbedContext = createContext<boolean>(false)

export function EmbedProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const urlEmbedded = searchParams.get('embed') === 'true'
  
  const [isEmbedded, setIsEmbedded] = useState(urlEmbedded)

  useEffect(() => {
    // Bulletproof check: If we are inside an iframe, always activate embed mode
    const inIframe = window.self !== window.top
    if (inIframe || urlEmbedded) {
      setIsEmbedded(true)
    }
  }, [urlEmbedded])

  return (
    <EmbedContext.Provider value={isEmbedded || urlEmbedded}>
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
