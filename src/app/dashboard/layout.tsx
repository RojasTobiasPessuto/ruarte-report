'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get('embed') === 'true'

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
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}
