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

const PRIMARY = '#1769E0'
const BORDER  = '#e6eefc'

export function ParametrosManager({ parametros: initial }: { parametros: Parametro[] }) {
  const [rows, setRows]       = useState<Parametro[]>(initial)
  const [editing, setEditing] = useState<Parametro | null>(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

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

  async function handleToggle(p: Parametro) {
    await fetch(`/api/parametros/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor: p.valor, tipo: p.tipo, descripcion: p.descripcion, activo: !p.activo }),
    })
    await refresh()
  }

  return (
    <>
      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm" style={{ borderColor: BORDER }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500" style={{ background: '#f0f5ff' }}>
              <Th>Clave</Th>
              <Th>Valor</Th>
              <Th>Tipo</Th>
              <Th>Descripción</Th>
              <Th>Activo</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    {p.clave}
                    {p.critico && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">CRÍTICO</span>
                    )}
                  </div>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 font-mono text-slate-700">{p.valor}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.tipo}</td>
                <td className="max-w-[260px] px-4 py-3 text-slate-500">{p.descripcion ?? '—'}</td>
                <td className="px-4 py-3">
                  {p.activo
                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Activo</span>
                    : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Inactivo</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                      style={{ background: PRIMARY }}
                      onClick={() => { setEditing(p); setError(null) }}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        p.activo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                      onClick={() => handleToggle(p)}
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
    </>
  )
}

function Th({ children }: { children: string }) {
  return <th className="px-4 py-3">{children}</th>
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
  const [valor, setValor]           = useState(parametro.valor)
  const [descripcion, setDescripcion] = useState(parametro.descripcion ?? '')
  const [activo, setActivo]         = useState(parametro.activo)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">
            Editar parámetro
            {parametro.critico && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">CRÍTICO</span>
            )}
          </h2>
          <button className="rounded-md p-1 text-slate-400 hover:bg-slate-200" onClick={onClose} type="button">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Clave</label>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-500"
                value={parametro.clave}
                readOnly
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</label>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                value={parametro.tipo}
                readOnly
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</label>
            <input
              className="h-10 w-full rounded-md border px-3 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2"
              style={{ borderColor: BORDER, ['--tw-ring-color' as string]: PRIMARY }}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</label>
            <textarea
              className="w-full resize-none rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2"
              style={{ borderColor: BORDER, ['--tw-ring-color' as string]: PRIMARY }}
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            <span className="font-medium">Activo</span>
          </label>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: PRIMARY }}
            onClick={() => onSave({ valor, descripcion, activo })}
            disabled={saving}
            type="button"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
