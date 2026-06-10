'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { DateInput } from '@/components/date-input'
import { Badge, Button } from '@/components/ui/index'
import { requestJson } from '@/lib/client-api'

type Concepto = {
  id: string
  nombre: string
  tipo: string
  monto: string | null
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

// ─── Resumen de gastos ────────────────────────────────────────────────────────

export function GastosResumen({
  conceptosFijos,
  gastosVariables,
}: {
  conceptosFijos: Concepto[]
  gastosVariables: Gasto[]
}) {
  const totalFijos = conceptosFijos
    .filter((c) => c.activo && c.monto)
    .reduce((sum, c) => sum + Number(c.monto ?? 0), 0)
  const totalVariables = gastosVariables.reduce((sum, g) => sum + Number(g.importe), 0)
  const total = totalFijos + totalVariables

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Gastos fijos del mes S/IVA" value={fmt(totalFijos)} accent="#1769E0" />
      <SummaryCard label="Gastos variables del mes S/IVA" value={fmt(totalVariables)} accent="#5a6a82" />
      <SummaryCard label="Total gastos S/IVA" value={fmt(total)} accent="#0B1F3A" bold />
    </div>
  )
}

function SummaryCard({ label, value, accent, bold }: { label: string; value: string; accent: string; bold?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" style={{ borderLeftColor: accent, borderLeftWidth: 4 }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl tabular-nums ${bold ? 'font-bold' : 'font-semibold'} text-slate-950`}>{value}</p>
    </div>
  )
}

// ─── Sección 1: Gastos fijos ──────────────────────────────────────────────────

export function GastosFijosManager({ conceptos }: { conceptos: Concepto[] }) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const fijos = conceptos.filter((c) => c.tipo === 'FIJO')

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fd = new FormData(form)
    const result = await apiFetch('/api/gastos/conceptos', 'POST', {
      nombre: fd.get('nombre'),
      tipo: 'FIJO',
      monto: fd.get('monto'),
    })
    if (result.ok === false) { setFormError(result.error); return }
    setFormError(null)
    form.reset()
    router.refresh()
  }

  const totalFijos = fijos
    .filter((c) => c.activo && c.monto)
    .reduce((sum, c) => sum + Number(c.monto ?? 0), 0)

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Gastos fijos</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Se incluyen automáticamente en cada liquidación mensual.
            {fijos.filter((c) => c.activo && c.monto).length > 0
              ? ` Total mensual: ${new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2 }).format(totalFijos)}`
              : ''}
          </p>
        </div>
      </div>

      {/* Nueva concepto fijo */}
      <form className="flex flex-wrap items-end gap-3 rounded-md border border-slate-100 bg-slate-50 p-3" onSubmit={handleCreate}>
        <Field label="Nombre del concepto" name="nombre" placeholder="Alquiler, servicio, etc." required />
        <Field label="Monto mensual" name="monto" placeholder="0.00" required type="number" min="0" step="0.01" />
        <div className="flex items-end">
          <Button variant="primary" type="submit">+ Nuevo concepto fijo</Button>
        </div>
        {formError ? <AlertError className="w-full">{formError}</AlertError> : null}
      </form>

      {/* Tabla de conceptos fijos */}
      {fijos.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 text-right">Monto mensual S/IVA</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fijos.map((c) => (
                <ConceptoFijoRow concepto={c} key={c.id} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No hay conceptos de gastos fijos configurados.</p>
      )}
    </section>
  )
}

function ConceptoFijoRow({ concepto }: { concepto: Concepto }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const result = await apiFetch(`/api/gastos/conceptos/${concepto.id}`, 'PUT', {
      nombre: fd.get('nombre'),
      tipo: 'FIJO',
      monto: fd.get('monto'),
      activo: concepto.activo,
    })
    if (result.ok === false) { setError(result.error); return }
    setEditing(false)
    router.refresh()
  }

  async function handleToggle() {
    const result = await apiFetch(`/api/gastos/conceptos/${concepto.id}`, 'PUT', {
      nombre: concepto.nombre,
      tipo: 'FIJO',
      monto: concepto.monto,
      activo: !concepto.activo,
    })
    if (result.ok === false) { setError(result.error); return }
    router.refresh()
  }

  const fmt = (v: string | null) =>
    v ? new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2 }).format(Number(v)) : '—'

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-4 py-2" colSpan={4}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleSave}>
            <Field defaultValue={concepto.nombre} label="Nombre" name="nombre" required />
            <Field defaultValue={concepto.monto ?? ''} label="Monto" min="0" name="monto" required step="0.01" type="number" />
            <div className="flex gap-2">
              <Button variant="secondary" type="submit">Guardar</Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setError(null) }} type="button">Cancelar</Button>
            </div>
            {error ? <AlertError className="w-full">{error}</AlertError> : null}
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr className={concepto.activo ? '' : 'opacity-50'}>
      <td className="px-4 py-3 font-medium text-slate-900">{concepto.nombre}</td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(concepto.monto)}</td>
      <td className="px-4 py-3">
        <Badge variant={concepto.activo ? 'activo' : 'inactivo'} />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} type="button">Editar</Button>
          <Button variant="outline" size="sm" onClick={handleToggle} type="button">
            {concepto.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
        {error ? <AlertError className="mt-1">{error}</AlertError> : null}
      </td>
    </tr>
  )
}

