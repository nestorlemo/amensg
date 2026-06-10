'use client'

import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { Badge, Button, ModalShell } from '@/components/ui/index'
import { requestJson } from '@/lib/client-api'

type Usuario = {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
}

type UsuarioForm = {
  nombre: string
  email: string
  rol: string
  password: string
  activo: boolean
}

const ROL_BADGE: Record<string, 'ADMIN' | 'GESTION_ISSUES'> = {
  ADMIN:    'ADMIN',
  ISSUES:   'GESTION_ISSUES',
  OPERADOR: 'ADMIN',
}

const ROL_LABEL: Record<string, string> = {
  ADMIN:    'Admin',
  OPERADOR: 'Operador',
  ISSUES:   'Gestión de Issues',
}

async function apiRequest(url: string, method: string, body: Record<string, unknown>) {
  const r = await requestJson(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 'No se pudo completar la acción.')
  return r.ok === true ? { ok: true, error: null } : { ok: false, error: (r as { ok: false; error: string }).error }
}

export function UsuariosManager({ usuarios: initial }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(initial)
  const [editTarget, setEditTarget] = useState<Usuario | null>(null)
  const [showNew, setShowNew]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function handleSaved(updated: Usuario) {
    setUsuarios((prev) => prev.map((u) => u.id === updated.id ? updated : u))
    setEditTarget(null)
  }

  function handleCreated(created: Usuario) {
    setUsuarios((prev) => [...prev, created])
    setShowNew(false)
  }

  async function handleDeactivate(id: string) {
    setError(null)
    const result = await apiRequest(`/api/usuarios/${id}/desactivar`, 'POST', {})
    if (!result.ok) { setError(result.error); return }
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo: false } : u))
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">Usuarios</h2>
        <Button variant="primary" size="sm" onClick={() => { setShowNew(true); setError(null) }}>+ Nuevo usuario</Button>
      </div>

      {error ? <div className="px-5 py-3"><AlertError>{error}</AlertError></div> : null}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr key={u.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                <td className="px-5 py-3 font-medium text-slate-900">{u.nombre}</td>
                <td className="px-5 py-3 text-slate-500">{u.email}</td>
                <td className="px-5 py-3">
                  <Badge
                    variant={ROL_BADGE[u.rol] ?? 'ADMIN'}
                    label={ROL_LABEL[u.rol] ?? u.rol}
                  />
                </td>
                <td className="px-5 py-3">
                  <Badge variant={u.activo ? 'activo' : 'inactivo'} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditTarget(u)}>Editar</Button>
                    {u.activo ? (
                      <Button variant="danger" size="sm" onClick={() => void handleDeactivate(u.id)}>Desactivar</Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 ? (
              <tr><td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={5}>No hay usuarios registrados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editTarget ? (
        <UsuarioModal
          title="Editar usuario"
          initial={{ nombre: editTarget.nombre, email: editTarget.email, rol: editTarget.rol, password: '', activo: editTarget.activo }}
          emailReadOnly
          onSave={async (form) => {
            const result = await apiRequest(`/api/usuarios/${editTarget.id}`, 'PUT', {
              nombre: form.nombre, email: form.email, rol: form.rol,
              activo: form.activo, password: form.password || undefined,
            })
            if (!result.ok) return result.error
            handleSaved({ ...editTarget, nombre: form.nombre, email: form.email, rol: form.rol, activo: form.activo })
            return null
          }}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      {/* New modal */}
      {showNew ? (
        <UsuarioModal
          title="Nuevo usuario"
          initial={{ nombre: '', email: '', rol: 'OPERADOR', password: '', activo: true }}
          passwordRequired
          onSave={async (form) => {
            const result = await apiRequest('/api/usuarios', 'POST', {
              nombre: form.nombre, email: form.email, rol: form.rol,
              activo: form.activo, password: form.password || undefined,
            })
            if (!result.ok) return result.error
            handleCreated({ id: crypto.randomUUID(), nombre: form.nombre, email: form.email, rol: form.rol, activo: form.activo })
            return null
          }}
          onClose={() => setShowNew(false)}
        />
      ) : null}
    </section>
  )
}

function UsuarioModal({
  title,
  initial,
  emailReadOnly,
  passwordRequired,
  onSave,
  onClose,
}: {
  title: string
  initial: UsuarioForm
  emailReadOnly?: boolean
  passwordRequired?: boolean
  onSave: (form: UsuarioForm) => Promise<string | null>
  onClose: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (key: keyof UsuarioForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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
        <FormField label="Nombre" value={form.nombre} onChange={set('nombre')} required />
        <FormField label="Email" type="email" value={form.email} onChange={set('email')} readOnly={emailReadOnly} required />
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          Rol
          <select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={form.rol} onChange={set('rol')}>
            <option value="ADMIN">Admin</option>
            <option value="OPERADOR">Operador</option>
            <option value="ISSUES">Gestión de Issues</option>
          </select>
        </label>
        <FormField
          label={passwordRequired ? 'Password' : 'Nuevo password (opcional)'}
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          required={passwordRequired}
          placeholder={passwordRequired ? 'Contraseña temporal' : 'Dejar en blanco para no cambiar'}
        />
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

function FormField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm read-only:bg-slate-50 read-only:text-slate-400"
        {...props}
      />
    </label>
  )
}
