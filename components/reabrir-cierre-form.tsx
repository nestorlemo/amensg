'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

import { AlertError } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

type ReabrirCierreFormProps = {
  cierreId: string
  buttonLabel?: string
}

export function ReabrirCierreForm({ cierreId, buttonLabel = 'Reabrir' }: ReabrirCierreFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedMotivo = motivo.trim()

    if (!trimmedMotivo) {
      setError('Debe indicar un motivo.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await requestJson(`/api/cierres/${cierreId}/reabrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo: trimmedMotivo }),
    }, 'No se pudo reabrir el cierre.')

    if (!result.ok) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    setMotivo('')
    setIsOpen(false)
    setIsSubmitting(false)
    router.refresh()
  }

  if (!isOpen) {
    return (
      <button
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-50"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </button>
    )
  }

  return (
    <form className="min-w-64 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3" onSubmit={handleSubmit}>
      <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor={`motivo-reapertura-${cierreId}`}>
        Motivo de reapertura
      </label>
      <textarea
        className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
        id={`motivo-reapertura-${cierreId}`}
        name="motivo"
        required
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
      />
      {error ? <AlertError>{error}</AlertError> : null}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          Confirmar reapertura
        </button>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          disabled={isSubmitting}
          type="button"
          onClick={() => {
            setIsOpen(false)
            setError(null)
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
