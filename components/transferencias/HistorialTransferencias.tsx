'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { fmt, MESES, ESTADO_BADGE, TIPO_BADGE, type CobroDetalle, type CierreResumen, type Transferencia, type Socio } from './types'
import { Badge, ModalShell } from './primitives'

type Props = {
  socios: Socio[]
  refreshTrigger: number
}

const MESES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function periodoLabel(desde: { anio: number; mes: number }, hasta: { anio: number; mes: number }) {
  const d = `${MESES_ABR[desde.mes - 1] ?? ''} ${desde.anio}`
  const h = `${MESES_ABR[hasta.mes - 1] ?? ''} ${hasta.anio}`
  return desde.anio === hasta.anio && desde.mes === hasta.mes ? d : `${d} - ${h}`
}

export function HistorialTransferencias({ socios, refreshTrigger }: Props) {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [loadingTrans, setLoadingTrans] = useState(false)

  const [filtroSocio, setFiltroSocio] = useState('')
  const [filtroMoneda, setFiltroMoneda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  const [detalle, setDetalle] = useState<Transferencia | null>(null)
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

  function handleExport() {
    const params = new URLSearchParams()
    if (filtroSocio)  params.set('socioId', filtroSocio)
    if (filtroMoneda) params.set('moneda', filtroMoneda)
    if (filtroEstado) params.set('estado', filtroEstado)
    if (filtroAnio)   params.set('anio', filtroAnio)
    if (filtroMes)    params.set('mes', filtroMes)
    window.open(`/api/transferencias/export?${params}`, '_blank')
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
            onClick={handleExport}
          >
            <Download size={13} />
            Exportar
          </button>
        </div>

        {/* Filtros */}
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
          <button
            className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-900"
            onClick={() => { setFiltroSocio(''); setFiltroMoneda(''); setFiltroEstado(''); setFiltroAnio(''); setFiltroMes('') }}
          >
            Limpiar
          </button>
        </div>

        {/* Tabla */}
        {loadingTrans ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">Cargando…</div>
        ) : transferencias.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">No hay transferencias.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3">Socio</th>
                  <th className="whitespace-nowrap px-5 py-3">Período</th>
                  <th className="whitespace-nowrap px-5 py-3">Moneda</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">Monto S/IVA</th>
                  <th className="whitespace-nowrap px-5 py-3">Cuenta destino</th>
                  <th className="whitespace-nowrap px-5 py-3">Fecha</th>
                  <th className="whitespace-nowrap px-5 py-3">Estado</th>
                  <th className="whitespace-nowrap px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transferencias.map(t => {
                  const pd = t.periodoDesde ?? { anio: t.cobroAnio, mes: t.cobroMes }
                  const ph = t.periodoHasta ?? pd
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{t.socio}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{periodoLabel(pd, ph)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{t.moneda}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium text-slate-900">{fmt(t.monto)}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">{t.cuentaDestino ?? <span className="text-slate-300">—</span>}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {t.fecha ? new Date(t.fecha).toLocaleDateString('es-UY') : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Badge label={t.estado === 'PENDIENTE' ? 'Pendiente' : 'Transferido'} cls={ESTADO_BADGE[t.estado] ?? 'bg-slate-100 text-slate-700'} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            onClick={() => setDetalle(t)}
                          >
                            <Eye size={12} />
                            Ver detalle
                          </button>
                          {t.estado === 'PENDIENTE' && (
                            <button
                              className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                              onClick={() => { setMarcando(t); setFechaTransferencia(new Date().toISOString().split('T')[0]!) }}
                            >
                              Marcar transferido
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal detalle de transferencia */}
      {detalle && (
        <DetalleModal transferencia={detalle} onClose={() => setDetalle(null)} />
      )}

      {/* Modal marcar transferido */}
      {marcando && (
        <ModalShell title="Marcar como transferido" onClose={() => setMarcando(null)}>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-slate-700">
              Transferencia a <span className="font-semibold text-slate-950">{marcando.socio}</span>
              {' '}— {periodoLabel(
                marcando.periodoDesde ?? { anio: marcando.cobroAnio, mes: marcando.cobroMes },
                marcando.periodoHasta ?? { anio: marcando.cobroAnio, mes: marcando.cobroMes },
              )}
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

// ── Modal detalle ─────────────────────────────────────────────────────────────

function ResumenRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`tabular-nums text-sm ${bold ? 'font-bold text-slate-950' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}

function CierreResumenSection({ resumen, moneda, monto }: { resumen: CierreResumen; moneda: string; monto: string }) {
  const pct = resumen.socioPorcentaje != null
    ? `${(Number(resumen.socioPorcentaje) * 100).toFixed(2)}%`
    : '—'
  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Resumen del período</p>
      <div className="divide-y divide-slate-100">
        <ResumenRow label="Total activaciones s/IVA" value={`${moneda === 'UYU' ? 'UYU' : 'USD'} ${fmt(resumen.facturacionSinIva)}`} />
        <ResumenRow label="Total gastos" value={`UYU ${fmt(resumen.totalGastos)}`} />
        <ResumenRow label="Resultado activaciones neto" value={`UYU ${fmt(resumen.resultadoActivaciones)}`} />
        <ResumenRow label="Participación del socio" value={pct} />
        <ResumenRow label="Monto a transferir" value={`${moneda} ${fmt(monto)}`} bold />
      </div>
    </div>
  )
}

function DetalleModal({ transferencia: t, onClose }: { transferencia: Transferencia; onClose: () => void }) {
  const pd = t.periodoDesde ?? { anio: t.cobroAnio, mes: t.cobroMes }
  const ph = t.periodoHasta ?? pd
  const titulo = `Transferencia — ${t.socio} ${periodoLabel(pd, ph)}`
  const cobros: CobroDetalle[] = t.cobrosDetalle ?? []
  const total = cobros.reduce((s, c) => s + Number(c.montoSinIva), 0)

  function handleExportDetalle() {
    window.open(`/api/transferencias/${t.id}/export`, '_blank')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-2xl md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">{titulo}</h2>
          <button className="rounded-md p-1 text-slate-400 hover:bg-slate-200" onClick={onClose} type="button">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Resumen del cierre */}
          {t.cierreResumen && (
            <CierreResumenSection resumen={t.cierreResumen} moneda={t.moneda} monto={t.monto} />
          )}

          {/* Tabla de cobros */}
          {cobros.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Sin cobros vinculados.</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Detalle de cobros</p>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-4">Empresa</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Período</th>
                    <th className="pb-2 text-right">Monto S/IVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cobros.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{c.empresa}</td>
                      <td className="py-2.5 pr-4">
                        <Badge label={c.tipo} cls={TIPO_BADGE[c.tipo] ?? 'bg-slate-100 text-slate-700'} />
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{c.periodo}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-slate-900">
                        {c.moneda} {fmt(c.montoSinIva)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="pt-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Total</td>
                    <td className="pt-3 text-right tabular-nums font-bold text-slate-950">{t.moneda} {fmt(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={handleExportDetalle}
            type="button"
          >
            <Download size={13} />
            Exportar Excel
          </button>
          <button
            className="h-9 rounded-md border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
