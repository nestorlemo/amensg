'use client'

import { useState } from 'react'

type Parametro = {
  id: string
  clave: string
  valor: string
  tipo: string
  descripcion: string | null
  activo: boolean
  critico: boolean
}

const CLAVE_LABEL: Record<string, string> = {
  porcentaje_iva:              'Porcentaje IVA',
  porcentaje_rework_horas:     '% Horas Rework',
  porcentaje_test_horas:       '% Horas Testing',
  precio_unitario_activacion:  'Precio Unitario Activación',
  tipo_cambio_usd:             'Tipo de Cambio USD',
  valor_hora_desarrollo_usd:   'Valor Hora Desarrollo (USD)',
}

function claveLabel(clave: string) {
  return CLAVE_LABEL[clave] ?? clave
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

export function ParametrosManager({ parametros: initial }: { parametros: Parametro[] }) {
  const [rows, setRows]         = useState<Parametro[]>(initial)
  const [editing, setEditing]   = useState<Parametro | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function refresh() {
    const res = await fetch('/api/parametros')
    if (res.ok) {
      const data = await res.json() as { rows: Parametro[] }
      setRows(data.rows)
    }
  }

  async function handleSave(valores: { valor: string; descripcion: string; activo: boolean }) {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/parametros/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: valores.valor, tipo: editing.tipo, descripcion: valores.descripcion, activo: valores.activo }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'No se pudo guardar el parámetro.')
        return
      }
      setEditing(null)
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(valores: { clave: string; valor: string; tipo: string; descripcion: string; activo: boolean }) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/parametros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valores),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'No se pudo crear el parámetro.')
        return
      }
      setShowCreate(false)
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(p: Parametro) {
    await fetch(`/api/parametros/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor: p.valor, tipo: p.tipo, descripcion: p.descripcion, activo: !p.activo }),
    })
    await refresh()
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Parámetros del sistema</h2>
          <button
            className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => { setError(null); setShowCreate(true) }}
            type="button"
          >
            + Nuevo parámetro
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Clave</th>
                <th className="whitespace-nowrap px-4 py-3">Valor</th>
                <th className="whitespace-nowrap px-4 py-3">Tipo</th>
                <th className="whitespace-nowrap px-4 py-3">Descripción</th>
                <th className="whitespace-nowrap px-4 py-3">Activo</th>
                <th className="whitespace-nowrap px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{claveLabel(p.clave)}</span>
                      {p.critico && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">CRÍTICO</span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-slate-400">{p.clave}</div>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 font-mono text-slate-700">{p.valor}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.tipo}</td>
                  <td className="max-w-[260px] px-4 py-3 text-slate-500">{p.descripcion ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.activo
                      ? <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Activo</span>
                      : <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Inactivo</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => { setEditing(p); setError(null) }}
                        type="button"
                      >
                        <PencilIcon />
                        Editar
                      </button>
                      <button
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          p.activo
                            ? 'border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50'
                            : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                        onClick={() => void handleToggle(p)}
                        type="button"
                      >
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <EditModal
          parametro={editing}
          saving={saving}
          error={error}
          onClose={() => { setEditing(null); setError(null) }}
          onSave={handleSave}
        />
      )}

      {showCreate && (
        <CreateModal
          saving={saving}
          error={error}
          onClose={() => { setShowCreate(false); setError(null) }}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}

function EditModal({
  parametro, saving, error, onClose, onSave,
}: {
  parametro: Parametro
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (v: { valor: string; descripcion: string; activo: boolean }) => void
}) {
  const [valor, setValor]             = useState(parametro.valor)
  const [descripcion, setDescripcion] = useState(parametro.descripcion ?? '')
  const [activo, setActivo]           = useState(parametro.activo)

  return (
    <ModalShell
      title={parametro.critico ? `Editar parámetro — CRÍTICO` : 'Editar parámetro'}
      onClose={onClose}
    >
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Clave</label>
            <input
              className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-500"
              value={parametro.clave}
              readOnly
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
            <input
              className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
              value={parametro.tipo}
              readOnly
            />
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Valor
          <input
            className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Descripción
          <textarea
            className="mt-1 block w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="rounded"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          Activo
        </label>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
        <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} type="button" disabled={saving}>Cancelar</button>
        <button
          className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => onSave({ valor, descripcion, activo })}
          disabled={saving}
          type="button"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </ModalShell>
  )
}

function CreateModal({
  saving, error, onClose, onCreate,
}: {
  saving: boolean
  error: string | null
  onClose: () => void
  onCreate: (v: { clave: string; valor: string; tipo: string; descripcion: string; activo: boolean }) => void
}) {
  const [clave, setClave]             = useState('')
  const [valor, setValor]             = useState('')
  const [tipo, setTipo]               = useState('DECIMAL')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo]           = useState(true)

  return (
    <ModalShell title="Nuevo parámetro" onClose={onClose}>
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-slate-700">
            Clave *
            <input
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="ej: nuevo_parametro"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Tipo
            <select
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="DECIMAL">DECIMAL</option>
              <option value="TEXTO">TEXTO</option>
              <option value="BOOLEANO">BOOLEANO</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Valor *
          <input
            className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Descripción
          <textarea
            className="mt-1 block w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="rounded"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          Activo
        </label>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
        <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} type="button" disabled={saving}>Cancelar</button>
        <button
          className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => onCreate({ clave, valor, tipo, descripcion, activo })}
          disabled={saving || !clave.trim() || !valor.trim()}
          type="button"
        >
          {saving ? 'Creando…' : 'Crear'}
        </button>
      </div>
    </ModalShell>
  )
}
