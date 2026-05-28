'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

type Parametro = {
  id: string
  clave: string
  valor: string
  tipo: string
  descripcion: string | null
  activo: boolean
  critico: boolean
}

export function ParametrosManager({ parametros }: { parametros: Parametro[] }) {
  return (
    <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
          <tr>
            <Th>Clave</Th>
            <Th>Valor</Th>
            <Th>Tipo</Th>
            <Th>Descripción</Th>
            <Th>Activo</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {parametros.map((parametro) => (
            <ParametroRow key={parametro.id} parametro={parametro} />
          ))}
        </tbody>
      </table>
    </section>
  )
}

function ParametroRow({ parametro }: { parametro: Parametro }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setIsSaving(true)
    setError(null)

    const result = await request(`/api/parametros/${parametro.id}`, {
      valor: form.get('valor'),
      tipo: form.get('tipo'),
      descripcion: form.get('descripcion'),
      activo: form.get('activo') === 'on',
    })

    setIsSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    router.refresh()
  }

  return (
    <tr className={`border-t border-slate-200 align-top ${parametro.critico ? 'bg-amber-50/60' : ''}`}>
      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
        <div>{parametro.clave}</div>
        {parametro.critico ? <div className="mt-1 text-xs font-semibold uppercase text-amber-700">Crítico</div> : null}
      </td>
      <td className="px-4 py-3" colSpan={5}>
        <form className="grid min-w-[760px] gap-3 lg:grid-cols-[160px_140px_minmax(220px,1fr)_100px_120px]" onSubmit={submit}>
          <input
            className="h-10 rounded-md border border-slate-300 px-3 text-sm tabular-nums"
            defaultValue={parametro.valor}
            name="valor"
            required
          />
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={parametro.tipo} name="tipo" required />
          <input
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            defaultValue={parametro.descripcion ?? ''}
            name="descripcion"
          />
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
            <input className="h-4 w-4" defaultChecked={parametro.activo} name="activo" type="checkbox" />
            Activo
          </label>
          <button
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            Guardar
          </button>
          {error ? <p className="text-sm font-medium text-red-700 lg:col-span-5">{error}</p> : null}
        </form>
      </td>
    </tr>
  )
}

function Th({ children }: { children: string }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

async function request(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    error: payload.message ?? payload.error ?? 'No se pudo guardar el parámetro.',
  }
}
