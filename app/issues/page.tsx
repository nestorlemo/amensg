'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'

const ESTADOS = ['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO', 'NO_HACER'] as const
const PRIORIDADES = ['ALTA', 'MEDIA', 'BAJA'] as const

type Issue = {
  id: string
  fecha: string
  descripcion: string
  horasDesarrollo: number
  horasTest: number
  horasRework: number
  totalHoras: number
  estado: string
  fechaProduccion: string | null
  reportadoPor: string
  prioridad: string
  empresa: { id: string; nombre: string } | null
}

type Empresa = { id: string; nombre: string }

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:      'bg-slate-100 text-slate-700',
  EN_DESARROLLO:  'bg-blue-100 text-blue-800',
  EN_TEST:        'bg-yellow-100 text-yellow-800',
  EN_PRODUCCION:  'bg-emerald-100 text-emerald-800',
  CANCELADO:      'bg-red-100 text-red-700',
  NO_HACER:       'bg-slate-200 text-slate-600',
}

const PRIORIDAD_BADGE: Record<string, string> = {
  ALTA:  'bg-red-100 text-red-700',
  MEDIA: 'bg-yellow-100 text-yellow-800',
  BAJA:  'bg-slate-100 text-slate-600',
}

export default function IssuesPage() {
  const now = new Date()
  const [issues, setIssues]       = useState<Issue[]>([])
  const [empresas, setEmpresas]   = useState<Empresa[]>([])
  const [valorHora, setValorHora] = useState<number>(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)

  // Filters
  const [fEstado, setFEstado]       = useState('')
  const [fEmpresa, setFEmpresa]     = useState('')
  const [fPrioridad, setFPrioridad] = useState('')
  const [fAnio, setFAnio]           = useState(String(now.getFullYear()))
  const [fMes, setFMes]             = useState('')

  // Form state
  const [form, setForm] = useState({
    fecha: now.toISOString().split('T')[0],
    descripcion: '',
    empresaId: '',
    horasDesarrollo: '',
    horasTest: '',
    horasRework: '',
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    reportadoPor: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fEstado, fEmpresa, fPrioridad, fAnio, fMes])

  useEffect(() => {
    fetch('/api/empresas')
      .then((r) => r.json())
      .then((d) => setEmpresas(d.empresas ?? []))
      .catch(() => null)
    fetch('/api/valor-hora')
      .then((r) => r.json())
      .then((d) => setValorHora(d.actual?.valorUSD ?? 0))
      .catch(() => null)
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (fEstado)   qs.set('estado',    fEstado)
      if (fEmpresa)  qs.set('empresaId', fEmpresa)
      if (fPrioridad) qs.set('prioridad', fPrioridad)
      if (fAnio)     qs.set('anio',      fAnio)
      if (fMes)      qs.set('mes',       fMes)
      const res = await fetch(`/api/issues?${qs}`)
      const data = await res.json()
      setIssues(data.issues ?? [])
    } catch {
      setError('Error al cargar issues.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          horasDesarrollo: Number(form.horasDesarrollo),
          horasTest: Number(form.horasTest || 0),
          horasRework: Number(form.horasRework || 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.message ?? 'Error al crear.'); return }
      setShowForm(false)
      setForm({ fecha: now.toISOString().split('T')[0], descripcion: '', empresaId: '', horasDesarrollo: '', horasTest: '', horasRework: '', prioridad: 'MEDIA', estado: 'PENDIENTE', reportadoPor: '' })
      void fetchAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleEstado(id: string, estado: string) {
    await fetch(`/api/issues/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    void fetchAll()
  }

  const totalHorasMes = issues.filter((i) => i.estado === 'EN_PRODUCCION').reduce((s, i) => s + i.totalHoras, 0)
  const montoEstimado = totalHorasMes * valorHora

  const totalHorasForm = (Number(form.horasDesarrollo) || 0) + (Number(form.horasTest) || 0) + (Number(form.horasRework) || 0)
  const montoEstimadoForm = totalHorasForm * valorHora

  return (
    <div className="space-y-6">
      <PageHeader section="DESARROLLO" title="Issues" description="Gestión de issues de desarrollo por empresa." />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Issues totales"    value={String(issues.length)} />
        <SummaryCard label="En producción"     value={String(issues.filter((i) => i.estado === 'EN_PRODUCCION').length)} />
        <SummaryCard label="Horas en producción" value={`${totalHorasMes.toFixed(1)}h`} />
        <SummaryCard label={`Monto est. (USD ${valorHora > 0 ? `$${valorHora}` : 'sin valor'})`} value={montoEstimado > 0 ? `$${montoEstimado.toFixed(2)}` : '—'} />
      </div>

      {/* Filtros */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Estado" value={fEstado} onChange={setFEstado}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
          </Select>
          <Select label="Empresa" value={fEmpresa} onChange={setFEmpresa}>
            <option value="">Todas</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Select>
          <Select label="Prioridad" value={fPrioridad} onChange={setFPrioridad}>
            <option value="">Todas</option>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="Año" value={fAnio} onChange={setFAnio} placeholder="2026" width="w-20" />
          <Input label="Mes" value={fMes} onChange={setFMes} placeholder="Todos" width="w-16" />
          <button className="h-9 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" onClick={() => void fetchAll()}>Filtrar</button>
          <button className="ml-auto h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '+ Nuevo issue'}
          </button>
        </div>
      </section>

      {/* Formulario nuevo issue */}
      {showForm ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-950">Nuevo issue</h2>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => void handleCreate(e)}>
            <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} />
            <Select label="Empresa" value={form.empresaId} onChange={(v) => setForm((f) => ({ ...f, empresaId: v }))}>
              <option value="">Sin empresa</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
            <Select label="Prioridad" value={form.prioridad} onChange={(v) => setForm((f) => ({ ...f, prioridad: v }))}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                required
              />
            </div>
            <Input label="Horas desarrollo" type="number" step="0.25" value={form.horasDesarrollo} onChange={(v) => setForm((f) => ({ ...f, horasDesarrollo: v }))} required />
            <Input label="Horas test" type="number" step="0.25" value={form.horasTest} onChange={(v) => setForm((f) => ({ ...f, horasTest: v }))} />
            <Input label="Horas rework" type="number" step="0.25" value={form.horasRework} onChange={(v) => setForm((f) => ({ ...f, horasRework: v }))} />
            <Input label="Reportado por" value={form.reportadoPor} onChange={(v) => setForm((f) => ({ ...f, reportadoPor: v }))} required />
            <Select label="Estado inicial" value={form.estado} onChange={(v) => setForm((f) => ({ ...f, estado: v }))}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
            </Select>
            <div className="flex items-end gap-4 rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="text-sm text-slate-600">Total: <span className="font-semibold text-slate-950">{totalHorasForm.toFixed(2)}h</span></div>
              {valorHora > 0 && <div className="text-sm text-slate-600">Est: <span className="font-semibold text-emerald-700">${montoEstimadoForm.toFixed(2)}</span></div>}
            </div>
            {formError && <p className="col-span-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="flex gap-2 md:col-span-3">
              <button className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">
                {saving ? 'Guardando…' : 'Crear issue'}
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
                <Th>Fecha</Th>
                <Th>Descripción</Th>
                <Th>Empresa</Th>
                <Th>Horas</Th>
                <Th>Estado</Th>
                <Th>Prioridad</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={7}>Cargando…</td></tr>
              ) : issues.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={7}>No hay issues para los filtros seleccionados.</td></tr>
              ) : issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-50">
                  <Td>{issue.fecha}</Td>
                  <Td>
                    <span title={issue.descripcion} className="block max-w-xs truncate">
                      {issue.descripcion.length > 80 ? issue.descripcion.slice(0, 80) + '…' : issue.descripcion}
                    </span>
                  </Td>
                  <Td>{issue.empresa?.nombre ?? '—'}</Td>
                  <Td>{issue.totalHoras}h</Td>
                  <Td>
                    <select
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[issue.estado] ?? 'bg-slate-100 text-slate-700'}`}
                      value={issue.estado}
                      onChange={(e) => void handleEstado(issue.id, e.target.value)}
                    >
                      {ESTADOS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORIDAD_BADGE[issue.prioridad] ?? ''}`}>
                      {issue.prioridad}
                    </span>
                  </Td>
                  <Td>
                    <a className="text-blue-600 hover:underline text-xs" href={`/api/issues/${issue.id}`} target="_blank">Ver</a>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

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

function Input({ label, value, onChange, type = 'text', placeholder, width = 'w-full', step, required }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; width?: string; step?: string; required?: boolean
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className={`mt-1 block h-9 ${width} rounded-md border border-slate-300 px-3 text-sm`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        required={required}
      />
    </label>
  )
}

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  )
}
