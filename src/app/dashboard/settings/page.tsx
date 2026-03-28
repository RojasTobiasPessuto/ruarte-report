'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Plus, Trash2, UserPlus, Users, Shield } from 'lucide-react'
import type { Closer, AppUser } from '@/types'

export default function SettingsPage() {
  const [closers, setClosers] = useState<Closer[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [newCloserName, setNewCloserName] = useState('')
  const [newCloserEmail, setNewCloserEmail] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer'>('viewer')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: appUser } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single()

    setIsAdmin(appUser?.role === 'admin')

    const { data: closersData } = await supabase
      .from('closers')
      .select('*')
      .order('name')

    setClosers(closersData || [])

    if (appUser?.role === 'admin') {
      const { data: usersData } = await supabase
        .from('app_users')
        .select('*')
        .order('email')

      setUsers(usersData || [])
    }
  }

  async function addCloser(e: React.FormEvent) {
    e.preventDefault()
    if (!newCloserName.trim()) return

    setLoading(true)
    const { error } = await supabase.from('closers').insert({
      name: newCloserName.trim(),
      email: newCloserEmail.trim() || null,
    })

    if (error) {
      setMessage('Error al agregar closer')
    } else {
      setMessage('Closer agregado')
      setNewCloserName('')
      setNewCloserEmail('')
      loadData()
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function toggleCloser(id: string, active: boolean) {
    await supabase.from('closers').update({ active: !active }).eq('id', id)
    loadData()
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserEmail.trim() || !newUserPassword.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          role: newUserRole,
        }),
      })

      if (response.ok) {
        setMessage('Usuario creado')
        setNewUserEmail('')
        setNewUserPassword('')
        loadData()
      } else {
        const data = await response.json()
        setMessage(data.error || 'Error al crear usuario')
      }
    } catch {
      setMessage('Error de conexión')
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div>
      <Header title="Configuración" />
      <div className="p-8 space-y-8">
        {message && (
          <div className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        {/* Closers */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Gestión de Closers</h3>
          </div>

          <form onSubmit={addCloser} className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={newCloserName}
              onChange={(e) => setNewCloserName(e.target.value)}
              placeholder="Nombre del closer"
              className="flex-1 min-w-[200px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="email"
              value={newCloserEmail}
              onChange={(e) => setNewCloserEmail(e.target.value)}
              placeholder="Email (opcional)"
              className="flex-1 min-w-[200px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </form>

          <div className="space-y-2">
            {closers.map((closer) => (
              <div
                key={closer.id}
                className="flex items-center justify-between px-4 py-3 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${closer.active ? 'bg-green-400' : 'bg-gray-500'}`}
                  />
                  <span className="text-sm text-white">{closer.name}</span>
                  {closer.email && (
                    <span className="text-xs text-gray-500">{closer.email}</span>
                  )}
                </div>
                <button
                  onClick={() => toggleCloser(closer.id, closer.active)}
                  className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 rounded"
                >
                  {closer.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
            {closers.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No hay closers</p>
            )}
          </div>
        </div>

        {/* Users (admin only) */}
        {isAdmin && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Gestión de Usuarios</h3>
            </div>

            <form onSubmit={createUser} className="flex flex-wrap gap-3 mb-6">
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email"
                className="flex-1 min-w-[180px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Contraseña"
                className="flex-1 min-w-[150px] px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'viewer')}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Crear
              </button>
            </form>

            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white">{user.email}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                          ? 'bg-indigo-400/10 text-indigo-400'
                          : 'bg-gray-400/10 text-gray-400'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
