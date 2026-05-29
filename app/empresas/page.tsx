'use client'

import { useEffect, useState, useRef } from 'react'
import { Building2, Plus, Search, Pencil, ToggleLeft, ToggleRight, X, Check, AlertTriangle } from 'lucide-react'

type Empresa = {
  id: string
  nombre: string
  activa: boolean
  creadaEn: string
}

const PRIMARY = '#1769E0'
const BORDER  = '#e6eefc'
const TEXT    = '#0B1F3A'
const MUTED   = '#8ba3c7'
const SURFACE = '#F5F7FA'

// ── helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, options)
    const json = (await res.json()) as Record<string, unknown>
    if (!res.ok) return { data: null, error: (json.message as string) ?? 'Error inesperado.' }
    return { data: json as T, error: null }
  } catch {
    return { data: null, error: 'Error de red.' }
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}

// ── sub-components ────────────────────────────────────────────────────────────

function Badge({ activa }: { activa: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={
        activa
          ? { background: 'rgba(32,224,178,0.12)', color: '#0d9488' }
          : { background: 'rgba(139,163,199,0.12)', color: '#5a6a82' }
      }
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: activa ? '#20E0B2' : '#8ba3c7' }}
      />
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  )
}

function InlineInput({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string
  onSave: (v: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); onSave(value) }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <span className="flex items-center gap-2">
      <input
        ref={ref}
        className="h-8 rounded-lg px-2 text-sm outline-none"
        style={{
          border: `1.5px solid ${PRIMARY}`,
          background: SURFACE,
          color: TEXT,
          width: '200px',
          boxShadow: '0 0 0 3px rgba(23,105,224,0.12)',
        }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
      />
      <button
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-emerald-50"
        style={{ color: '#0d9488' }}
        onClick={() => onSave(value)}
        title="Guardar"
      >
        <Check size={14} />
      </button>
      <button
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
        style={{ color: '#ef4444' }}
        onClick={onCancel}
        title="Cancelar"
      >
        <X size={14} />
      </button>
    </span>
  )
}

