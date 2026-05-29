'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

type CloseResult = {
  id: string
}

export function CerrarLiquidacionButton({ anio, mes, disabled = false }: { anio: number; mes: number; disabled?: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  async function close() {
    setIsClosing(true)
    setError(null)

    const result = await requestJson<CloseResult>('/api/liquidaciones/cerrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anio, mes, confirmacion: true }),
    }, 'No se pudo cerrar la liquidación.')

    if (!result.ok) {
      setError(result.error)
      setIsClosing(false)
      return
    }

    router.push(`/cierres/${result.data.id}`)
    router.refresh()
    setIsClosing(false)
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
      {error ? <AlertError>{error}</AlertError> : null}
    </div>
  )
}
