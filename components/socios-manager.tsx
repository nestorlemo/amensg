'use client'

import { useState } from 'react'

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

type FormData = {
  nombre: string
  porcentaje: string
  cuentaPesos: string
  cuentaUsd: string
  activo: boolean
}

const EMPTY_FORM: FormData = {
  nombre: '',
  porcentaje: '',
  cuentaPesos: '',
  cuentaUsd: '',
  activo: true,
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return activo
    ? <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">Activo</span>
    : <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-500">Inactivo</span>
}

function PencilIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button className="rounded-md p-1 text-slate-400 hover:bg-slate-200" onClick={onClose} type="button">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  )
}

function TextInput({ value, onChange, type = 'text', placeholder, required }: {
  value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <input
      className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required}
    />
  )
}

export function SociosManager({ socios: initialSocios, validation: initialValidation }: { socios: Socio[]; validation: SociosValidation }) {
  const [socios, setSocios] = useState<Socio[]>(initialSocios)
  const [validation, setValidation] = useState<SociosValidation>(initialValidation)
  const [showCreate, setShowCreate] = useState(false)
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState<Socio | null>(null)
  const [createForm, setCreateForm] = useState<FormData>({ ...EMPTY_FORM })
  const [editForm, setEditForm] = useState<FormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refreshSocios() {
    const res = await fetch('/api/socios')
    const data = (await res.json()) as { rows?: Socio[]; validation?: SociosValidation }
    if (data.rows) setSocios(data.rows)
    if (data.validation) setValidation(data.validation)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/socios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: createForm.nombre,
          porcentajeParticipacion: createForm.porcentaje,
          cuentaPesos: createForm.cuentaPesos,
          cuentaUsd: createForm.cuentaUsd,
          activo: createForm.activo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Error al crear socio.'); return }
      setShowCreate(false)
      setCreateForm({ ...EMPTY_FORM })
      await refreshSocios()
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSocio) return
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/socios/${editingSocio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editForm.nombre,
          porcentajeParticipacion: editForm.porcentaje,
          cuentaPesos: editForm.cuentaPesos,
          cuentaUsd: editForm.cuentaUsd,
          activo: editForm.activo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Error al guardar.'); return }
      setEditingSocio(null)
      await refreshSocios()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActivo(socio: Socio) {
    setConfirmDesactivar(null)
    await fetch(`/api/socios/${socio.id}/desactivar`, { method: 'POST' })
    await refreshSocios()
  }

  async function handleActivar(socio: Socio) {
    await fetch(`/api/socios/${socio.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: socio.nombre,
        porcentajeParticipacion: socio.porcentajeDisplay,
        cuentaPesos: socio.cuentaPesos,
        cuentaUsd: socio.cuentaUsd,
        activo: true,
      }),
    })
    await refreshSocios()
  }

  function openEdit(socio: Socio) {
    setEditForm({
      nombre: socio.nombre,
      porcentaje: socio.porcentajeDisplay,
      cuentaPesos: socio.cuentaPesos,
      cuentaUsd: socio.cuentaUsd,
      activo: socio.activo,
    })
    setEditingSocio(socio)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Banner validación */}
      <div className={`flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold ${
        validation.isValid
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}>
        <span>{validation.isValid ? '✓' : '✗'}</span>
        <span>
          {validation.isValid
            ? 'Los socios activos suman 100%'
            : 'Los socios activos no suman 100%'}
        </span>
        <span className="ml-auto text-xs font-normal opacity-70">
          Total activo: {validation.totalPercent}% · {validation.activeCount} socio{validation.activeCount !== 1 ? 's' : ''} activo{validation.activeCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Socios del sistema</h2>
          <button
            className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => { setCreateForm({ ...EMPTY_FORM }); setError(null); setShowCreate(true) }}
          >
            + Nuevo socio
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Nombre</th>
                <th className="whitespace-nowrap px-4 py-3">Porcentaje</th>
                <th className="whitespace-nowrap px-4 py-3">Cuenta Pesos</th>
                <th className="whitespace-nowrap px-4 py-3">Cuenta USD</th>
                <th className="whitespace-nowrap px-4 py-3">Estado</th>
                <th className="whitespace-nowrap px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {socios.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>No hay socios registrados.</td></tr>
              ) : socios.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{s.nombre}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">{s.porcentajeDisplay}%</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.cuentaPesos || <span className="text-slate-300">—</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.cuentaUsd || <span className="text-slate-300">—</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3"><EstadoBadge activo={s.activo} /></td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => openEdit(s)}
                        type="button"
                      >
                        <PencilIcon />
                        Editar
                      </button>
                      <button
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          s.activo
                            ? 'border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50'
                            : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                        onClick={() => s.activo ? setConfirmDesactivar(s) : void handleActivar(s)}
                        type="button"
                      >
                        {s.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal crear */}
      {showCreate && (
        <ModalShell title="Nuevo socio" onClose={() => setShowCreate(false)}>
          <form className="space-y-4 px-6 py-5" onSubmit={(e) => void handleCreate(e)}>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Nombre *">
                <TextInput value={createForm.nombre} onChange={(v) => setCreateForm((f) => ({ ...f, nombre: v }))} placeholder="Ej: Juan Pérez" required />
              </FieldLabel>
              <FieldLabel label="Porcentaje *">
                <TextInput value={createForm.porcentaje} onChange={(v) => setCreateForm((f) => ({ ...f, porcentaje: v }))} placeholder="Ej: 33.33" required />
              </FieldLabel>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Cuenta Pesos">
                <TextInput value={createForm.cuentaPesos} onChange={(v) => setCreateForm((f) => ({ ...f, cuentaPesos: v }))} placeholder="Opcional" />
              </FieldLabel>
              <FieldLabel label="Cuenta USD">
                <TextInput value={createForm.cuentaUsd} onChange={(v) => setCreateForm((f) => ({ ...f, cuentaUsd: v }))} placeholder="Opcional" />
              </FieldLabel>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={createForm.activo}
                onChange={(e) => setCreateForm((f) => ({ ...f, activo: e.target.checked }))}
                className="rounded"
              />
              Activo
            </label>
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setShowCreate(false)} type="button">Cancelar</button>
              <button className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={saving} type="submit">
                {saving ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal editar */}
      {editingSocio && (
        <ModalShell title="Editar socio" onClose={() => setEditingSocio(null)}>
          <form className="space-y-4 px-6 py-5" onSubmit={(e) => void handleEdit(e)}>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Nombre *">
                <TextInput value={editForm.nombre} onChange={(v) => setEditForm((f) => ({ ...f, nombre: v }))} required />
              </FieldLabel>
              <FieldLabel label="Porcentaje *">
                <TextInput value={editForm.porcentaje} onChange={(v) => setEditForm((f) => ({ ...f, porcentaje: v }))} required />
              </FieldLabel>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Cuenta Pesos">
                <TextInput value={editForm.cuentaPesos} onChange={(v) => setEditForm((f) => ({ ...f, cuentaPesos: v }))} placeholder="Opcional" />
              </FieldLabel>
              <FieldLabel label="Cuenta USD">
                <TextInput value={editForm.cuentaUsd} onChange={(v) => setEditForm((f) => ({ ...f, cuentaUsd: v }))} placeholder="Opcional" />
              </FieldLabel>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={editForm.activo}
                onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))}
                className="rounded"
              />
              Activo
            </label>
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setEditingSocio(null)} type="button">Cancelar</button>
              <button className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={saving} type="submit">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal confirmación desactivar */}
      {confirmDesactivar && (
        <ModalShell title="Confirmar desactivación" onClose={() => setConfirmDesactivar(null)}>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-slate-700">
              ¿Desactivar a <span className="font-semibold text-slate-950">{confirmDesactivar.nombre}</span>?
            </p>
            <p className="text-sm text-slate-500">El socio no participará en liquidaciones hasta que sea reactivado.</p>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setConfirmDesactivar(null)} type="button">Cancelar</button>
              <button
                className="h-9 rounded-md bg-amber-500 px-5 text-sm font-semibold text-white hover:bg-amber-600"
                onClick={() => void handleToggleActivo(confirmDesactivar)}
                type="button"
              >
                Desactivar
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
