'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

type Usuario = {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
}

export function UsuariosManager({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    await submit('/api/usuarios', 'POST', form)
  }

  async function submitUpdate(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault()
    await submit(`/api/usuarios/${id}`, 'PUT', event.currentTarget)
  }

  async function deactivate(id: string) {
    await request(`/api/usuarios/${id}/desactivar`, { method: 'POST' })
  }

  async function submit(url: string, method: string, form: HTMLFormElement) {
    const data = new FormData(form)
    await request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: data.get('nombre'),
        email: data.get('email'),
        rol: data.get('rol'),
        activo: data.get('activo') === 'on',
        password: data.get('password') || undefined,
      }),
    })
  }

  async function request(url: string, init: RequestInit) {
    setError(null)
    const result = await requestJson(url, init, 'No se pudo completar la acción.')
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {error ? <AlertError>{error}</AlertError> : null}
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-950">Nuevo usuario</h2>
        <form
          autoComplete="off"
          className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_140px_minmax(0,1fr)_90px_auto]"
          onSubmit={submitCreate}
        >
          <Input autoComplete="off" label="Nombre" name="nombre" placeholder="Ej: Juan Pérez" required />
          <Input autoComplete="off" label="Email" name="email" placeholder="usuario@empresa.com" required type="email" />
          <Select defaultValue="OPERADOR" label="Rol" name="rol" />
          <Input autoComplete="new-password" label="Password" name="password" placeholder="Contraseña temporal" required type="password" />
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
            <input defaultChecked name="activo" type="checkbox" /> Activo
          </label>
          <div className="flex items-end">
            <button className="h-10 w-full whitespace-nowrap rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
              Crear usuario
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">Usuarios existentes</h2>
        {usuarios.map((usuario) => (
          <article className="rounded-md border border-slate-200 bg-white p-4" key={usuario.id}>
            <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{usuario.nombre}</p>
                <p className="truncate text-sm text-slate-500">{usuario.email}</p>
              </div>
              <span className={`w-fit rounded px-2 py-1 text-xs font-semibold ${usuario.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <form
              autoComplete="off"
              className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_130px_minmax(0,1fr)_90px_auto]"
              onSubmit={(event) => submitUpdate(event, usuario.id)}
            >
              <Input defaultValue={usuario.nombre} label="Nombre" name="nombre" required />
              <Input defaultValue={usuario.email} label="Email" name="email" readOnly type="email" />
              <Select defaultValue={usuario.rol} label="Rol" name="rol" />
              <Input autoComplete="new-password" label="Nuevo password" name="password" placeholder="Opcional" type="password" />
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
                <input defaultChecked={usuario.activo} name="activo" type="checkbox" /> Activo
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
                  Guardar
                </button>
                {usuario.activo ? (
                  <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700" onClick={() => deactivate(usuario.id)} type="button">
                    Desactivar
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        ))}
      </section>
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm read-only:bg-slate-100 disabled:bg-slate-100" {...inputProps} />
    </label>
  )
}

function Select({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
      {label}
      <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={defaultValue} name={name}>
        <option value="ADMIN">ADMIN</option>
        <option value="OPERADOR">OPERADOR</option>
      </select>
    </label>
  )
}
