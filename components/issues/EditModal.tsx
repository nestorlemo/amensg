'use client'

import { useState } from 'react'

import { DateInput } from '@/components/date-input'

import {
  ESTADOS, PRIORIDADES, SISTEMAS,
  Issue, Empresa, IssueConfig, FormState,
  calcHoras, ReadonlyField,
} from './types'

function MInput({
  label, value, onChange, type = 'text', step, min, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; step?: string; min?: string; required?: boolean
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        step={step} min={min} required={required}
      />
    </label>
  )
}

function MSelect({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

export function EditModal({
  issue,
  empresas,
  config,
  onSave,
  onClose,
}: {
  issue: Issue
  empresas: Empresa[]
  config: IssueConfig
  onSave: (updated: Issue) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState & { motivoCancelacion: string }>({
    fecha:            issue.fecha,
    descripcion:      issue.descripcion,
    empresaId:        issue.empresa?.id ?? '',
    sistema:          issue.sistema ?? '',
    horasDesarrollo:  String(issue.horasDesarrollo),
    prioridad:        issue.prioridad,
    estado:           issue.estado,
    reportadoPor:     issue.reportadoPor,
    fechaProduccion:  issue.fechaProduccion ?? '',
    motivoCancelacion: issue.motivoCancelacion ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const { dev, test, rework, total } = calcHoras(form.horasDesarrollo, config.porcentajeTest, config.porcentajeRework)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.estado === 'CANCELADO' && !form.motivoCancelacion.trim()) {
      setError('El motivo de cancelación es requerido.')
      return
    }
    if (form.estado === 'EN_PRODUCCION' && !form.fechaProduccion) {
      setError('La fecha en producción es requerida.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha:            form.fecha,
          descripcion:      form.descripcion,
          empresaId:        form.empresaId || null,
          sistema:          form.sistema || null,
          horasDesarrollo:  dev,
          horasTest:        test,
          horasRework:      rework,
          prioridad:        form.prioridad,
          estado:           form.estado,
          reportadoPor:     form.reportadoPor,
          fechaProduccion:  form.estado === 'EN_PRODUCCION' ? form.fechaProduccion : null,
          motivoCancelacion: form.estado === 'CANCELADO' ? form.motivoCancelacion.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Error al guardar.'); return }
      onSave(data as Issue)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  function handleEstadoEdit(nuevoEstado: string) {
    setForm((f) => ({
      ...f,
      estado: nuevoEstado,
      fechaProduccion: nuevoEstado === 'EN_PRODUCCION' ? '' : '',
    }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-2xl md:rounded-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Editar issue</h2>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={(e) => void handleSave(e)}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Fecha
              <DateInput className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.fecha} onChange={set('fecha')} required />
            </label>
            <MSelect label="Estado" value={form.estado} onChange={handleEstadoEdit}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </MSelect>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Descripción
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                required
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <MSelect label="Empresa" value={form.empresaId} onChange={set('empresaId')}>
              <option value="">Sin empresa</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </MSelect>
            <MSelect label="Prioridad" value={form.prioridad} onChange={set('prioridad')}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </MSelect>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <MSelect label="Sistema" value={form.sistema} onChange={set('sistema')}>
              <option value="">Sin sistema</option>
              {SISTEMAS.map((s) => <option key={s} value={s}>{s}</option>)}
            </MSelect>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <MInput
              label="Horas desarrollo"
              type="number"
              step="0.25"
              min="0"
              value={form.horasDesarrollo}
              onChange={set('horasDesarrollo')}
              required
            />
            <MInput label="Reportado por" value={form.reportadoPor} onChange={set('reportadoPor')} required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ReadonlyField label={`Test (${config.porcentajeTest}%)`}  value={dev > 0 ? `${test}h`   : '—'} />
            <ReadonlyField label={`Rework (${config.porcentajeRework}%)`} value={dev > 0 ? `${rework}h` : '—'} />
            <ReadonlyField label="Total horas" value={dev > 0 ? `${total}h` : '—'} highlight />
          </div>

          {form.estado === 'EN_PRODUCCION' ? (
            <label className="block text-sm font-medium text-slate-700">
              Fecha en producción <span className="text-red-500">*</span>
              <DateInput className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.fechaProduccion} onChange={set('fechaProduccion')} required />
            </label>
          ) : null}

          {form.estado === 'CANCELADO' ? (
            <label className="block text-sm font-medium text-slate-700">
              Motivo de cancelación <span className="text-red-500">*</span>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
                value={form.motivoCancelacion}
                onChange={(e) => setForm((f) => ({ ...f, motivoCancelacion: e.target.value }))}
                required
              />
            </label>
          ) : null}

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
