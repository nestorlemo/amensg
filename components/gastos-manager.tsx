'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

type Concepto = {
  id: string
  nombre: string
  tipo: string
  activo: boolean
}

type Gasto = {
  id: string
  conceptoId: string
  concepto: string
  tipo: string
  anio: number
  mes: number
  fecha: string | null
  importe: string
  observaciones: string | null
}

export function ConceptoForm({ conceptos }: { conceptos: Concepto[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const result = await request('/api/gastos/conceptos', 'POST', {
      nombre: formData.get('nombre'),
      tipo: formData.get('tipo'),
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    form.reset()
    router.refresh()
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-950">Conceptos</h2>
      <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
        <Input label="Nombre" name="nombre" required />
        <Select label="Tipo" name="tipo" options={['FIJO', 'VARIABLE']} />
        <div className="flex items-end">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Crear concepto
          </button>
        </div>
      </form>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <div className="grid min-w-[760px] grid-cols-[minmax(220px,1fr)_140px_110px_220px] gap-3 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-600">
          <span>Nombre</span>
          <span>Tipo</span>
          <span>Activo</span>
          <span>Acciones</span>
        </div>
        <div className="divide-y divide-slate-200">
          {conceptos.map((concepto) => (
            <ConceptoRow concepto={concepto} key={concepto.id} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ConceptoRow({ concepto }: { concepto: Concepto }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await request(`/api/gastos/conceptos/${concepto.id}`, 'PUT', {
      nombre: form.get('nombre'),
      tipo: form.get('tipo'),
      activo: form.get('activo') === 'on',
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.refresh()
  }

  async function deactivate() {
    const result = await request(`/api/gastos/conceptos/${concepto.id}/desactivar`, 'POST', {})
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <form className="grid min-w-[760px] grid-cols-[minmax(220px,1fr)_140px_110px_220px] items-center gap-3 px-3 py-3" onSubmit={update}>
      <input className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm" defaultValue={concepto.nombre} name="nombre" />
      <select className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm" defaultValue={concepto.tipo} name="tipo">
        <option value="FIJO">FIJO</option>
        <option value="VARIABLE">VARIABLE</option>
      </select>
      <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
        <input className="h-4 w-4" defaultChecked={concepto.activo} name="activo" type="checkbox" />
        Activo
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button className="h-9 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white" type="submit">
          Guardar
        </button>
        <button className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700" onClick={deactivate} type="button">
          Desactivar
        </button>
      </div>
      {error ? <p className="md:col-span-4 text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  )
}

export function GastoForm({ conceptos, disabled = false }: { conceptos: Concepto[]; disabled?: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const result = await request('/api/gastos', 'POST', formPayload(new FormData(form)))
    if (!result.ok) {
      setError(result.error)
      return
    }
    form.reset()
    router.refresh()
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-950">Nuevo gasto</h2>
      <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
        <ConceptSelect conceptos={conceptos.filter((concepto) => concepto.activo)} />
        <Input label="Anio" name="anio" required />
        <Input label="Mes" name="mes" required />
        <Input label="Fecha" name="fecha" required type="date" />
        <Input label="Importe" name="importe" required />
        <Input label="Observaciones" name="observaciones" />
        <div className="flex items-end">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} type="submit">
            Crear gasto
          </button>
        </div>
      </form>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </section>
  )
}

export function GastoRowActions({ conceptos, disabled = false, gasto }: { conceptos: Concepto[]; disabled?: boolean; gasto: Gasto }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await request(`/api/gastos/${gasto.id}`, 'PUT', formPayload(new FormData(event.currentTarget)))
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function remove() {
    const result = await request(`/api/gastos/${gasto.id}`, 'DELETE', null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <form className="grid min-w-96 gap-2 md:grid-cols-3" onSubmit={update}>
      <ConceptSelect conceptos={conceptos} defaultValue={gasto.conceptoId} disabled={disabled} compact />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.anio} disabled={disabled} name="anio" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.mes} disabled={disabled} name="mes" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.fecha?.slice(0, 10)} disabled={disabled} name="fecha" type="date" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.importe} disabled={disabled} name="importe" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.observaciones ?? ''} disabled={disabled} name="observaciones" placeholder="Observaciones" />
      <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} type="submit">Guardar</button>
      <button className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} onClick={remove} type="button">Eliminar</button>
      {error ? <p className="md:col-span-3 text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  )
}

function formPayload(form: FormData) {
  return {
    conceptoId: form.get('conceptoId'),
    anio: form.get('anio'),
    mes: form.get('mes'),
    fecha: form.get('fecha'),
    importe: form.get('importe'),
    observaciones: form.get('observaciones'),
  }
}

function ConceptSelect({ conceptos, defaultValue, disabled, compact }: { conceptos: Concepto[]; defaultValue?: string; disabled?: boolean; compact?: boolean }) {
  return (
    <label className={compact ? '' : 'space-y-1 text-sm font-medium text-slate-700'}>
      {compact ? null : 'Concepto'}
      <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100" defaultValue={defaultValue} disabled={disabled} name="conceptoId">
        {conceptos.map((concepto) => (
          <option key={concepto.id} value={concepto.id}>
            {concepto.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

function Input({ label, name, required, type = 'text' }: { label: string; name: string; required?: boolean; type?: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" name={name} required={required} type={type} />
    </label>
  )
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" name={name}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

async function request(url: string, method: string, body: Record<string, unknown> | null) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    error: payload.message ?? payload.error ?? 'No se pudo completar la operacion.',
  }
}
