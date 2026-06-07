'use client'

import { useEffect, useState } from 'react'

import { DateInput } from '@/components/date-input'
import { PageHeader } from '@/components/page-header'
import { CancelModal } from '@/components/issues/CancelModal'
import { EditModal } from '@/components/issues/EditModal'
import { PencilIcon, TrashIcon } from '@/components/issues/IssueIcons'
import { ProduccionModal } from '@/components/issues/ProduccionModal'
import {
  ESTADOS, PRIORIDADES, SISTEMAS,
  Issue, Empresa, IssueConfig, FormState,
  EMPTY_FORM, calcHoras, ReadonlyField,
} from '@/components/issues/types'

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:     'bg-slate-100 text-slate-700',
  EN_DESARROLLO: 'bg-blue-100 text-blue-800',
  EN_TEST:       'bg-yellow-100 text-yellow-800',
  EN_PRODUCCION: 'bg-emerald-100 text-emerald-800',
  CANCELADO:     'bg-red-100 text-red-700',
}


export default function IssuesPage() {
  const now = new Date()
  const todayISO = now.toISOString().split('T')[0]!

  const [issues, setIssues]     = useState<Issue[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [config, setConfig]     = useState<IssueConfig>({ porcentajeTest: 30, porcentajeRework: 15, valorHoraUSD: 0 })
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [cancelPending, setCancelPending]       = useState<Issue | null>(null)
  const [produccionPending, setProduccionPending] = useState<Issue | null>(null)

  // Filters
  const [fEstado, setFEstado]           = useState('')
  const [fEmpresa, setFEmpresa]         = useState('')
  const [fSistema, setFSistema]         = useState('')

  const [fDesde, setFDesde]             = useState('')
  const [fHasta, setFHasta]             = useState('')
  const [fFacturacion, setFFacturacion] = useState('')

  // Create form
  const [form, setForm] = useState({ ...EMPTY_FORM, fecha: todayISO })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { dev: cDevHoras, test: cTestHoras, rework: cReworkHoras, total: cTotalHoras } =
    calcHoras(form.horasDesarrollo, config.porcentajeTest, config.porcentajeRework)
  const montoEstForm = Math.round(cTotalHoras * config.valorHoraUSD * 100) / 100

  useEffect(() => {
    fetch('/api/empresas')
      .then((r) => r.json())
      .then((d) => setEmpresas((d.empresas ?? []).filter((e: Empresa & { activa?: boolean }) => e.activa !== false)))
      .catch(() => null)
    fetch('/api/issues/config')
      .then((r) => r.json())
      .then((d: IssueConfig) => setConfig(d))
      .catch(() => null)
  }, [])

  useEffect(() => { void fetchAll() }, [fEstado, fEmpresa, fSistema, fDesde, fHasta, fFacturacion]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (fEstado)      qs.set('estado',      fEstado)
      if (fEmpresa)     qs.set('empresaId',   fEmpresa)
      if (fSistema)     qs.set('sistema',     fSistema)
      if (fDesde)       qs.set('fechaDesde',  fDesde)
      if (fHasta)       qs.set('fechaHasta',  fHasta)
      if (fFacturacion) qs.set('facturacion', fFacturacion)
      const res  = await fetch(`/api/issues?${qs}`)
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
    if (form.estado === 'EN_PRODUCCION' && !form.fechaProduccion) {
      setFormError('La fecha puesta en producción es obligatoria cuando el estado es EN_PRODUCCION.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          horasDesarrollo: cDevHoras,
          horasTest:       cTestHoras,
          horasRework:     cReworkHoras,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.message ?? 'Error al crear.'); return }
      setShowForm(false)
      setForm({ ...EMPTY_FORM, fecha: todayISO })
      void fetchAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleEstadoChange(issue: Issue, nuevoEstado: string) {
    if (nuevoEstado === 'CANCELADO') {
      setCancelPending({ ...issue, estado: nuevoEstado })
      return
    }
    if (nuevoEstado === 'EN_PRODUCCION') {
      setProduccionPending({ ...issue, estado: nuevoEstado })
      return
    }
    await fetch(`/api/issues/${issue.id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado, fechaProduccion: null }),
    })
    void fetchAll()
  }

  async function handleConfirmProduccion(id: string, fechaProduccion: string) {
    await fetch(`/api/issues/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'EN_PRODUCCION', fechaProduccion }),
    })
    setProduccionPending(null)
    void fetchAll()
  }

  async function handleConfirmCancel(id: string, motivoCancelacion: string) {
    await fetch(`/api/issues/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADO', motivoCancelacion }),
    })
    setCancelPending(null)
    void fetchAll()
  }

  function handleEditSaved(updated: Issue) {
    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setEditingIssue(null)
  }

  async function handleDelete(issue: Issue) {
    if (!window.confirm('¿Eliminar este issue? No aparecerá más en el sistema.')) return
    const res = await fetch(`/api/issues/${issue.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      alert('No se puede eliminar un issue facturado.')
      return
    }
    void fetchAll()
  }

  const enProduccion     = issues.filter((i) => i.estado === 'EN_PRODUCCION')
  const totalHorasMes    = enProduccion.reduce((s, i) => s + i.totalHoras, 0)
  const montoEstimadoMes = Math.round(totalHorasMes * config.valorHoraUSD * 100) / 100

  return (
    <div className="space-y-6">
      <PageHeader section="DESARROLLO" title="Issues" description="Gestión de issues de desarrollo por empresa." />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Issues totales"       value={String(issues.length)} />
        <SummaryCard label="En producción"        value={String(enProduccion.length)} />
        <SummaryCard label="Horas en producción"  value={`${totalHorasMes.toFixed(1)}h`} />
        <SummaryCard
          label={`Monto est. (USD ${config.valorHoraUSD > 0 ? `$${config.valorHoraUSD}` : 'sin configurar'})`}
          value={montoEstimadoMes > 0 ? `$${montoEstimadoMes.toFixed(2)}` : '—'}
        />
      </div>

      {/* Filtros */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        {/* Fila 1: filtros de estado/empresa/prioridad/facturación + Filtrar */}
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Estado" value={fEstado} onChange={setFEstado} width="w-36">
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select label="Empresa" value={fEmpresa} onChange={setFEmpresa} width="w-44">
            <option value="">Todas</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Select>
          <Select label="Sistema" value={fSistema} onChange={setFSistema} width="w-48">
            <option value="">Todos</option>
            {SISTEMAS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select label="Facturación" value={fFacturacion} onChange={setFFacturacion} width="w-36">
            <option value="">Todos</option>
            <option value="sin_facturar">Sin facturar</option>
            <option value="facturado">Facturado</option>
          </Select>
          <div className="flex items-end">
            <button
              className="h-9 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
              onClick={() => void fetchAll()}
            >
              Filtrar
            </button>
          </div>
        </div>
        {/* Fila 2: fechas + botones de acción */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Fecha prod. desde
            <DateInput className="mt-1 block h-9 w-36 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={fDesde} onChange={setFDesde} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Fecha prod. hasta
            <DateInput className="mt-1 block h-9 w-36 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={fHasta} onChange={setFHasta} />
          </label>
          <div className="ml-auto flex items-end gap-3">
            <button
              className="h-9 rounded-md border border-emerald-600 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                const qs = new URLSearchParams()
                if (fEstado)      qs.set('estado',      fEstado)
                if (fEmpresa)     qs.set('empresaId',   fEmpresa)
                if (fSistema)     qs.set('sistema',     fSistema)
                if (fDesde)       qs.set('fechaDesde',  fDesde)
                if (fHasta)       qs.set('fechaHasta',  fHasta)
                if (fFacturacion) qs.set('facturacion', fFacturacion)
                window.location.href = `/api/issues/export?${qs}`
              }}
            >
              Exportar Excel
            </button>
            <button
              className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancelar' : '+ Nuevo issue'}
            </button>
          </div>
        </div>
      </section>

      {/* Formulario nuevo issue */}
      {showForm ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-950">Nuevo issue</h2>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => void handleCreate(e)}>
            <label className="block text-sm font-medium text-slate-700">
              Fecha
              <DateInput className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} required />
            </label>
            <Select label="Empresa" value={form.empresaId} onChange={(v) => setForm((f) => ({ ...f, empresaId: v }))}>
              <option value="">Sin empresa</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
            <Select label="Sistema" value={form.sistema} onChange={(v) => setForm((f) => ({ ...f, sistema: v }))}>
              <option value="">Sin sistema</option>
              {SISTEMAS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label="Prioridad" value={form.prioridad} onChange={(v) => setForm((f) => ({ ...f, prioridad: v }))}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700">
                Descripción
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  required
                />
              </label>
            </div>
            <Input
              label="Horas de desarrollo"
              type="number" step="0.25" min="0"
              value={form.horasDesarrollo}
              onChange={(v) => setForm((f) => ({ ...f, horasDesarrollo: v }))}
              required
            />
            <ReadonlyField label={`Test (${config.porcentajeTest}%)`}    value={cDevHoras > 0 ? `${cTestHoras}h`   : '—'} />
            <ReadonlyField label={`Rework (${config.porcentajeRework}%)`} value={cDevHoras > 0 ? `${cReworkHoras}h` : '—'} />
            <Input label="Reportado por" value={form.reportadoPor} onChange={(v) => setForm((f) => ({ ...f, reportadoPor: v }))} required />
            <Select label="Estado inicial" value={form.estado} onChange={(v) => setForm((f) => ({ ...f, estado: v, fechaProduccion: '' }))}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </Select>
            {form.estado === 'EN_PRODUCCION' ? (
              <label className="block text-sm font-medium text-slate-700">
                Fecha puesta en producción
                <DateInput
                  className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={form.fechaProduccion ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, fechaProduccion: v }))}
                  required
                />
              </label>
            ) : null}
            {cDevHoras > 0 ? (
              <div className="flex flex-col justify-center gap-1 rounded-md border border-emerald-200 bg-white px-4 py-2">
                <div className="text-sm text-slate-600">
                  Total: <span className="font-semibold text-slate-950">{cTotalHoras.toFixed(2)}h</span>
                </div>
                {config.valorHoraUSD > 0 ? (
                  <div className="text-sm text-slate-600">
                    Est.: <span className="font-semibold text-emerald-700">${montoEstForm.toFixed(2)} USD</span>
                  </div>
                ) : null}
                <div className="text-xs text-slate-400">
                  Valor hora: {config.valorHoraUSD > 0 ? `USD $${config.valorHoraUSD}` : 'no configurado'}
                </div>
              </div>
            ) : null}
            {formError ? (
              <p className="md:col-span-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            ) : null}
            <div className="flex gap-2 md:col-span-3">
              <button
                className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={saving}
                type="submit"
              >
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
                <Th>Fecha reg.</Th>
                <Th>Fecha prod.</Th>
                <Th>Descripción</Th>
                <Th>Empresa</Th>
                <Th>Sistema</Th>
                <Th>Horas</Th>
                <Th>Estado</Th>
                <Th>Facturación</Th>
                <Th>Reportado por</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={10}>Cargando…</td></tr>
              ) : issues.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={10}>No hay issues para los filtros seleccionados.</td></tr>
              ) : issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-50">
                  <Td>{issue.fecha ? issue.fecha.split('T')[0]!.split('-').reverse().join('/') : '—'}</Td>
                  <Td>{issue.fechaProduccion ? issue.fechaProduccion.split('-').reverse().join('/') : '—'}</Td>
                  <td className="min-w-0 px-4 py-3 text-slate-700">
                    <span className="block max-w-xs truncate" title={issue.descripcion}>
                      {issue.descripcion.length > 80 ? `${issue.descripcion.slice(0, 80)}…` : issue.descripcion}
                    </span>
                  </td>
                  <Td>{issue.empresa?.nombre ?? '—'}</Td>
                  <Td>{issue.sistema ?? '—'}</Td>
                  <Td>
                    <span
                      className="cursor-default"
                      title={`Dev: ${issue.horasDesarrollo}h | Test: ${issue.horasTest}h | Rework: ${issue.horasRework}h`}
                    >
                      {issue.totalHoras}h
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <select
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[issue.estado] ?? 'bg-slate-100 text-slate-700'}`}
                        value={issue.estado}
                        onChange={(e) => void handleEstadoChange(issue, e.target.value)}
                      >
                        {ESTADOS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                      {issue.estado === 'CANCELADO' && issue.motivoCancelacion ? (
                        <span className="block max-w-[160px] truncate text-[10px] text-red-500" title={issue.motivoCancelacion}>
                          {issue.motivoCancelacion}
                        </span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    {issue.facturado
                      ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Facturado</span>
                      : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Sin facturar</span>
                    }
                  </Td>
                  <Td>{issue.reportadoPor}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => setEditingIssue(issue)}
                        title="Editar issue"
                        type="button"
                      >
                        <PencilIcon />
                        Editar
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={issue.facturado}
                        onClick={() => !issue.facturado && void handleDelete(issue)}
                        title={issue.facturado ? 'No se puede eliminar un issue facturado' : 'Eliminar issue'}
                        type="button"
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

      {/* Produccion Modal */}
      {produccionPending ? (
        <ProduccionModal
          issueId={produccionPending.id}
          descripcion={produccionPending.descripcion}
          onConfirm={handleConfirmProduccion}
          onClose={() => setProduccionPending(null)}
        />
      ) : null}

      {/* Cancel Modal */}
      {cancelPending ? (
        <CancelModal
          issueId={cancelPending.id}
          descripcion={cancelPending.descripcion}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelPending(null)}
        />
      ) : null}

      {/* Edit Modal */}
      {editingIssue ? (
        <EditModal
          issue={editingIssue}
          empresas={empresas}
          config={config}
          onSave={handleEditSaved}
          onClose={() => setEditingIssue(null)}
        />
      ) : null}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
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
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  )
}
