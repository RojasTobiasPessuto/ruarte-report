'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { EmbedProvider, useIsEmbedded } from '@/components/layout/embed-context'

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const isEmbedded = useIsEmbedded()

  return (
    <div className="min-h-screen bg-gray-950 lg:flex">
      {!isEmbedded && <Sidebar />}
      <main className={`flex-1 overflow-auto ${isEmbedded ? '' : 'pt-14 lg:pt-0'}`}>
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <EmbedProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </EmbedProvider>
    </Suspense>
  )
}
