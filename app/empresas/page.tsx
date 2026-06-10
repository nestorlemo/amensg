'use client'

import { useEffect, useState, useRef } from 'react'
import { Building2, Plus, Search, Pencil, ToggleLeft, ToggleRight, X, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

type Empresa = {
  id: string
  nombre: string
  razonSocial: string | null
  rut: string | null
  direccion: string | null
  contacto: string | null
  mail: string | null
  telefono: string | null
  activa: boolean
  creadaEn: string
}

type EmpresaFormData = {
  nombre: string
  razonSocial: string
  rut: string
  direccion: string
  contacto: string
  mail: string
  telefono: string
}

const EMPTY_FORM: EmpresaFormData = {
  nombre: '', razonSocial: '', rut: '', direccion: '', contacto: '', mail: '', telefono: '',
}

const PRIMARY = '#1769E0'
const BORDER  = '#e6eefc'
const TEXT    = '#0B1F3A'
const MUTED   = '#8ba3c7'
const SURFACE = '#F5F7FA'

// ── helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  let res: Response
  try {
    res = await fetch(url, options)
  } catch {
    return { data: null, error: 'Error de red: no se pudo conectar con el servidor.' }
  }
  let json: Record<string, unknown>
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    return { data: null, error: `Error del servidor (${res.status}). Intente nuevamente.` }
  }
  if (!res.ok) return { data: null, error: (json.message as string) ?? 'Error inesperado.' }
  return { data: json as T, error: null }
}

// ── shared input style ────────────────────────────────────────────────────────

const inputClass = 'h-10 w-full rounded-lg px-3 text-sm outline-none transition-all'
const inputStyle = { background: SURFACE, border: `1.5px solid ${BORDER}`, color: TEXT }

