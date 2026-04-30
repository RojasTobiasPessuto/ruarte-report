'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from 'lucide-react'
import { useIsEmbedded } from './embed-context'

export function Header({ title }: { title: string }) {
  const [email, setEmail] = useState<string | null>(null)
  const isEmbedded = useIsEmbedded()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [supabase.auth])

  if (isEmbedded) return null

  return (
    <header className="border-b border-gray-800/50 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between bg-gray-950/50 backdrop-blur-sm sticky top-0 lg:top-auto z-30">
      <h2 className="text-lg md:text-xl font-semibold text-white truncate">{title}</h2>
      {email && (
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <span className="text-xs">{email}</span>
        </div>
      )}
    </header>
  )
}
