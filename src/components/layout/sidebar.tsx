'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import {
  LayoutDashboard,
  Phone,
  Users,
  UserCheck,
  Settings,
  LogOut,
  Upload,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/dashboard/calls', label: 'Llamadas', icon: Phone, adminOnly: false },
  { href: '/dashboard/closers', label: 'Closers', icon: Users, adminOnly: false },
  { href: '/dashboard/leads', label: 'Leads', icon: UserCheck, adminOnly: true },
  { href: '/dashboard/import', label: 'Importar', icon: Upload, adminOnly: true },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings, adminOnly: false },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useState(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('app_users').select('role').eq('id', data.user.id).single().then(({ data: appUser }) => {
          setIsAdmin(appUser?.role === 'admin')
        })
      }
    })
  })

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-gray-800/50 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Ruarte Reports" className="h-8" />
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="text-gray-400 hover:text-white p-1"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static z-40 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/50 min-h-screen flex flex-col transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-gray-800/50 hidden lg:block">
          <Link href="/dashboard" className="flex items-center group">
            <img src="/logo.png" alt="Ruarte Reports" className="h-10" />
          </Link>
        </div>

        {/* Spacer for mobile header */}
        <div className="h-14 lg:hidden" />

        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-4 pt-3 pb-2">
            Menu
          </p>
          {filteredNavItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-indigo-400 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px]', isActive && 'text-indigo-400')} />
                {item.label}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-800/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 w-full"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