function Field({ label, name, value, onChange, placeholder, type = 'text', required }: {
  label: string; name: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
        {label}{required ? <span style={{ color: '#ef4444' }}> *</span> : null}
      </label>
      <input
        className={inputClass}
        style={inputStyle}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => { e.currentTarget.style.border = `1.5px solid ${PRIMARY}`; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(23,105,224,0.12)' }}
        onBlur={(e) => { e.currentTarget.style.border = `1.5px solid ${BORDER}`; e.currentTarget.style.boxShadow = 'none' }}
      />
    </div>
  )
}

// ── empresa form (create / edit) ──────────────────────────────────────────────

function EmpresaForm({
  initial,
  loading,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: EmpresaFormData
  loading: boolean
  error: string | null
  submitLabel: string
  onSubmit: (data: EmpresaFormData) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<EmpresaFormData>(initial)
  const firstRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (firstRef.current?.querySelector('input') as HTMLInputElement | null)?.focus()
  }, [])

  function set(field: keyof EmpresaFormData) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div ref={firstRef}>
          <Field label="Nombre comercial" name="nombre" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Empresa ABC" required />
        </div>
        <Field label="Razón social" name="razonSocial" value={form.razonSocial} onChange={set('razonSocial')} placeholder="Ej: ABC S.A." />
        <Field label="RUT" name="rut" value={form.rut} onChange={set('rut')} placeholder="Ej: 21234567-8" />
        <Field label="Teléfono" name="telefono" value={form.telefono} onChange={set('telefono')} placeholder="Ej: 099 123 456" type="tel" />
        <Field label="Mail" name="mail" value={form.mail} onChange={set('mail')} placeholder="Ej: contacto@empresa.com" type="email" />
        <Field label="Contacto" name="contacto" value={form.contacto} onChange={set('contacto')} placeholder="Nombre de contacto" />
      </div>
      <Field label="Dirección" name="direccion" value={form.direccion} onChange={set('direccion')} placeholder="Ej: 18 de Julio 1234, Montevideo" />

      {error ? <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>{error}</p> : null}

      <div className="flex gap-2 justify-end pt-1">
        <button
          className="h-10 rounded-xl px-4 text-sm font-semibold transition-colors"
          style={{ background: SURFACE, color: '#5a6a82', border: `1px solid ${BORDER}` }}
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="h-10 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: PRIMARY }}
          disabled={loading || !form.nombre.trim()}
          type="submit"
        >
          {loading ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ── edit drawer / panel ───────────────────────────────────────────────────────

function EditPanel({
  empresa,
  onSave,
  onClose,
}: {
  empresa: Empresa
  onSave: (updated: Empresa) => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const initial: EmpresaFormData = {
    nombre:      empresa.nombre,
    razonSocial: empresa.razonSocial ?? '',
    rut:         empresa.rut ?? '',
    direccion:   empresa.direccion ?? '',
    contacto:    empresa.contacto ?? '',
    mail:        empresa.mail ?? '',
    telefono:    empresa.telefono ?? '',
  }

  async function handleSubmit(data: EmpresaFormData) {
    setLoading(true)
    setError(null)
    const { data: res, error: err } = await apiFetch<{ empresa: Empresa }>(`/api/empresas/${empresa.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (err) { setError(err); setLoading(false); return }
    onSave(res!.empresa)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" style={{ background: 'rgba(11,31,58,0.4)' }}>
      <div
        className="w-full max-w-xl rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
        style={{ background: '#ffffff', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: TEXT }}>Editar empresa</h2>
            <p className="text-sm" style={{ color: MUTED }}>{empresa.nombre}</p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#F5F7FA]"
            style={{ color: MUTED }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <EmpresaForm
          initial={initial}
          loading={loading}
          error={error}
          submitLabel="Guardar cambios"
          onSubmit={(d) => void handleSubmit(d)}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}

// ── confirm deactivate ────────────────────────────────────────────────────────

function ConfirmToast({ empresa, onConfirm, onCancel }: {
  empresa: Empresa; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl px-6 py-4 shadow-xl"
      style={{ background: '#0B1F3A', color: 'white', minWidth: '360px' }}
    >
      <AlertTriangle size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
      <p className="flex-1 text-sm">¿Desactivar <strong>{empresa.nombre}</strong>?</p>
      <button
        className="rounded-lg px-3 py-1.5 text-xs font-semibold hover:opacity-80"
        style={{ background: '#ef4444', color: 'white' }}
        onClick={onConfirm}
      >
        Desactivar
      </button>
      <button
        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
        style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
        onClick={onCancel}
      >
        Cancelar
      </button>
    </div>
  )
}

// ── badge ─────────────────────────────────────────────────────────────────────

function Badge({ activa }: { activa: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={activa
        ? { background: 'rgba(32,224,178,0.12)', color: '#0d9488' }
        : { background: 'rgba(139,163,199,0.12)', color: '#5a6a82' }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: activa ? '#20E0B2' : '#8ba3c7' }} />
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function EmpresasPage() {
  const [empresas, setEmpresas]     = useState<Empresa[]>([])
  const [loading, setLoading]       = useState(true)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [newLoading, setNewLoading] = useState(false)
  const [newError, setNewError]     = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Empresa | null>(null)
  const [rowError, setRowError]     = useState<Record<string, string>>({})
  const [confirmDeactivate, setConfirmDeactivate] = useState<Empresa | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await apiFetch<{ empresas: Empresa[] }>('/api/empresas')
    if (error) { setGlobalError(error); setLoading(false); return }
    setEmpresas(data!.empresas)
    setLoading(false)
  }

  async function handleCreate(form: EmpresaFormData) {
    setNewLoading(true)
    setNewError(null)
    const { data, error } = await apiFetch<{ empresa: Empresa }>('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (error) { setNewError(error); setNewLoading(false); return }
    setEmpresas((prev) => [data!.empresa, ...prev])
    setShowNew(false)
    setNewLoading(false)
  }

  function handleEditSaved(updated: Empresa) {
    setEmpresas((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setEditTarget(null)
  }

  async function doToggle(empresa: Empresa, activa: boolean) {
    setConfirmDeactivate(null)
    const { data, error } = await apiFetch<{ empresa: Empresa }>(`/api/empresas/${empresa.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa }),
    })
    if (error) { setRowError((p) => ({ ...p, [empresa.id]: error })); return }
    setEmpresas((prev) => prev.map((e) => (e.id === empresa.id ? data!.empresa : e)))
    setRowError((p) => { const n = { ...p }; delete n[empresa.id]; return n })
  }

  function handleToggle(empresa: Empresa) {
    if (empresa.activa) { setConfirmDeactivate(empresa); return }
    void doToggle(empresa, true)
  }

  const filtered     = empresas.filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (e.razonSocial ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.rut ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const totalActivas = empresas.filter((e) => e.activa).length

  return (
    <div className="space-y-6">
      <PageHeader
        section="Configuración"
        title="Empresas"
        description={`${totalActivas} empresa${totalActivas !== 1 ? 's' : ''} activa${totalActivas !== 1 ? 's' : ''}`}
      />

      {/* Create form */}
      {showNew ? (
        <div
          className="rounded-2xl p-6"
          style={{ background: '#ffffff', border: `1px solid ${PRIMARY}`, boxShadow: '0 0 0 3px rgba(23,105,224,0.08)' }}
        >
          <h2 className="mb-4 text-base font-bold" style={{ color: TEXT }}>Nueva empresa</h2>
          <EmpresaForm
            initial={EMPTY_FORM}
            loading={newLoading}
            error={newError}
            submitLabel="Crear empresa"
            onSubmit={(d) => void handleCreate(d)}
            onCancel={() => { setShowNew(false); setNewError(null) }}
          />
        </div>
      ) : null}

      {/* Table card */}
      <div
        className="overflow-x-auto rounded-2xl"
        style={{ background: '#ffffff', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(23,105,224,0.06)' }}
      >
        {/* Card header */}
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: BORDER }}>
          <h2 className="text-base font-semibold" style={{ color: TEXT }}>Empresas</h2>
          <button
            className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 inline-flex items-center gap-2"
            onClick={() => { setShowNew(true); setNewError(null) }}
            type="button"
          >
            <Plus size={16} />
            Nueva empresa
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: BORDER }}>
          <Search size={15} style={{ color: MUTED, flexShrink: 0 }} />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: TEXT }}
            placeholder="Buscar por nombre, razón social o RUT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button onClick={() => setSearch('')} style={{ color: MUTED }}><X size={14} /></button>
          ) : null}
        </div>

        {/* Content */}
        {globalError ? (
          <p className="px-6 py-10 text-center text-sm" style={{ color: '#ef4444' }}>{globalError}</p>
        ) : loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg" style={{ background: SURFACE }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(23,105,224,0.08)' }}>
              <Building2 size={24} style={{ color: PRIMARY }} />
            </div>
            <p className="text-sm font-medium" style={{ color: TEXT }}>
              {search ? 'Sin resultados para tu búsqueda' : 'No hay empresas registradas'}
            </p>
            {!search ? (
              <button className="mt-1 text-sm font-semibold" style={{ color: PRIMARY }} onClick={() => setShowNew(true)}>
                Crear primera empresa →
              </button>
            ) : null}
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Nombre', 'Razón social', 'RUT', 'Estado', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: MUTED, background: SURFACE }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((empresa, i) => (
                <tr
                  key={empresa.id}
                  className="transition-colors hover:bg-[#F5F7FA]"
                  style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}
                >
                  {/* Nombre */}
                  <td className="px-5 py-3">
                    <span className="font-medium" style={{ color: TEXT }}>{empresa.nombre}</span>
                    {rowError[empresa.id] ? (
                      <p className="mt-0.5 text-xs" style={{ color: '#ef4444' }}>{rowError[empresa.id]}</p>
                    ) : null}
                  </td>

                  {/* Razón social */}
                  <td className="px-5 py-3" style={{ color: '#5a6a82' }}>
                    {empresa.razonSocial ?? <span style={{ color: MUTED }}>—</span>}
                  </td>

                  {/* RUT */}
                  <td className="px-5 py-3" style={{ color: '#5a6a82' }}>
                    {empresa.rut ?? <span style={{ color: MUTED }}>—</span>}
                  </td>

                  {/* Estado */}
                  <td className="px-5 py-3">
                    <Badge activa={empresa.activa} />
                  </td>

                  {/* Acciones */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF4FF]"
                        style={{ color: MUTED }}
                        title="Editar empresa"
                        onClick={() => setEditTarget(empresa)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF4FF]"
                        style={{ color: empresa.activa ? '#20E0B2' : MUTED }}
                        title={empresa.activa ? 'Desactivar empresa' : 'Activar empresa'}
                        onClick={() => handleToggle(empresa)}
                      >
                        {empresa.activa ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editTarget ? (
        <EditPanel
          empresa={editTarget}
          onSave={handleEditSaved}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      {/* Confirm deactivate toast */}
      {confirmDeactivate ? (
        <ConfirmToast
          empresa={confirmDeactivate}
          onConfirm={() => void doToggle(confirmDeactivate, false)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      ) : null}
    </div>
  )
}
