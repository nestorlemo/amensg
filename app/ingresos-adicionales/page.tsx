'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { PencilIcon, TrashIcon } from '@/components/issues/IssueIcons'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => CURRENT_YEAR - i)
const MESES = [
  { v: '1', l: 'Enero' }, { v: '2', l: 'Febrero' }, { v: '3', l: 'Marzo' },
  { v: '4', l: 'Abril' }, { v: '5', l: 'Mayo' }, { v: '6', l: 'Junio' },
  { v: '7', l: 'Julio' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' },
]

type Empresa = { id: string; nombre: string }
type Ingreso = {
  id: string
  concepto: string
  empresaId: string | null
  empresa: string | null
  anio: number
  mes: number
  moneda: string
  montoOrigen: string
  montoSinIva: string
  porcentajeIva: string
  iva: string
  montoConIva: string
  fechaFacturacion: string
  tipoCambioAplicado: string
  observaciones: string | null
}

const EMPTY_FORM = {
  concepto: '',
  empresaId: '',
  anio: String(CURRENT_YEAR),
  mes: String(new Date().getMonth() + 1),
  moneda: 'UYU',
  montoOrigen: '',
  tipoCambioAplicado: '1',
  observaciones: '',
}

function fmt(v: string | number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
}

function mesLabel(m: number) {
  return MESES[m - 1]?.l ?? String(m)
}

export default function IngresosAdicionalesPage() {
  const now = new Date()
  const todayISO = now.toISOString().split('T')[0]!

  const [rows, setRows]       = useState<Ingreso[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Filters
  const [fAnio, setFAnio]       = useState('')
  const [fMes, setFMes]         = useState('')
  const [fEmpresa, setFEmpresa] = useState('')
  const [fMoneda, setFMoneda]   = useState('')

  // Create modal
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [formError, setFormError]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  // Edit modal
  const [editingRow, setEditingRow]       = useState<Ingreso | null>(null)
  const [editForm, setEditForm]           = useState({ ...EMPTY_FORM })
  const [editError, setEditError]         = useState<string | null>(null)
  const [editSaving, setEditSaving]       = useState(false)

  useEffect(() => {
    fetch('/api/ingresos-adicionales')
      .then((r) => r.json())
      .then((d) => setEmpresas(d.empresas ?? []))
      .catch(() => null)
  }, [])

  useEffect(() => { void fetchAll() }, [fAnio, fMes, fEmpresa, fMoneda]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (fAnio)    qs.set('anio',      fAnio)
      if (fMes)     qs.set('mes',       fMes)
      if (fEmpresa) qs.set('empresaId', fEmpresa)
      if (fMoneda)  qs.set('moneda',    fMoneda)
      const res = await fetch(`/api/ingresos-adicionales?${qs}`)
      const data = await res.json()
      setRows(data.rows ?? [])
    } catch {
      setError('Error al cargar ingresos.')
    } finally {
      setLoading(false)
    }
  }

  function buildBody(f: typeof EMPTY_FORM) {
    return {
      concepto: f.concepto,
      empresaId: f.empresaId || null,
      anio: Number(f.anio),
      mes: Number(f.mes),
      moneda: f.moneda,
      montoOrigen: f.montoOrigen,
      porcentajeIva: '0.22',
      fechaFacturacion: todayISO,
      tipoCambioAplicado: f.moneda === 'USD' ? f.tipoCambioAplicado : '1',
      observaciones: f.observaciones || null,
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/ingresos-adicionales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(form)),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.message ?? JSON.stringify(data)); return }
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      void fetchAll()
    } finally {
      setSaving(false)
    }
  }

  function openEdit(row: Ingreso) {
    setEditingRow(row)
    setEditError(null)
    setEditForm({
      concepto: row.concepto,
      empresaId: row.empresaId ?? '',
      anio: String(row.anio),
      mes: String(row.mes),
      moneda: row.moneda,
      montoOrigen: row.montoOrigen,
      tipoCambioAplicado: row.tipoCambioAplicado ?? '1',
      observaciones: row.observaciones ?? '',
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingRow) return
    setEditError(null)
    setEditSaving(true)
    try {
      const res = await fetch(`/api/ingresos-adicionales/${editingRow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(editForm)),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.message ?? JSON.stringify(data)); return }
      setEditingRow(null)
      void fetchAll()
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(row: Ingreso) {
    if (!window.confirm(`¿Eliminar "${row.concepto}"?`)) return
    await fetch(`/api/ingresos-adicionales/${row.id}`, { method: 'DELETE' })
    void fetchAll()
  }

  // KPIs
  const totalRegistros  = rows.length
  const totalUYU        = rows.filter(r => r.moneda === 'UYU').reduce((s, r) => s + Number(r.montoSinIva), 0)
  const totalUSD        = rows.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.montoSinIva), 0)
  const totalIVA        = rows.reduce((s, r) => s + Number(r.iva), 0)

  const ivaPreview = form.montoOrigen ? Number(form.montoOrigen) * 0.22 : null
  const editIvaPreview = editForm.montoOrigen ? Number(editForm.montoOrigen) * 0.22 : null

  return (
    <div className="space-y-6">
      <PageHeader section="GESTIÓN DE FACTURACIÓN" title="Facturación Adicional" description="Ingresos no provenientes de activaciones, con IVA calculado." />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Total registros"   value={String(totalRegistros)} />
        <SummaryCard label="Total UYU s/IVA"   value={`$${fmt(totalUYU)}`} />
        <SummaryCard label="Total USD s/IVA"   value={`USD ${fmt(totalUSD)}`} />
        <SummaryCard label="Total IVA"         value={`$${fmt(totalIVA)}`} />
      </div>

      {/* Filtros */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Año" value={fAnio} onChange={setFAnio} width="w-28">
            <option value="">Todos</option>
            {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </Select>
          <Select label="Mes" value={fMes} onChange={setFMes} width="w-36">
            <option value="">Todos</option>
            {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </Select>
          <Select label="Empresa" value={fEmpresa} onChange={setFEmpresa} width="w-44">
            <option value="">Todas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Select>
          <Select label="Moneda" value={fMoneda} onChange={setFMoneda} width="w-28">
            <option value="">Todas</option>
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
          </Select>
          <div className="flex items-end gap-2">
            <button className="h-9 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" onClick={() => void fetchAll()}>
              Filtrar
            </button>
            <button
              className="h-9 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => { setFAnio(''); setFMes(''); setFEmpresa(''); setFMoneda('') }}
            >
              Limpiar
            </button>
            <button
              className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white"
              onClick={() => { setShowForm(v => !v); setFormError(null) }}
            >
              {showForm ? 'Cancelar' : '+ Nuevo ingreso'}
            </button>
          </div>
        </div>
      </section>

      {/* Formulario nuevo */}
      {showForm ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-950">Nuevo ingreso adicional</h2>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={e => void handleCreate(e)}>
            <div className="md:col-span-3">
              <Input label="Concepto" value={form.concepto} onChange={v => setForm(f => ({ ...f, concepto: v }))} required />
            </div>
            <Select label="Empresa" value={form.empresaId} onChange={v => setForm(f => ({ ...f, empresaId: v }))}>
              <option value="">Sin empresa</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
            <Select label="Año" value={form.anio} onChange={v => setForm(f => ({ ...f, anio: v }))}>
              {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </Select>
            <Select label="Mes" value={form.mes} onChange={v => setForm(f => ({ ...f, mes: v }))}>
              {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </Select>
            <Select label="Moneda" value={form.moneda} onChange={v => setForm(f => ({ ...f, moneda: v }))}>
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
            </Select>
            <Input label="Monto origen" type="number" step="0.01" min="0" value={form.montoOrigen} onChange={v => setForm(f => ({ ...f, montoOrigen: v }))} required />
            {form.moneda === 'USD' ? (
              <Input label="Tipo de cambio" type="number" step="0.01" min="0" value={form.tipoCambioAplicado} onChange={v => setForm(f => ({ ...f, tipoCambioAplicado: v }))} required />
            ) : null}
            {ivaPreview !== null ? (
              <div className="flex flex-col justify-center gap-1 rounded-md border border-emerald-200 bg-white px-4 py-2">
                <div className="text-sm text-slate-600">IVA (22%): <span className="font-semibold text-slate-950">${fmt(ivaPreview)}</span></div>
                <div className="text-sm text-slate-600">Total c/IVA: <span className="font-semibold text-emerald-700">${fmt(Number(form.montoOrigen) * 1.22)}</span></div>
              </div>
            ) : null}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700">
                Observaciones
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                />
              </label>
            </div>
            {formError ? <p className="md:col-span-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
            <div className="flex gap-2 md:col-span-3">
              <button className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">
                {saving ? 'Guardando…' : 'Crear ingreso'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Tabla */}
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <Th>Período</Th>
                <Th>Empresa</Th>
                <Th>Concepto</Th>
                <Th>Moneda</Th>
                <Th>Monto S/IVA</Th>
                <Th>IVA</Th>
                <Th>Monto C/IVA</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={8}>Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={8}>No hay ingresos para los filtros seleccionados.</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <Td>{mesLabel(row.mes)} {row.anio}</Td>
                  <Td>{row.empresa ?? '—'}</Td>
                  <td className="min-w-0 px-4 py-3 text-slate-700">
                    <span className="block max-w-xs truncate" title={row.concepto}>{row.concepto}</span>
                  </td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.moneda === 'USD' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                      {row.moneda}
                    </span>
                  </Td>
                  <Td>${fmt(row.montoSinIva)}</Td>
                  <Td>${fmt(row.iva)}</Td>
                  <Td>${fmt(row.montoConIva)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => openEdit(row)}
                        type="button"
                        title="Editar"
                      >
                        <PencilIcon />
                        Editar
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50"
                        onClick={() => void handleDelete(row)}
                        type="button"
                        title="Eliminar"
                      >
                        <TrashIcon />
                        Eliminar
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal edición */}
      {editingRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-950">Editar ingreso</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={e => void handleEdit(e)}>
              <div className="md:col-span-2">
                <Input label="Concepto" value={editForm.concepto} onChange={v => setEditForm(f => ({ ...f, concepto: v }))} required />
              </div>
              <Select label="Empresa" value={editForm.empresaId} onChange={v => setEditForm(f => ({ ...f, empresaId: v }))}>
                <option value="">Sin empresa</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </Select>
              <Select label="Año" value={editForm.anio} onChange={v => setEditForm(f => ({ ...f, anio: v }))}>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </Select>
              <Select label="Mes" value={editForm.mes} onChange={v => setEditForm(f => ({ ...f, mes: v }))}>
                {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </Select>
              <Select label="Moneda" value={editForm.moneda} onChange={v => setEditForm(f => ({ ...f, moneda: v }))}>
                <option value="UYU">UYU</option>
                <option value="USD">USD</option>
              </Select>
              <Input label="Monto origen" type="number" step="0.01" min="0" value={editForm.montoOrigen} onChange={v => setEditForm(f => ({ ...f, montoOrigen: v }))} required />
              {editForm.moneda === 'USD' ? (
                <Input label="Tipo de cambio" type="number" step="0.01" min="0" value={editForm.tipoCambioAplicado} onChange={v => setEditForm(f => ({ ...f, tipoCambioAplicado: v }))} required />
              ) : null}
              {editIvaPreview !== null ? (
                <div className="flex flex-col justify-center gap-1 rounded-md border border-emerald-200 bg-white px-4 py-2 md:col-span-2">
                  <div className="text-sm text-slate-600">IVA (22%): <span className="font-semibold text-slate-950">${fmt(editIvaPreview)}</span></div>
                  <div className="text-sm text-slate-600">Total c/IVA: <span className="font-semibold text-emerald-700">${fmt(Number(editForm.montoOrigen) * 1.22)}</span></div>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Observaciones
                  <textarea
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={2}
                    value={editForm.observaciones}
                    onChange={e => setEditForm(f => ({ ...f, observaciones: e.target.value }))}
                  />
                </label>
              </div>
              {editError ? <p className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p> : null}
              <div className="flex gap-2 md:col-span-2">
                <button className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={editSaving} type="submit">
                  {editSaving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => setEditingRow(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap px-4 py-3 text-slate-700">{children}</td>
}

function Input({
  label, value, onChange, type = 'text', placeholder, width = 'w-full', step, min, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; width?: string; step?: string; min?: string; required?: boolean
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className={`mt-1 block h-9 ${width} rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} step={step} min={min} required={required}
      />
    </label>
  )
}

function Select({
  label, value, onChange, children, width = 'w-full',
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; width?: string
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        className={`mt-1 block h-9 ${width} rounded-md border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  )
}
