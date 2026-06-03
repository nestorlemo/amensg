'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { AlertError, AlertWarning } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

type EstadoCobroOption = {
  id: string
  codigo: string
  nombre: string
}

type ChangeEstadoCobroFormProps = {
  facturacionId: string
  estadoCobroId: string
  fechaCobro: string | null
  observaciones: string | null
  estadosCobro: EstadoCobroOption[]
  disabled?: boolean
}

const STATES_REQUIRING_PAYMENT_DATE = new Set(['PAGADO', 'CONTADO', 'CHEQUE'])

export function ChangeEstadoCobroForm({
  facturacionId,
  estadoCobroId,
  fechaCobro,
  observaciones,
  estadosCobro,
  disabled = false,
}: ChangeEstadoCobroFormProps) {
  const router = useRouter()
  const [selectedEstadoId, setSelectedEstadoId] = useState(estadoCobroId)
  const [selectedFechaCobro, setSelectedFechaCobro] = useState(fechaCobro?.slice(0, 10) ?? '')
  const [selectedObservaciones, setSelectedObservaciones] = useState(observaciones ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedEstado = estadosCobro.find((estado) => estado.id === selectedEstadoId)
  const requiresDate = selectedEstado ? STATES_REQUIRING_PAYMENT_DATE.has(selectedEstado.codigo) : false

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (disabled) {
      setError('El período ya está cerrado. No se puede modificar el estado de cobro.')
      return
    }

    if (requiresDate && !selectedFechaCobro) {
      setError('La fecha de cobro es requerida para este estado.')
      return
    }

    setIsSaving(true)

    const result = await requestJson(`/api/facturacion/${facturacionId}/cambiar-estado-cobro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estadoCobroId: selectedEstadoId,
        fechaCobro: selectedFechaCobro || null,
        observaciones: selectedObservaciones || null,
      }),
    }, 'No se pudo actualizar el estado.')

    if (result.ok === false) {
      setError(result.error)
      setIsSaving(false)
      return
    }

    router.refresh()
    setIsSaving(false)
  }

  return (
    <form className="flex min-w-72 flex-col gap-2" onSubmit={handleSubmit}>
      <select
        className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        disabled={disabled}
        onChange={(event) => setSelectedEstadoId(event.target.value)}
        value={selectedEstadoId}
      >
        {estadosCobro.map((estado) => (
          <option key={estado.id} value={estado.id}>
            {estado.codigo}
          </option>
        ))}
      </select>
      <input
        className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        disabled={disabled}
        onChange={(event) => setSelectedFechaCobro(event.target.value)}
        type="date"
        value={selectedFechaCobro}
      />
      <input
        className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        disabled={disabled}
        onChange={(event) => setSelectedObservaciones(event.target.value)}
        placeholder="Observaciones"
        value={selectedObservaciones}
      />
      <button
        className="h-9 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || isSaving}
        type="submit"
      >
        {isSaving ? 'Guardando...' : 'Cambiar estado'}
      </button>
      {error ? <AlertError className="max-w-72 p-2 text-xs">{error}</AlertError> : null}
      {disabled ? <AlertWarning className="max-w-72 p-2 text-xs">El período ya está cerrado. No se puede modificar el estado de cobro.</AlertWarning> : null}
      {requiresDate ? <p className="text-xs text-slate-500">Este estado requiere fecha de cobro.</p> : null}
    </form>
  )
}
