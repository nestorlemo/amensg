'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

type Socio = {
  id: string
  nombre: string
  porcentajeParticipacion: string
  porcentajeDisplay: string
  cuentaPesos: string
  cuentaUsd: string
  activo: boolean
}

type SociosValidation = {
  totalDecimal: string
  totalPercent: string
  isValid: boolean
  activeCount: number
  message: string
}

export function SociosManager({ socios, validation }: { socios: Socio[]; validation: SociosValidation }) {
  return (
    <div className="space-y-4">
      <section className={`rounded-md border p-4 ${validation.isValid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className={`text-sm font-semibold ${validation.isValid ? 'text-emerald-950' : 'text-amber-950'}`}>{validation.message}</p>
        <p className="mt-1 text-sm text-slate-700">
          Total activo: {formatPercent(validation.totalPercent)} · Socios activos: {validation.activeCount}
        </p>
      </section>

      <CreateSocioForm />

      <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Nombre</Th>
              <Th>Porcentaje</Th>
              <Th>Cuenta pesos</Th>
              <Th>Cuenta USD</Th>
              <Th>Activo</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {socios.map((socio) => (
              <SocioRow key={socio.id} socio={socio} />
            ))}
            {socios.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                  No hay socios registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function CreateSocioForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const result = await request('/api/socios', 'POST', payload(new FormData(form)))

    if (!result.ok) {
      setError(result.error)
      return
    }

    form.reset()
    setError(null)
    router.refresh()
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-950">Nuevo socio</h2>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={submit}>
        <Input label="Nombre" name="nombre" required />
        <Input label="Porcentaje" name="porcentajeParticipacion" placeholder="12" required />
        <Input label="Cuenta pesos" name="cuentaPesos" />
        <Input label="Cuenta USD" name="cuentaUsd" />
        <label className="flex h-10 items-end gap-2 text-sm text-slate-700">
          <input className="mb-1 h-4 w-4" defaultChecked name="activo" type="checkbox" />
          Activo
        </label>
        <div className="flex items-end">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Crear socio
          </button>
        </div>
      </form>
      {error ? <AlertError>{error}</AlertError> : null}
    </section>
  )
}

function SocioRow({ socio }: { socio: Socio }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    const result = await request(`/api/socios/${socio.id}`, 'PUT', payload(new FormData(event.currentTarget)))
    setIsSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.refresh()
  }

  async function deactivate() {
    setIsSaving(true)
    setError(null)
    const result = await request(`/api/socios/${socio.id}/desactivar`, 'POST', {})
    setIsSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.refresh()
  }

  return (
    <tr className={`border-t border-slate-200 align-top ${socio.activo ? '' : 'bg-slate-50 text-slate-500'}`}>
      <td className="px-4 py-3" colSpan={6}>
        <form className="grid min-w-[860px] gap-3 lg:grid-cols-[minmax(180px,1fr)_130px_minmax(160px,1fr)_minmax(160px,1fr)_100px_220px]" onSubmit={submit}>
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={socio.nombre} name="nombre" required />
          <input
            className="h-10 rounded-md border border-slate-300 px-3 text-sm tabular-nums"
            defaultValue={socio.porcentajeDisplay}
            name="porcentajeParticipacion"
            required
          />
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={socio.cuentaPesos} name="cuentaPesos" />
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={socio.cuentaUsd} name="cuentaUsd" />
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
            <input className="h-4 w-4" defaultChecked={socio.activo} name="activo" type="checkbox" />
            Activo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-10 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              Guardar
            </button>
            <button
              className="h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !socio.activo}
              onClick={deactivate}
              type="button"
            >
              Desactivar
            </button>
          </div>
          {error ? <AlertError className="lg:col-span-6">{error}</AlertError> : null}
        </form>
      </td>
    </tr>
  )
}

function Input({
  label,
  name,
  placeholder,
  required,
}: {
  label: string
  name: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" name={name} placeholder={placeholder} required={required} />
    </label>
  )
}

function Th({ children }: { children: string }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function payload(form: FormData) {
  return {
    nombre: form.get('nombre'),
    porcentajeParticipacion: form.get('porcentajeParticipacion'),
    cuentaPesos: form.get('cuentaPesos'),
    cuentaUsd: form.get('cuentaUsd'),
    activo: form.get('activo') === 'on',
  }
}

function formatPercent(value: string) {
  return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 4 }).format(Number(value))}%`
}

async function request(url: string, method: string, body: Record<string, unknown>) {
  const result = await requestJson(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 'No se pudo completar la operación.')

  return result.ok ? { ok: true, error: null } : { ok: false, error: result.error }
}
