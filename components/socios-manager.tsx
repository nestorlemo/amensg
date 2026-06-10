'use client'

import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { Badge, Button, ModalShell } from '@/components/ui/index'
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

type SocioForm = {
  nombre: string
  porcentajeParticipacion: string
  cuentaPesos: string
  cuentaUsd: string
  activo: boolean
}

function formatPercent(value: string) {
  return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 4 }).format(Number(value))}%`
}

async function apiRequest(url: string, method: string, body: Record<string, unknown>) {
  const r = await requestJson(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 'No se pudo completar la operación.')
  return r.ok === true ? { ok: true, error: null } : { ok: false, error: (r as { ok: false; error: string }).error }
}

export function SociosManager({ socios: initial, validation }: { socios: Socio[]; validation: SociosValidation }) {
  const [socios, setSocios]         = useState(initial)
  const [editTarget, setEditTarget] = useState<Socio | null>(null)
  const [showNew, setShowNew]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function handleSaved(updated: Socio) {
    setSocios((prev) => prev.map((s) => s.id === updated.id ? updated : s))
    setEditTarget(null)
  }

  function handleCreated(created: Socio) {
    setSocios((prev) => [...prev, created])
    setShowNew(false)
  }

  async function handleDeactivate(id: string) {
    setError(null)
    const result = await apiRequest(`/api/socios/${id}/desactivar`, 'POST', {})
    if (!result.ok) { setError(result.error); return }
    setSocios((prev) => prev.map((s) => s.id === id ? { ...s, activo: false } : s))
  }

  return (
    <div className="space-y-4">
      {/* Validation banner */}
      <section className={`rounded-xl border p-4 ${validation.isValid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className={`text-sm font-semibold ${validation.isValid ? 'text-emerald-950' : 'text-amber-950'}`}>{validation.message}</p>
        <p className="mt-1 text-sm text-slate-700">
          Total activo: {formatPercent(validation.totalPercent)} · Socios activos: {validation.activeCount}
        </p>
      </section>

      {/* Table card */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Socios</h2>
          <Button variant="primary" size="sm" onClick={() => { setShowNew(true); setError(null) }}>+ Nuevo socio</Button>
        </div>

        {error ? <div className="px-5 py-3"><AlertError>{error}</AlertError></div> : null}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {['Nombre', 'Porcentaje', 'Cuenta pesos', 'Cuenta USD', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {socios.map((s, i) => (
                <tr key={s.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-5 py-3 font-medium text-slate-900">{s.nombre}</td>
                  <td className="px-5 py-3 tabular-nums text-slate-700">{formatPercent(s.porcentajeDisplay)}</td>
                  <td className="px-5 py-3 text-slate-500">{s.cuentaPesos || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3 text-slate-500">{s.cuentaUsd || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3">
                    <Badge variant={s.activo ? 'activo' : 'inactivo'} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditTarget(s)}>Editar</Button>
                      {s.activo ? (
                        <Button variant="danger" size="sm" onClick={() => void handleDeactivate(s.id)}>Desactivar</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {socios.length === 0 ? (
                <tr><td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={6}>No hay socios registrados.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit modal */}
      {editTarget ? (
        <SocioModal
          title="Editar socio"
          initial={{ nombre: editTarget.nombre, porcentajeParticipacion: editTarget.porcentajeDisplay, cuentaPesos: editTarget.cuentaPesos, cuentaUsd: editTarget.cuentaUsd, activo: editTarget.activo }}
          onSave={async (form) => {
            const result = await apiRequest(`/api/socios/${editTarget.id}`, 'PUT', {
              nombre: form.nombre, porcentajeParticipacion: form.porcentajeParticipacion,
              cuentaPesos: form.cuentaPesos, cuentaUsd: form.cuentaUsd, activo: form.activo,
            })
            if (!result.ok) return result.error
            handleSaved({ ...editTarget, nombre: form.nombre, porcentajeParticipacion: form.porcentajeParticipacion, porcentajeDisplay: form.porcentajeParticipacion, cuentaPesos: form.cuentaPesos, cuentaUsd: form.cuentaUsd, activo: form.activo })
            return null
          }}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      {/* New modal */}
      {showNew ? (
        <SocioModal
          title="Nuevo socio"
          initial={{ nombre: '', porcentajeParticipacion: '', cuentaPesos: '', cuentaUsd: '', activo: true }}
          onSave={async (form) => {
            const result = await apiRequest('/api/socios', 'POST', {
              nombre: form.nombre, porcentajeParticipacion: form.porcentajeParticipacion,
              cuentaPesos: form.cuentaPesos, cuentaUsd: form.cuentaUsd, activo: form.activo,
            })
            if (!result.ok) return result.error
            handleCreated({ id: crypto.randomUUID(), nombre: form.nombre, porcentajeParticipacion: form.porcentajeParticipacion, porcentajeDisplay: form.porcentajeParticipacion, cuentaPesos: form.cuentaPesos, cuentaUsd: form.cuentaUsd, activo: form.activo })
            return null
          }}
          onClose={() => setShowNew(false)}
        />
      ) : null}
    </div>
  )
}

function SocioModal({
  title,
  initial,
  onSave,
  onClose,
}: {
  title: string
  initial: SocioForm
  onSave: (form: SocioForm) => Promise<string | null>
  onClose: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (key: keyof SocioForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const err = await onSave(form)
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <ModalShell isOpen={true} onClose={onClose} title={title}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <SField label="Nombre" value={form.nombre} onChange={set('nombre')} required />
        <SField label="Porcentaje" value={form.porcentajeParticipacion} onChange={set('porcentajeParticipacion')} placeholder="12" required />
        <SField label="Cuenta pesos" value={form.cuentaPesos} onChange={set('cuentaPesos')} />
        <SField label="Cuenta USD" value={form.cuentaUsd} onChange={set('cuentaUsd')} />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input className="h-4 w-4" type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
          Activo
        </label>
        {error ? <AlertError>{error}</AlertError> : null}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </ModalShell>
  )
}

function SField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" {...props} />
    </label>
  )
}
