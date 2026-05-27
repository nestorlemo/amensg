'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

type Empresa = {
  id: string
  nombre: string
}

type Ingreso = {
  id: string
  concepto: string
  empresaId: string | null
  anio: number
  mes: number
  montoSinIva: string
  porcentajeIva: string
  iva: string
  montoConIva: string
  observaciones: string | null
}

export function IngresoAdicionalForm({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const result = await request('/api/ingresos-adicionales', 'POST', payload(new FormData(form)))
    if (!result.ok) {
      setError(result.error)
      return
    }
    form.reset()
    router.refresh()
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-950">Nuevo ingreso adicional</h2>
      <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
        <Input label="Concepto" name="concepto" required />
        <EmpresaSelect empresas={empresas} />
        <Input label="Anio" name="anio" required />
        <Input label="Mes" name="mes" required />
        <Input label="Monto sin IVA" name="montoSinIva" required />
        <Input label="Porcentaje IVA" name="porcentajeIva" required defaultValue="0.22" />
        <Input label="Observaciones" name="observaciones" />
        <div className="flex items-end">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Crear ingreso
          </button>
        </div>
      </form>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </section>
  )
}

export function IngresoRowActions({ empresas, ingreso }: { empresas: Empresa[]; ingreso: Ingreso }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await request(`/api/ingresos-adicionales/${ingreso.id}`, 'PUT', payload(new FormData(event.currentTarget)))
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function remove() {
    const result = await request(`/api/ingresos-adicionales/${ingreso.id}`, 'DELETE', null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <form className="grid min-w-96 gap-2 md:grid-cols-3" onSubmit={update}>
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm" defaultValue={ingreso.concepto} name="concepto" />
      <EmpresaSelect compact defaultValue={ingreso.empresaId ?? ''} empresas={empresas} />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm" defaultValue={ingreso.anio} name="anio" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm" defaultValue={ingreso.mes} name="mes" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm" defaultValue={ingreso.montoSinIva} name="montoSinIva" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm" defaultValue={ingreso.porcentajeIva} name="porcentajeIva" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm" defaultValue={ingreso.observaciones ?? ''} name="observaciones" placeholder="Observaciones" />
      <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white" type="submit">Guardar</button>
      <button className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700" onClick={remove} type="button">Eliminar</button>
      {error ? <p className="md:col-span-3 text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  )
}

function payload(form: FormData) {
  return {
    concepto: form.get('concepto'),
    empresaId: form.get('empresaId'),
    anio: form.get('anio'),
    mes: form.get('mes'),
    montoSinIva: form.get('montoSinIva'),
    porcentajeIva: form.get('porcentajeIva'),
    observaciones: form.get('observaciones'),
  }
}

function EmpresaSelect({
  compact,
  defaultValue,
  empresas,
}: {
  compact?: boolean
  defaultValue?: string
  empresas: Empresa[]
}) {
  return (
    <label className={compact ? '' : 'space-y-1 text-sm font-medium text-slate-700'}>
      {compact ? null : 'Empresa'}
      <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={defaultValue} name="empresaId">
        <option value="">Sin empresa</option>
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

function Input({
  defaultValue,
  label,
  name,
  required,
}: {
  defaultValue?: string
  label: string
  name: string
  required?: boolean
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={defaultValue} name={name} required={required} />
    </label>
  )
}

async function request(url: string, method: string, body: Record<string, unknown> | null) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const responsePayload = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    error: responsePayload.message ?? responsePayload.error ?? 'No se pudo completar la operacion.',
  }
}
