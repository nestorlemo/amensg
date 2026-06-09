'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { fmt, mesNombre, MESES, ESTADO_BADGE, type Transferencia, type Socio } from './types'
import { Badge, ModalShell } from './primitives'

type Props = {
  socios: Socio[]
  refreshTrigger: number
}

export function HistorialTransferencias({ socios, refreshTrigger }: Props) {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [loadingTrans, setLoadingTrans] = useState(false)

  const [filtroSocio, setFiltroSocio] = useState('')
  const [filtroMoneda, setFiltroMoneda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  const [marcando, setMarcando] = useState<Transferencia | null>(null)
  const [fechaTransferencia, setFechaTransferencia] = useState(new Date().toISOString().split('T')[0]!)
  const [savingMarca, setSavingMarca] = useState(false)

  const fetchTransferencias = useCallback(async () => {
    setLoadingTrans(true)
    try {
      const params = new URLSearchParams()
      if (filtroSocio)  params.set('socioId', filtroSocio)
      if (filtroMoneda) params.set('moneda', filtroMoneda)
      if (filtroEstado) params.set('estado', filtroEstado)
      if (filtroAnio)   params.set('anio', filtroAnio)
      if (filtroMes)    params.set('mes', filtroMes)
      const res = await fetch(`/api/transferencias?${params}`)
      const data = await res.json() as { transferencias?: Transferencia[] }
      setTransferencias(data.transferencias ?? [])
    } finally {
      setLoadingTrans(false)
    }
  }, [filtroSocio, filtroMoneda, filtroEstado, filtroAnio, filtroMes])

  useEffect(() => { void fetchTransferencias() }, [fetchTransferencias, refreshTrigger])

  async function handleMarcarTransferido() {
    if (!marcando) return
    setSavingMarca(true)
    try {
      await fetch(`/api/transferencias/${marcando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'TRANSFERIDO', fecha: fechaTransferencia }),
      })
      setMarcando(null)
      await fetchTransferencias()
    } finally {
      setSavingMarca(false)
    }
  }

  function handleExport(socioId?: string) {
    const params = new URLSearchParams()
    if (socioId) params.set('socioId', socioId)
    if (filtroAnio) params.set('anio', filtroAnio)
    if (filtroMes)  params.set('mes', filtroMes)
    window.open(`/api/transferencias/export?${params}`, '_blank')
  }

  const bySocio = new Map<string, { nombre: string; rows: Transferencia[] }>()
  for (const t of transferencias) {
    const entry = bySocio.get(t.socioId) ?? { nombre: t.socio, rows: [] }
    entry.rows.push(t)
    bySocio.set(t.socioId, entry)
  }

  const anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Historial de transferencias</h2>
            <p className="mt-0.5 text-xs text-slate-500">{transferencias.length} transferencia{transferencias.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => handleExport()}
          >
            <Download size={13} />
            Exportar todo
          </button>
        </div>

        {/* Filtros transferencias */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Socio</label>
            <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={filtroSocio} onChange={e => setFiltroSocio(e.target.value)}>
              <option value="">Todos</option>
              {socios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Moneda</label>
            <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={filtroMoneda} onChange={e => setFiltroMoneda(e.target.value)}>
              <option value="">Todas</option>
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Estado</label>
            <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="TRANSFERIDO">Transferido</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Año</label>
            <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}>
              <option value="">Todos</option>
              {anios.map(a => <option key={a} value={String(a)}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Mes</label>
            <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
              <option value="">Todos</option>
              {MESES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
          <button className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-900" onClick={() => { setFiltroSocio(''); setFiltroMoneda(''); setFiltroEstado(''); setFiltroAnio(''); setFiltroMes('') }}>Limpiar</button>
        </div>

        {loadingTrans ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">Cargando…</div>
        ) : transferencias.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">No hay transferencias.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Array.from(bySocio.entries()).map(([socioId, { nombre, rows }]) => {
              const totalUYU = rows.filter(r => r.moneda === 'UYU').reduce((s, r) => s + Number(r.monto), 0)
              const totalUSD = rows.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.monto), 0)
              return (
                <div key={socioId}>
                  <div className="flex items-center justify-between bg-slate-50 px-6 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-800">{nombre}</span>
                      {totalUYU > 0 && <span className="text-xs text-slate-500">UYU {fmt(totalUYU)}</span>}
                      {totalUSD > 0 && <span className="text-xs text-slate-500">USD {fmt(totalUSD)}</span>}
                    </div>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      onClick={() => handleExport(socioId)}
                    >
                      <Download size={12} />
                      Excel
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-2">Concepto</th>
                          <th className="whitespace-nowrap px-4 py-2">Período</th>
                          <th className="whitespace-nowrap px-4 py-2">Moneda</th>
                          <th className="whitespace-nowrap px-4 py-2 text-right">Monto S/IVA</th>
                          <th className="whitespace-nowrap px-4 py-2">Cuenta destino</th>
                          <th className="whitespace-nowrap px-4 py-2">Fecha</th>
                          <th className="whitespace-nowrap px-4 py-2">Estado</th>
                          <th className="whitespace-nowrap px-4 py-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rows.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">{t.concepto}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{mesNombre(t.cobroMes)} {t.cobroAnio}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{t.moneda}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">{fmt(t.monto)}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 font-mono text-xs">{t.cuentaDestino ?? <span className="text-slate-300">—</span>}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                              {t.fecha ? new Date(t.fecha).toLocaleDateString('es-UY') : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <Badge label={t.estado} cls={ESTADO_BADGE[t.estado] ?? 'bg-slate-100 text-slate-700'} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5">
                              {t.estado === 'PENDIENTE' && (
                                <button
                                  className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                                  onClick={() => { setMarcando(t); setFechaTransferencia(new Date().toISOString().split('T')[0]!) }}
                                >
                                  Marcar transferido
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal marcar transferido */}
      {marcando && (
        <ModalShell title="Marcar como transferido" onClose={() => setMarcando(null)}>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-slate-700">
              Transferencia a <span className="font-semibold text-slate-950">{marcando.socio}</span>
              {' '}— {marcando.concepto}
            </p>
            <p className="text-lg font-bold tabular-nums text-slate-950">{marcando.moneda} {fmt(marcando.monto)}</p>
            <label className="block text-sm font-medium text-slate-700">
              Fecha de transferencia
              <input
                type="date"
                className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={fechaTransferencia}
                onChange={e => setFechaTransferencia(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMarcando(null)} type="button">Cancelar</button>
              <button
                className="h-9 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={savingMarca}
                onClick={() => void handleMarcarTransferido()}
                type="button"
              >
                {savingMarca ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  )
}
