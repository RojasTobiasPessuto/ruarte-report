'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Phone,
  Users,
  UserCheck,
  Settings,
  Menu,
  X,
  List,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'
import { useEmbedUrl } from './embed-context'
import { useSidebar } from './sidebar-context'

type PermissionKey = keyof Role

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  requiredPermission?: PermissionKey
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredPermission: 'ver_dashboard' },
  { href: '/dashboard/calls', label: 'Llamadas', icon: Phone, requiredPermission: 'ver_llamadas' },
  { href: '/dashboard/pipeline', label: 'Oportunidades', icon: List, requiredPermission: 'ver_oportunidades' },
  { href: '/dashboard/closers', label: 'Closers', icon: Users, requiredPermission: 'ver_closers' },
  { href: '/dashboard/leads', label: 'Leads', icon: UserCheck, requiredPermission: 'ver_leads' },
  { href: '/dashboard/payments', label: 'Ventas', icon: DollarSign, requiredPermission: 'ver_ventas' },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings, requiredPermission: 'ver_configuracion' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false) // Mobile state
  const { isOpen } = useSidebar() // Desktop state
  const [role, setRole] = useState<Role | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const getEmbedUrl = useEmbedUrl()

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        setRole(data.role)
        setIsAdmin(data.is_admin)
      })
      .catch(() => {})
  }, [])

  const filteredNavItems = navItems.filter((item) => {
    if (isAdmin) return true
    if (item.adminOnly) return false
    if (!item.requiredPermission) return true
    if (!role) return false
    const value = role[item.requiredPermission]
    return typeof value === 'boolean' ? value : false
  })

  const handleLogout = async () => {
    const isEmbedded = window.self !== window.top || pathname.includes('embed=true')
    const supabase = createClient()
    await supabase.auth.signOut()
    
    let loginUrl = '/login'
    if (isEmbedded) {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
      loginUrl = `/login?embed=true&returnTo=${returnTo}`
    }
    
    router.push(loginUrl)
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
          'fixed lg:static z-40 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/50 min-h-screen flex flex-col transition-all duration-300 overflow-hidden',
          // Mobile visibility
          open ? 'translate-x-0 w-64' : '-translate-x-full w-64',
          // Desktop visibility controlled by context
          'lg:translate-x-0',
          isOpen ? 'lg:w-64 lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:border-none'
        )}
      >
        <div className="p-6 border-b border-gray-800/50 hidden lg:block w-64">
          <Link href="/dashboard" className="flex items-center group">
            <img src="/logo.png" alt="Ruarte Reports" className="h-10" />
          </Link>
        </div>

        {/* Spacer for mobile header */}
        <div className="h-14 lg:hidden" />

        <nav className="flex-1 p-3 space-y-0.5 w-64">
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
                href={getEmbedUrl(item.href)}
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

        <div className="p-3 border-t border-gray-800/50 w-64">
          <p className="text-[10px] text-gray-600 text-center">
            Ruarte Report v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
