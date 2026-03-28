'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from 'lucide-react'

export function Header({ title }: { title: string }) {
  const [email, setEmail] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [supabase.auth])

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-8 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {email && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <User className="h-4 w-4" />
          {email}
        </div>
      )}
    </header>
  )
}
