'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { EmbedProvider, useIsEmbedded } from '@/components/layout/embed-context'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { cn } from '@/lib/utils'

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const isEmbedded = useIsEmbedded()

  return (
    <div className={cn(
      "min-h-screen bg-gray-950",
      !isEmbedded && "lg:flex"
    )}>
      {!isEmbedded && <Sidebar />}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        !isEmbedded ? "pt-14 lg:pt-0" : "p-0"
      )}>
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
        <SidebarProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </SidebarProvider>
      </EmbedProvider>
    </Suspense>
  )
}
