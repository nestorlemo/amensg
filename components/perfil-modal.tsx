'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

import type { CurrentUser } from '@/lib/auth'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700">{children}</label>
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
      {...props}
    />
  )
}

export function PerfilModal({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const [nombre, setNombre] = useState(user.nombre)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (passwordNuevo && passwordNuevo !== passwordConfirm) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, passwordActual, passwordNuevo }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Error al guardar.')
      } else {
        setSuccess(true)
        setTimeout(onClose, 1000)
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Mi perfil</h2>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FieldLabel>
            Nombre
            <TextInput
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </FieldLabel>

          <FieldLabel>
            Email
            <TextInput disabled value={user.email} />
          </FieldLabel>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Cambiar contraseña (opcional)
            </p>
            <div className="space-y-3">
              <FieldLabel>
                Contraseña actual
                <TextInput
                  autoComplete="current-password"
                  placeholder="Requerida para cambiar contraseña"
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                />
              </FieldLabel>

              <FieldLabel>
                Nueva contraseña
                <TextInput
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  value={passwordNuevo}
                  onChange={(e) => setPasswordNuevo(e.target.value)}
                />
              </FieldLabel>

              <FieldLabel>
                Confirmar nueva contraseña
                <TextInput
                  autoComplete="new-password"
                  placeholder="Repetir nueva contraseña"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </FieldLabel>
            </div>
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          {success ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Perfil actualizado correctamente.</p>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-10 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
