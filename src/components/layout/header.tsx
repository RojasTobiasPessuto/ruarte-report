'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, ChevronRight, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useIsEmbedded } from './embed-context'
import { useSidebar } from './sidebar-context'
import { cn } from '@/lib/utils'

export function Header({ title }: { title: string }) {
  const [email, setEmail] = useState<string | null>(null)
  const isEmbedded = useIsEmbedded()
  const { isOpen, toggle } = useSidebar()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className={cn(
      "border-b border-gray-800/50 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between bg-gray-950/50 backdrop-blur-sm sticky top-0 lg:top-auto z-30",
      isEmbedded && "py-2"
    )}>
      <div className="flex items-center gap-3">
        {!isEmbedded && (
          <button
            onClick={toggle}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title={isOpen ? "Ocultar menú" : "Mostrar menú"}
          >
            {isOpen ? <Menu className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <h2 className={cn(
          "text-lg md:text-xl font-semibold text-white truncate",
          isEmbedded && "text-base"
        )}>
          {title}
        </h2>
      </div>
      
      {email && (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <span className="text-xs font-medium hidden sm:inline">{email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  )
}