function ConfirmToast({
  empresa,
  onConfirm,
  onCancel,
}: {
  empresa: Empresa
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl px-6 py-4 shadow-xl"
      style={{ background: '#0B1F3A', color: 'white', minWidth: '360px' }}
    >
      <AlertTriangle size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
      <p className="flex-1 text-sm">
        ¿Desactivar <strong>{empresa.nombre}</strong>?
      </p>
      <button
        className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
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

// ── main page ─────────────────────────────────────────────────────────────────

export default function EmpresasPage() {
  const [empresas, setEmpresas]       = useState<Empresa[]>([])
  const [loading, setLoading]         = useState(true)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [showNew, setShowNew]         = useState(false)
  const [newNombre, setNewNombre]     = useState('')
  const [newLoading, setNewLoading]   = useState(false)
  const [newError, setNewError]       = useState<string | null>(null)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [rowError, setRowError]       = useState<Record<string, string>>({})
  const [confirmDeactivate, setConfirmDeactivate] = useState<Empresa | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await apiFetch<{ empresas: Empresa[] }>('/api/empresas')
    if (error) { setGlobalError(error); setLoading(false); return }
    setEmpresas(data!.empresas)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newNombre.trim()) return
    setNewLoading(true)
    setNewError(null)
    const { data, error } = await apiFetch<{ empresa: Empresa }>('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: newNombre.trim() }),
    })
    if (error) { setNewError(error); setNewLoading(false); return }
    setEmpresas((prev) => [data!.empresa, ...prev])
    setNewNombre('')
    setShowNew(false)
    setNewLoading(false)
  }

  async function handleRename(id: string, nombre: string) {
    if (!nombre.trim()) { setEditingId(null); return }
    const { data, error } = await apiFetch<{ empresa: Empresa }>(`/api/empresas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim() }),
    })
    if (error) { setRowError((p) => ({ ...p, [id]: error })); return }
    setEmpresas((prev) => prev.map((e) => (e.id === id ? data!.empresa : e)))
    setEditingId(null)
    setRowError((p) => { const n = { ...p }; delete n[id]; return n })
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
  }

  function handleToggle(empresa: Empresa) {
    if (empresa.activa) { setConfirmDeactivate(empresa); return }
    void doToggle(empresa, true)
  }

  const filtered   = empresas.filter((e) => e.nombre.toLowerCase().includes(search.toLowerCase()))
  const totalActivas = empresas.filter((e) => e.activa).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <header
        className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between"
        style={{ borderColor: BORDER }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
            Configuración
          </p>
          <h1 className="mt-1 text-3xl font-bold" style={{ color: TEXT, letterSpacing: '-0.02em' }}>
            Empresas
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6a82' }}>
            {totalActivas} empresa{totalActivas !== 1 ? 's' : ''} activa{totalActivas !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY}, #19C3FF)`,
            boxShadow: '0 4px 16px rgba(23,105,224,0.25)',
          }}
          onClick={() => { setShowNew(true); setNewError(null) }}
        >
          <Plus size={16} />
          Nueva empresa
        </button>
      </header>

      {/* Nueva empresa inline form */}
      {showNew ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-end"
          style={{ background: '#ffffff', border: `1px solid ${PRIMARY}`, boxShadow: '0 0 0 3px rgba(23,105,224,0.08)' }}
        >
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
              Nombre de la empresa
            </label>
            <input
              autoFocus
              className="h-10 w-full rounded-lg px-3 text-sm outline-none transition-all"
              style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, color: TEXT }}
              onFocus={(e) => {
                e.currentTarget.style.border = `1.5px solid ${PRIMARY}`
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(23,105,224,0.12)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = `1.5px solid ${BORDER}`
                e.currentTarget.style.boxShadow = 'none'
              }}
              placeholder="Ej: Empresa ABC S.A."
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
            />
            {newError ? <p className="text-xs" style={{ color: '#ef4444' }}>{newError}</p> : null}
          </div>
          <div className="flex gap-2">
            <button
              className="h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: PRIMARY }}
              disabled={newLoading || !newNombre.trim()}
              type="submit"
            >
              {newLoading ? 'Guardando…' : 'Crear'}
            </button>
            <button
              className="h-10 rounded-xl px-4 text-sm font-semibold transition-colors"
              style={{ background: SURFACE, color: '#5a6a82', border: `1px solid ${BORDER}` }}
              type="button"
              onClick={() => { setShowNew(false); setNewNombre(''); setNewError(null) }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {/* Table card */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: '#ffffff', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(23,105,224,0.06)' }}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: BORDER }}>
          <Search size={15} style={{ color: MUTED, flexShrink: 0 }} />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: TEXT }}
            placeholder="Buscar empresa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button onClick={() => setSearch('')} style={{ color: MUTED }}>
              <X size={14} />
            </button>
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
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(23,105,224,0.08)' }}
            >
              <Building2 size={24} style={{ color: PRIMARY }} />
            </div>
            <p className="text-sm font-medium" style={{ color: TEXT }}>
              {search ? 'Sin resultados para tu búsqueda' : 'No hay empresas registradas'}
            </p>
            {!search ? (
              <button
                className="mt-1 text-sm font-semibold"
                style={{ color: PRIMARY }}
                onClick={() => setShowNew(true)}
              >
                Crear primera empresa →
              </button>
            ) : null}
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Nombre', 'Estado', 'Fecha de alta', 'Acciones'].map((h) => (
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
                    {editingId === empresa.id ? (
                      <InlineInput
                        defaultValue={empresa.nombre}
                        onSave={(v) => void handleRename(empresa.id, v)}
                        onCancel={() => {
                          setEditingId(null)
                          setRowError((p) => { const n = { ...p }; delete n[empresa.id]; return n })
                        }}
                      />
                    ) : (
                      <span className="font-medium" style={{ color: TEXT }}>{empresa.nombre}</span>
                    )}
                    {rowError[empresa.id] ? (
                      <p className="mt-0.5 text-xs" style={{ color: '#ef4444' }}>{rowError[empresa.id]}</p>
                    ) : null}
                  </td>

                  {/* Estado */}
                  <td className="px-5 py-3">
                    <Badge activa={empresa.activa} />
                  </td>

                  {/* Fecha de alta */}
                  <td className="px-5 py-3" style={{ color: '#5a6a82' }}>
                    {formatDate(empresa.creadaEn)}
                  </td>

                  {/* Acciones */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF4FF]"
                        style={{ color: editingId === empresa.id ? PRIMARY : MUTED }}
                        title="Editar nombre"
                        onClick={() => setEditingId(editingId === empresa.id ? null : empresa.id)}
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
