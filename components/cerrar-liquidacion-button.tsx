'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CerrarLiquidacionButton({ anio, mes, disabled = false }: { anio: number; mes: number; disabled?: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  async function close() {
    setIsClosing(true)
    setError(null)

    try {
      const response = await fetch('/api/liquidaciones/cerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio, mes, confirmacion: true }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.message ?? payload.error ?? 'No se pudo cerrar la liquidacion.')
        return
      }

      router.push(`/cierres/${payload.id}`)
      router.refresh()
    } catch {
      setError('No se pudo conectar con el endpoint de cierre.')
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || isClosing}
        onClick={close}
        type="button"
      >
        {isClosing ? 'Cerrando...' : 'Cerrar período'}
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  )
}
