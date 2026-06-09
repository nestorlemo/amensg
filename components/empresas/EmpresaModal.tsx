'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { apiFetch, BORDER, MUTED, PRIMARY, SURFACE, TEXT, type Empresa, type EmpresaFormData } from './types'

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

// ── edit modal ────────────────────────────────────────────────────────────────

type Props = {
  empresa: Empresa
  onSave: (updated: Empresa) => void
  onClose: () => void
}

export function EmpresaModal({ empresa, onSave, onClose }: Props) {
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

// ── create form panel ─────────────────────────────────────────────────────────

type CreatePanelProps = {
  loading: boolean
  error: string | null
  initial: EmpresaFormData
  onSubmit: (data: EmpresaFormData) => void
  onCancel: () => void
}

export function EmpresaCreatePanel({ loading, error, initial, onSubmit, onCancel }: CreatePanelProps) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#ffffff', border: `1px solid ${PRIMARY}`, boxShadow: '0 0 0 3px rgba(23,105,224,0.08)' }}
    >
      <h2 className="mb-4 text-base font-bold" style={{ color: TEXT }}>Nueva empresa</h2>
      <EmpresaForm
        initial={initial}
        loading={loading}
        error={error}
        submitLabel="Crear empresa"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  )
}
