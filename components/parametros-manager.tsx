'use client'

import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { Badge, Button, ModalShell, typography } from '@/components/ui/index'
import { requestJson } from '@/lib/client-api'

type Parametro = {
  id: string
  clave: string
  valor: string
  tipo: string
  descripcion: string | null
  activo: boolean
  critico: boolean
}

const LABEL: Record<string, string> = {
  porcentaje_iva:              'Porcentaje IVA',
  porcentaje_rework_horas:     '% Horas Rework',
  porcentaje_test_horas:       '% Horas Testing',
  precio_unitario_activacion:  'Precio Unitario Activación',
  tipo_cambio_usd:             'Tipo de Cambio USD',
  valor_hora_desarrollo_usd:   'Valor Hora Desarrollo (USD)',
}

const TIPOS = ['porcentaje', 'monto', 'numero', 'texto']

function labelFor(clave: string) {
  return LABEL[clave] ?? clave
}

async function apiPut(id: string, body: Record<string, unknown>) {
  const r = await requestJson(`/api/parametros/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 'No se pudo guardar el parámetro.')
  return r.ok === true ? { ok: true, error: null } : { ok: false, error: (r as { ok: false; error: string }).error }
}

async function apiPost(body: Record<string, unknown>) {
  const r = await requestJson('/api/parametros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 'No se pudo crear el parámetro.')
  return r.ok === true ? { ok: true, error: null } : { ok: false, error: (r as { ok: false; error: string }).error }
}

export function ParametrosManager({ parametros: initial }: { parametros: Parametro[] }) {
  const [parametros, setParametros] = useState(initial)
  const [editTarget, setEditTarget] = useState<Parametro | null>(null)
  const [showNew, setShowNew]       = useState(false)

  function handleSaved(updated: Parametro) {
    setParametros((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    setEditTarget(null)
  }

  function handleCreated(created: Parametro) {
    setParametros((prev) => [...prev, created])
    setShowNew(false)
  }

  function handleDeactivated(id: string) {
    setParametros((prev) => prev.map((p) => p.id === id ? { ...p, activo: false } : p))
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">Parámetros del sistema</h2>
        <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>+ Nuevo parámetro</Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              {['Clave', 'Valor', 'Tipo', 'Descripción', 'Activo', 'Acciones'].map((h) => (
                <th key={h} className={`whitespace-nowrap px-5 py-3 ${typography.tableHeader}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parametros.map((p, i) => (
              <tr key={p.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{labelFor(p.clave)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{p.clave}</p>
                  {p.critico ? <Badge variant="CRITICO" className="mt-1" /> : null}
                </td>
                <td className="px-5 py-3 font-mono text-slate-700">{p.valor}</td>
                <td className="px-5 py-3 text-slate-500">{p.tipo}</td>
                <td className="max-w-xs px-5 py-3 text-slate-500">{p.descripcion ?? <span className="text-slate-300">—</span>}</td>
                <td className="px-5 py-3">
                  <Badge variant={p.activo ? 'activo' : 'inactivo'} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditTarget(p)}>Editar</Button>
                    {p.activo ? (
                      <Button variant="danger" size="sm" onClick={() => handleDeactivated(p.id)}>Desactivar</Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {parametros.length === 0 ? (
              <tr><td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={6}>No hay parámetros registrados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editTarget ? (
        <EditModal
          parametro={editTarget}
          onSave={handleSaved}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      {/* New modal */}
      {showNew ? (
        <NewModal
          onCreated={handleCreated}
          onClose={() => setShowNew(false)}
        />
      ) : null}
    </section>
  )
}

function EditModal({ parametro, onSave, onClose }: { parametro: Parametro; onSave: (p: Parametro) => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaving(true)
    setError(null)
    const result = await apiPut(parametro.id, {
      valor:       fd.get('valor'),
      descripcion: fd.get('descripcion'),
      activo:      fd.get('activo') === 'on',
    })
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    onSave({ ...parametro, valor: fd.get('valor') as string, descripcion: fd.get('descripcion') as string, activo: fd.get('activo') === 'on' })
  }

  return (
    <ModalShell isOpen={true} onClose={onClose} title={`Editar: ${labelFor(parametro.clave)}`}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clave (no editable)" value={parametro.clave} readOnly />
          <Field label="Tipo (no editable)" value={parametro.tipo} readOnly />
        </div>
        <Field label="Valor" name="valor" defaultValue={parametro.valor} required />
        <Field label="Descripción" name="descripcion" defaultValue={parametro.descripcion ?? ''} />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input className="h-4 w-4" type="checkbox" name="activo" defaultChecked={parametro.activo} />
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

function NewModal({ onCreated, onClose }: { onCreated: (p: Parametro) => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaving(true)
    setError(null)
    const result = await apiPost({
      clave:       fd.get('clave'),
      valor:       fd.get('valor'),
      tipo:        fd.get('tipo'),
      descripcion: fd.get('descripcion'),
      critico:     fd.get('critico') === 'on',
      activo:      fd.get('activo') === 'on',
    })
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    const { rows } = await requestJson('/api/parametros', { method: 'GET' }, '').then(
      (r) => r.ok ? r.data as { rows: Parametro[] } : { rows: [] }
    )
    const last = rows[rows.length - 1]
    if (last) onCreated(last)
    else onClose()
  }

  return (
    <ModalShell isOpen={true} onClose={onClose} title="Nuevo parámetro">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Clave" name="clave" placeholder="ej: mi_parametro" required />
        <Field label="Valor" name="valor" required />
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          Tipo
          <select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" name="tipo" defaultValue="numero">
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <Field label="Descripción" name="descripcion" />
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input className="h-4 w-4" type="checkbox" name="critico" />
            Crítico
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input className="h-4 w-4" type="checkbox" name="activo" defaultChecked />
            Activo
          </label>
        </div>
        {error ? <AlertError>{error}</AlertError> : null}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" disabled={saving} type="submit">{saving ? 'Creando…' : 'Crear parámetro'}</Button>
        </div>
      </form>
    </ModalShell>
  )
}

function Field({ label, name, defaultValue, value, placeholder, required, readOnly }: {
  label: string
  name?: string
  defaultValue?: string
  value?: string
  placeholder?: string
  required?: boolean
  readOnly?: boolean
}) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm read-only:bg-slate-50 read-only:text-slate-400"
        name={name}
        defaultValue={defaultValue}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}
