'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

type AnularImportacionFormProps = {
  importacionId: string
  buttonLabel?: string
}

export function AnularImportacionForm({ importacionId, buttonLabel = 'Anular' }: AnularImportacionFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedMotivo = motivo.trim()

    if (!trimmedMotivo) {
      setError('Debe indicar un motivo.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await requestJson(`/api/importaciones/${importacionId}/anular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo: trimmedMotivo }),
    }, 'No se pudo anular la importacion.')

    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setMotivo('')
    setIsOpen(false)
    router.refresh()
  }

  if (!isOpen) {
    return (
      <button
        className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </button>
    )
  }

  return (
    <form className="min-w-64 space-y-2 rounded-md border border-red-200 bg-red-50 p-3" onSubmit={submit}>
      <label className="block text-xs font-semibold uppercase text-red-800" htmlFor={`motivo-anulacion-${importacionId}`}>
        Motivo de anulacion
      </label>
      <textarea
        className="min-h-20 w-full rounded-md border border-red-200 px-3 py-2 text-sm text-slate-950"
        id={`motivo-anulacion-${importacionId}`}
        required
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
      />
      {error ? <AlertError>{error}</AlertError> : null}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          Confirmar anulacion
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
