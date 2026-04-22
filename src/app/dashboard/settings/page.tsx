'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Plus, Trash2, UserPlus, Users, Shield, RefreshCw, Play, Database } from 'lucide-react'
import type { Closer, AppUser, Role } from '@/types'

export default function SettingsPage() {
  const [closers, setClosers] = useState<Closer[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [newCloserName, setNewCloserName] = useState('')
  const [newCloserEmail, setNewCloserEmail] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer'>('viewer')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [syncStatus, setSyncStatus] = useState<{
    cursor: string | null
    current_stage: string
    total_processed_cycle: number
    last_completed_at: string | null
    total_opportunities_in_db: number
  } | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (isAdmin) loadSyncStatus()
  }, [isAdmin])

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

      const { data: rolesData } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      setRoles(rolesData || [])
    }
  }

  async function backfillSales() {
    if (!confirm('¿Crear Sales+Payments desde los datos legacy de oportunidades en Compro? Solo procesa las que aún no tienen Sales.')) return
    setSyncLoading(true)
    setMessage('Procesando backfill...')
    const res = await fetch('/api/admin/backfill-sales', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      const errInfo = data.error_samples ? ` · Errores: ${data.error_samples.join(' | ')}` : ''
      setMessage(`Backfill: ${data.sales_created} ventas, ${data.payments_created} pagos creados de ${data.total_opportunities_in_compro} en Compro (${data.skipped} omitidas)${errInfo}`)
    } else {
      setMessage(data.error || 'Error')
    }
    setSyncLoading(false)
    setTimeout(() => setMessage(''), 10000)
  }

  async function loadSyncStatus() {
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    })
    if (res.ok) {
      const data = await res.json()
      setSyncStatus(data)
    }
  }

  async function resetSync() {
    if (!confirm('¿Resetear cursor? El próximo cron arrancará desde la primera etapa.')) return
    setSyncLoading(true)
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    })
    const data = await res.json()
    setMessage(data.message || 'Cursor reseteado')
    setSyncLoading(false)
    loadSyncStatus()
    setTimeout(() => setMessage(''), 3000)
  }

  async function runSync() {
    setSyncLoading(true)
    setMessage('Ejecutando sync (puede tardar hasta 40s)...')
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run' }),
    })
    const data = await res.json()
    if (res.ok) {
      const errorsInfo = data.total_errors > 0
        ? ` · ${data.total_errors} ERRORES${data.last_result?.error_samples ? ': ' + data.last_result.error_samples.join(' | ') : ''}`
        : ''
      const orphansInfo = data.last_result?.orphans_cleaned ? ` · ${data.last_result.orphans_cleaned} huérfanas eliminadas` : ''
      const lastMsg = data.last_result?.message ? ` · ${data.last_result.message}` : ''
      setMessage(
        `Sync: +${data.total_created || 0} creadas, ${data.total_updated || 0} actualizadas, ${data.total_processed || 0} procesadas${orphansInfo}${errorsInfo}${lastMsg}`
      )
    } else {
      setMessage(data.error || 'Error')
    }
    setSyncLoading(false)
    loadSyncStatus()
    setTimeout(() => setMessage(''), 8000)
  }

  async function updateUser(userId: string, updates: { role_id?: string | null; closer_id?: string | null }) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      setMessage('Usuario actualizado')
      loadData()
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error || 'Error al actualizar')
    }
    setTimeout(() => setMessage(''), 3000)
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

  async function deleteItem(type: 'closer' | 'user', id: string) {
    const label = type === 'closer' ? 'closer' : 'usuario'
    if (!confirm(`¿Estás seguro de eliminar este ${label}? Esta acción no se puede deshacer.`)) return

    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })

      if (response.ok) {
        setMessage(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminado`)
        loadData()
      } else {
        const data = await response.json()
        setMessage(data.error || `Error al eliminar ${label}`)
      }
    } catch {
      setMessage('Error de conexión')
    }
    setTimeout(() => setMessage(''), 3000)
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
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCloser(closer.id, closer.active)}
                    className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 rounded"
                  >
                    {closer.active ? 'Desactivar' : 'Activar'}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => deleteItem('closer', closer.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors p-1 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {closers.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No hay closers</p>
            )}
          </div>
        </div>

        {/* Sync GHL (admin only) */}
        {isAdmin && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="h-5 w-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Sincronización GHL</h3>
            </div>

            {syncStatus && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Total en DB</p>
                  <p className="text-lg font-bold text-indigo-400 mt-1">{syncStatus.total_opportunities_in_db}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Etapa actual</p>
                  <p className="text-sm text-white mt-1">{syncStatus.current_stage}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Procesadas (ciclo)</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">{syncStatus.total_processed_cycle}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Último ciclo</p>
                  <p className="text-xs text-white mt-1">
                    {syncStatus.last_completed_at
                      ? new Date(syncStatus.last_completed_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                      : 'Nunca'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={runSync}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                <Play className="h-4 w-4" />
                Ejecutar sync ahora
              </button>
              <button
                onClick={resetSync}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 text-sm rounded-lg border border-red-500/20"
              >
                <RefreshCw className="h-4 w-4" />
                Resetear cursor
              </button>
              <button
                onClick={loadSyncStatus}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                <RefreshCw className="h-4 w-4" />
                Refrescar estado
              </button>
              <button
                onClick={backfillSales}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 disabled:opacity-50 text-emerald-400 text-sm rounded-lg border border-emerald-500/20"
              >
                <Database className="h-4 w-4" />
                Backfill ventas legacy
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              El cron se ejecuta automáticamente cada 2 min. Cada ejecución procesa 25 oportunidades del pipeline Agendas.
            </p>
          </div>
        )}

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
              {users.map((user) => {
                const currentRole = roles.find((r) => r.id === user.role_id)
                const currentCloser = closers.find((c) => c.id === user.closer_id)
                const roleColors: Record<string, string> = {
                  admin: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
                  manager: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
                  closer: 'bg-green-400/10 text-green-400 border-green-400/20',
                  setter: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
                }
                const roleBadge = currentRole?.name
                  ? roleColors[currentRole.name] || 'bg-gray-400/10 text-gray-400'
                  : 'bg-gray-400/10 text-gray-400'

                return (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-sm text-white">{user.email}</p>
                      {currentRole && (
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border ${roleBadge}`}>
                          {currentRole.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest">Role</label>
                      <select
                        value={user.role_id || ''}
                        onChange={(e) => updateUser(user.id, { role_id: e.target.value || null })}
                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      >
                        <option value="">Sin rol</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest">Closer</label>
                      <select
                        value={user.closer_id || ''}
                        onChange={(e) => updateUser(user.id, { closer_id: e.target.value || null })}
                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      >
                        <option value="">Ninguno</option>
                        {closers.filter((c) => c.active).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => deleteItem('user', user.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors p-1 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
