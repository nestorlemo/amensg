'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(payload.message ?? payload.error ?? 'No se pudo iniciar sesion.')
        return
      }

      router.push(safeNext(next))
      router.refresh()
    } catch {
      setError('No se pudo conectar con el endpoint de login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        Email
        <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" name="email" required type="email" />
      </label>
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        Password
        <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" name="password" required type="password" />
      </label>
      <button className="h-10 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  )
}

function safeNext(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
