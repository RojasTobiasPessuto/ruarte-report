'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { TrendingUp, Phone, Zap } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get('embed') === 'true'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Credenciales inválidas. Verificá tu email y contraseña.')
      setLoading(false)
      return
    }

    const redirectPath = isEmbedded ? '/dashboard?embed=true' : '/dashboard'
    router.push(redirectPath)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Left side - Branding (hidden on mobile or embedded) */}
      {!isEmbedded && (
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative z-10">
          <div className="max-w-lg animate-fade-in-up">
            <div className="mb-8">
              <img src="/logo.png" alt="Ruarte Reports" className="h-14" />
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight mb-6">
              Transformá cada llamada en
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> inteligencia de ventas</span>
            </h2>

            <p className="text-lg text-gray-400 mb-10 leading-relaxed">
              Análisis automático de tus llamadas con IA. Métricas de sentimiento,
              objeciones, calidad y recomendaciones de mejora para cada closer.
            </p>

            <div className="space-y-4">
              {[
                { icon: Phone, text: 'Grabación y análisis automático de llamadas' },
                { icon: TrendingUp, text: 'Métricas de cierre, sentimiento y calidad' },
                { icon: Zap, text: 'Recomendaciones de mejora por IA en tiempo real' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-gray-300 animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + i * 0.15}s` }}
                >
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {/* Mobile logo or Embedded logo */}
          <div className={`${!isEmbedded ? 'lg:hidden' : ''} text-center mb-8`}>
            <img src="/logo.png" alt="Ruarte Reports" className="h-12 mx-auto" />
          </div>

          <div className="glass rounded-2xl border border-gray-800/50 p-8 shadow-2xl shadow-black/20">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">Iniciar sesión</h3>
              <p className="text-sm text-gray-400 mt-1">Ingresá tus credenciales para acceder</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-600 mt-6">
            Ruarte Report &middot; Call Analytics Platform
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <LoginForm />
    </Suspense>
  )
}