// ─── Sección 2: Gastos variables ──────────────────────────────────────────────

export function GastosVariablesManager({
  conceptos,
  disabled = false,
}: {
  conceptos: Concepto[]
  disabled?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const variables = conceptos.filter((c) => c.tipo === 'VARIABLE' && c.activo)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fd = new FormData(form)
    const result = await apiFetch('/api/gastos', 'POST', {
      conceptoId: fd.get('conceptoId'),
      anio: fd.get('anio'),
      mes: fd.get('mes'),
      fecha: fd.get('fecha'),
      importe: fd.get('importe'),
      observaciones: fd.get('observaciones'),
    })
    if (result.ok === false) { setError(result.error); return }
    setError(null)
    form.reset()
    router.refresh()
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-950">Gastos variables</h2>

      {disabled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
          El período está cerrado. Para modificar gastos debe reabrirse el cierre.
        </div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3 rounded-md border border-slate-100 bg-slate-50 p-3" onSubmit={handleSubmit}>
        <ConceptSelect conceptos={variables} />
        <Field label="Año" name="anio" placeholder="2026" required />
        <Field label="Mes" name="mes" placeholder="6" required />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Fecha
          <DateInput className="block h-9 w-full min-w-[120px] rounded-md border border-slate-300 px-2 text-sm" name="fecha" required />
        </label>
        <Field label="Importe" min="0" name="importe" required step="0.01" type="number" />
        <Field label="Observaciones" name="observaciones" />
        <div className="flex items-end">
          <Button variant="secondary" disabled={disabled} type="submit">Agregar gasto</Button>
        </div>
        {error ? <AlertError className="w-full">{error}</AlertError> : null}
      </form>
    </section>
  )
}

export function GastoRowActions({
  conceptos,
  disabled = false,
  gasto,
}: {
  conceptos: Concepto[]
  disabled?: boolean
  gasto: Gasto
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const variables = conceptos.filter((c) => c.tipo === 'VARIABLE')

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const result = await apiFetch(`/api/gastos/${gasto.id}`, 'PUT', {
      conceptoId: fd.get('conceptoId'),
      anio: fd.get('anio'),
      mes: fd.get('mes'),
      fecha: fd.get('fecha'),
      importe: fd.get('importe'),
      observaciones: fd.get('observaciones'),
    })
    if (result.ok === false) { setError(result.error); return }
    router.refresh()
  }

  async function remove() {
    const result = await apiFetch(`/api/gastos/${gasto.id}`, 'DELETE', null)
    if (result.ok === false) { setError(result.error); return }
    router.refresh()
  }

  return (
    <form className="grid min-w-96 gap-2 md:grid-cols-3" onSubmit={update}>
      <ConceptSelect conceptos={variables} defaultValue={gasto.conceptoId} disabled={disabled} compact />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.anio} disabled={disabled} name="anio" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.mes} disabled={disabled} name="mes" />
      <DateInput className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.fecha?.slice(0, 10)} disabled={disabled} name="fecha" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.importe} disabled={disabled} name="importe" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={gasto.observaciones ?? ''} disabled={disabled} name="observaciones" placeholder="Observaciones" />
      <Button variant="secondary" disabled={disabled} type="submit">Guardar</Button>
      <Button variant="danger" disabled={disabled} onClick={remove} type="button">Eliminar</Button>
      {error ? <AlertError className="md:col-span-3">{error}</AlertError> : null}
    </form>
  )
}

// ─── Componentes de compatibilidad (aún usados por app/gastos/page.tsx) ───────

export function ConceptoForm({ conceptos }: { conceptos: Concepto[] }) {
  return <GastosFijosManager conceptos={conceptos} />
}

export function GastoForm({ conceptos, disabled = false }: { conceptos: Concepto[]; disabled?: boolean }) {
  return <GastosVariablesManager conceptos={conceptos} disabled={disabled} />
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Field({
  defaultValue,
  label,
  min,
  name,
  placeholder,
  required,
  step,
  type = 'text',
}: {
  defaultValue?: string | number
  label: string
  min?: string
  name: string
  placeholder?: string
  required?: boolean
  step?: string
  type?: string
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="block h-9 w-full min-w-[120px] rounded-md border border-slate-300 px-2 text-sm"
        defaultValue={defaultValue}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  )
}

function ConceptSelect({
  conceptos,
  defaultValue,
  disabled,
  compact,
}: {
  conceptos: Concepto[]
  defaultValue?: string
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <label className={compact ? '' : 'space-y-1 text-sm font-medium text-slate-700'}>
      {compact ? null : 'Concepto'}
      <select
        className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100"
        defaultValue={defaultValue}
        disabled={disabled}
        name="conceptoId"
      >
        {conceptos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
    </label>
  )
}

async function apiFetch(url: string, method: string, body: Record<string, unknown> | null) {
  const result = await requestJson(
    url,
    {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
    'No se pudo completar la operación.',
  )
  return result.ok === true ? { ok: true as const, error: null } : { ok: false as const, error: result.error }
}
