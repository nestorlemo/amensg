'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setLoading(true)
    setError(null)

    const result = await requestJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
      }),
    }, 'No se pudo iniciar sesión.')

    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(safeNext(next))
    router.refresh()
    setLoading(false)
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block space-y-1 text-sm font-medium" style={{ color: '#0B1F3A' }}>
        Email
        <input
          className="mt-1 h-10 w-full rounded-lg px-3 text-sm outline-none transition-all"
          style={{
            background: '#F5F7FA',
            border: '1.5px solid #e6eefc',
            color: '#0B1F3A',
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = '1.5px solid #1769E0'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(23,105,224,0.12)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = '1.5px solid #e6eefc'
            e.currentTarget.style.boxShadow = 'none'
          }}
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block space-y-1 text-sm font-medium" style={{ color: '#0B1F3A' }}>
        Password
        <input
          className="mt-1 h-10 w-full rounded-lg px-3 text-sm outline-none transition-all"
          style={{
            background: '#F5F7FA',
            border: '1.5px solid #e6eefc',
            color: '#0B1F3A',
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = '1.5px solid #1769E0'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(23,105,224,0.12)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = '1.5px solid #e6eefc'
            e.currentTarget.style.boxShadow = 'none'
          }}
          name="password"
          required
          type="password"
        />
      </label>
      <button
        className="h-10 w-full rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #1769E0, #19C3FF)',
          boxShadow: '0 4px 16px rgba(23,105,224,0.3)',
        }}
        disabled={loading}
        type="submit"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
      {error ? <AlertError>{error}</AlertError> : null}
    </form>
  )
}

function safeNext(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
