'use client'

import { Building2, Pencil, Search, ToggleLeft, ToggleRight, X, AlertTriangle } from 'lucide-react'

import { BORDER, MUTED, PRIMARY, SURFACE, TEXT, type Empresa } from './types'

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

// ── confirm deactivate toast ──────────────────────────────────────────────────

function ConfirmToast({ empresa, onConfirm, onCancel }: {
  empresa: Empresa; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl px-6 py-4 shadow-xl"
      style={{ background: 'var(--navy-deep)', color: 'white', minWidth: '360px' }}
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

// ── main table ────────────────────────────────────────────────────────────────

type Props = {
  empresas: Empresa[]
  loading: boolean
  globalError: string | null
  search: string
  rowError: Record<string, string>
  confirmDeactivate: Empresa | null
  onSearch: (v: string) => void
  onEdit: (empresa: Empresa) => void
  onToggle: (empresa: Empresa) => void
  onShowNew: () => void
  onConfirmDeactivate: (empresa: Empresa | null) => void
  doToggle: (empresa: Empresa, activa: boolean) => void
}

export function TablaEmpresas({
  empresas,
  loading,
  globalError,
  search,
  rowError,
  confirmDeactivate,
  onSearch,
  onEdit,
  onToggle,
  onShowNew,
  onConfirmDeactivate,
  doToggle,
}: Props) {
  const filtered = empresas.filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (e.razonSocial ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.rut ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div
        className="overflow-x-auto rounded-2xl"
        style={{ background: '#ffffff', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(23,105,224,0.06)' }}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: BORDER }}>
          <Search size={15} style={{ color: MUTED, flexShrink: 0 }} />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: TEXT }}
            placeholder="Buscar por nombre, razón social o RUT…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search ? (
            <button onClick={() => onSearch('')} style={{ color: MUTED }}><X size={14} /></button>
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
              <button className="mt-1 text-sm font-semibold" style={{ color: PRIMARY }} onClick={onShowNew}>
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
                  <td className="px-5 py-3">
                    <span className="font-medium" style={{ color: TEXT }}>{empresa.nombre}</span>
                    {rowError[empresa.id] ? (
                      <p className="mt-0.5 text-xs" style={{ color: '#ef4444' }}>{rowError[empresa.id]}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3" style={{ color: '#5a6a82' }}>
                    {empresa.razonSocial ?? <span style={{ color: MUTED }}>—</span>}
                  </td>
                  <td className="px-5 py-3" style={{ color: '#5a6a82' }}>
                    {empresa.rut ?? <span style={{ color: MUTED }}>—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge activa={empresa.activa} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF4FF]"
                        style={{ color: MUTED }}
                        title="Editar empresa"
                        onClick={() => onEdit(empresa)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#EEF4FF]"
                        style={{ color: empresa.activa ? '#20E0B2' : MUTED }}
                        title={empresa.activa ? 'Desactivar empresa' : 'Activar empresa'}
                        onClick={() => onToggle(empresa)}
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

      {confirmDeactivate ? (
        <ConfirmToast
          empresa={confirmDeactivate}
          onConfirm={() => void doToggle(confirmDeactivate, false)}
          onCancel={() => onConfirmDeactivate(null)}
        />
      ) : null}
    </>
  )
}
