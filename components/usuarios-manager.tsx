'use client'

import { useState } from 'react'

type Usuario = {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
}

type FormData = {
  nombre: string
  email: string
  rol: string
  password: string
  activo: boolean
}

const EMPTY_FORM: FormData = {
  nombre: '',
  email: '',
  rol: 'OPERADOR',
  password: '',
  activo: true,
}

const ROL_BADGE: Record<string, string> = {
  ADMIN:    'bg-blue-100 text-blue-800',
  OPERADOR: 'bg-emerald-100 text-emerald-800',
  ISSUES:   'bg-yellow-100 text-yellow-800',
}

const ROL_LABEL: Record<string, string> = {
  ADMIN:    'ADMIN',
  OPERADOR: 'OPERADOR',
  ISSUES:   'Gestión de Issues',
}

function RolBadge({ rol }: { rol: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${ROL_BADGE[rol] ?? 'bg-slate-100 text-slate-700'}`}>
      {ROL_LABEL[rol] ?? rol}
    </span>
  )
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

function TextInput({ value, onChange, type = 'text', placeholder, required, autoComplete }: {
  value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean; autoComplete?: string
}) {
  return (
    <input
      className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required} autoComplete={autoComplete}
    />
  )
}

function RolSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="ADMIN">ADMIN</option>
      <option value="OPERADOR">OPERADOR</option>
      <option value="ISSUES">Gestión de Issues</option>
    </select>
  )
}

export function UsuariosManager({ usuarios: initialUsuarios }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(initialUsuarios)
  const [showCreate, setShowCreate] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState<Usuario | null>(null)
  const [createForm, setCreateForm] = useState<FormData>({ ...EMPTY_FORM })
  const [editForm, setEditForm] = useState<FormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refreshUsuarios() {
    const res = await fetch('/api/usuarios')
    const data = (await res.json()) as { rows?: Usuario[] }
    if (data.rows) setUsuarios(data.rows)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: createForm.nombre,
          email: createForm.email,
          rol: createForm.rol,
          password: createForm.password,
          activo: createForm.activo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Error al crear usuario.'); return }
      setShowCreate(false)
      setCreateForm({ ...EMPTY_FORM })
      await refreshUsuarios()
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUsuario) return
    setError(null)
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        nombre: editForm.nombre,
        email: editForm.email,
        rol: editForm.rol,
        activo: editForm.activo,
      }
      if (editForm.password) body.password = editForm.password
      const res = await fetch(`/api/usuarios/${editingUsuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Error al guardar.'); return }
      setEditingUsuario(null)
      await refreshUsuarios()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActivo(usuario: Usuario) {
    setConfirmDesactivar(null)
    await fetch(`/api/usuarios/${usuario.id}/desactivar`, { method: 'POST' })
    await refreshUsuarios()
  }

  function openEdit(usuario: Usuario) {
    setEditForm({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      password: '',
      activo: usuario.activo,
    })
    setEditingUsuario(usuario)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Tabla */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Usuarios del sistema</h2>
          <button
            className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => { setCreateForm({ ...EMPTY_FORM }); setError(null); setShowCreate(true) }}
          >
            + Nuevo usuario
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Nombre</th>
                <th className="whitespace-nowrap px-4 py-3">Email</th>
                <th className="whitespace-nowrap px-4 py-3">Rol</th>
                <th className="whitespace-nowrap px-4 py-3">Estado</th>
                <th className="whitespace-nowrap px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={5}>No hay usuarios.</td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{u.nombre}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="whitespace-nowrap px-4 py-3"><RolBadge rol={u.rol} /></td>
                  <td className="whitespace-nowrap px-4 py-3"><EstadoBadge activo={u.activo} /></td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => openEdit(u)}
                        type="button"
                      >
                        <PencilIcon />
                        Editar
                      </button>
                      <button
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          u.activo
                            ? 'border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50'
                            : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                        onClick={() => u.activo ? setConfirmDesactivar(u) : void handleToggleActivo(u)}
                        type="button"
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
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
        <ModalShell title="Nuevo usuario" onClose={() => setShowCreate(false)}>
          <form className="space-y-4 px-6 py-5" onSubmit={(e) => void handleCreate(e)} autoComplete="off">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Nombre *">
                <TextInput value={createForm.nombre} onChange={(v) => setCreateForm((f) => ({ ...f, nombre: v }))} placeholder="Ej: Juan Pérez" required />
              </FieldLabel>
              <FieldLabel label="Email *">
                <TextInput value={createForm.email} onChange={(v) => setCreateForm((f) => ({ ...f, email: v }))} type="email" placeholder="usuario@empresa.com" required autoComplete="off" />
              </FieldLabel>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Rol">
                <RolSelect value={createForm.rol} onChange={(v) => setCreateForm((f) => ({ ...f, rol: v }))} />
              </FieldLabel>
              <FieldLabel label="Password *">
                <TextInput value={createForm.password} onChange={(v) => setCreateForm((f) => ({ ...f, password: v }))} type="password" placeholder="Contraseña temporal" required autoComplete="new-password" />
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
      {editingUsuario && (
        <ModalShell title="Editar usuario" onClose={() => setEditingUsuario(null)}>
          <form className="space-y-4 px-6 py-5" onSubmit={(e) => void handleEdit(e)} autoComplete="off">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Nombre *">
                <TextInput value={editForm.nombre} onChange={(v) => setEditForm((f) => ({ ...f, nombre: v }))} required />
              </FieldLabel>
              <FieldLabel label="Email *">
                <TextInput value={editForm.email} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} type="email" required />
              </FieldLabel>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="Rol">
                <RolSelect value={editForm.rol} onChange={(v) => setEditForm((f) => ({ ...f, rol: v }))} />
              </FieldLabel>
              <FieldLabel label="Nuevo password (opcional)">
                <TextInput value={editForm.password} onChange={(v) => setEditForm((f) => ({ ...f, password: v }))} type="password" placeholder="Dejar vacío para no cambiar" autoComplete="new-password" />
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
              <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setEditingUsuario(null)} type="button">Cancelar</button>
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
            <p className="text-sm text-slate-500">El usuario no podrá iniciar sesión hasta que sea reactivado.</p>
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
