'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eye } from 'lucide-react'

import { ConfirmarCobroModal } from '@/components/confirmar-cobro-modal'

import { CobroHistorial, EmpresaOption, EstadoBadge, fmt, formatDate, formatPeriod } from './types'

export type HistorialActivacionesHandle = { refresh: () => void }

// ---- Display row (1 per Factura group or standalone Cobro) ----------------

type DisplayRow = {
  key: string
  facturaId: string | null
  cobroId: string          // representative cobro (for marcar cobrado / eliminar)
  cobros: CobroHistorial[]
  anio: number
  mes: number
  montoSinIva: string
  iva: string
  montoConIva: string
  estado: string
  fechaCobro: string | null
  urlPdfFactura: string | null
}

function buildDisplayRows(cobros: CobroHistorial[]): DisplayRow[] {
  const facturaGroups = new Map<string, CobroHistorial[]>()
  const standalone: CobroHistorial[] = []

  for (const c of cobros) {
    if (c.facturaId) {
      const g = facturaGroups.get(c.facturaId) ?? []
      g.push(c)
      facturaGroups.set(c.facturaId, g)
    } else {
      standalone.push(c)
    }
  }

  const result: DisplayRow[] = []

  for (const [fid, group] of facturaGroups.entries()) {
    const first = group[0]!
    result.push({
      key: `factura-${fid}`,
      facturaId: fid,
      cobroId: first.id,
      cobros: group,
      anio: first.anio,
      mes: first.mes,
      montoSinIva: group.reduce((s, c) => s + Number(c.montoSinIva), 0).toFixed(2),
      iva:         group.reduce((s, c) => s + Number(c.iva),         0).toFixed(2),
      montoConIva: group.reduce((s, c) => s + Number(c.montoConIva), 0).toFixed(2),
      estado: group.every((c) => c.estado === 'COBRADO') ? 'COBRADO' : 'FACTURADO',
      fechaCobro: group.find((c) => c.fechaCobro)?.fechaCobro ?? null,
      urlPdfFactura: group.find((c) => c.urlPdfFactura)?.urlPdfFactura ?? null,
    })
  }

  for (const c of standalone) {
    result.push({
      key: c.id,
      facturaId: null,
      cobroId: c.id,
      cobros: [c],
      anio: c.anio,
      mes: c.mes,
      montoSinIva: c.montoSinIva,
      iva: c.iva,
      montoConIva: c.montoConIva,
      estado: c.estado,
      fechaCobro: c.fechaCobro,
      urlPdfFactura: c.urlPdfFactura,
    })
  }

  return result
}

// ---- Helpers ---------------------------------------------------------------

function EmpresaCell({ cobros }: { cobros: CobroHistorial[] }) {
  const names = [
    ...new Set(
      cobros.flatMap((c) =>
        c.empresas.length > 0 ? c.empresas.map((e) => e.nombre) : [c.empresa]
      )
    ),
  ]
  if (names.length <= 1) return <>{names[0] ?? ''}</>
  const extra = names.length - 1
  return (
    <span title={names.join(', ')}>
      {names[0]} <span className="text-slate-400">+{extra}</span>
    </span>
  )
}

function DetalleModal({ row, onClose }: { row: DisplayRow; onClose: () => void }) {
  const totalSinIva = row.cobros.reduce((s, c) => s + Number(c.montoSinIva), 0)
  const totalIva    = row.cobros.reduce((s, c) => s + Number(c.iva),         0)
  const totalConIva = row.cobros.reduce((s, c) => s + Number(c.montoConIva), 0)
  const pdfUrl = row.facturaId
    ? `/api/facturas/${row.facturaId}/pdf`
    : `/api/cobros-unificado/${row.cobroId}/pdf`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              <EmpresaCell cobros={row.cobros} />
            </h2>
            <p className="text-sm text-slate-500">Período {formatPeriod(row.anio, row.mes)} · ACTIVACIONES</p>
          </div>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {row.urlPdfFactura && (
          <a
            className="mb-4 inline-flex items-center gap-1 rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
            href={pdfUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver PDF
          </a>
        )}

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Empresa(s)</th>
                <th className="px-3 py-2 text-right">S/IVA</th>
                <th className="px-3 py-2 text-right">IVA</th>
                <th className="px-3 py-2 text-right">C/IVA</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {row.cobros.map((c) => {
                const nombre = c.empresas.length > 0
                  ? c.empresas.map((e) => e.nombre).join(', ')
                  : c.empresa
                return (
                  <tr className="border-t border-slate-100" key={c.id}>
                    <td className="px-3 py-2">{nombre}</td>
                    <td className="px-3 py-2 text-right">${fmt(c.montoSinIva)}</td>
                    <td className="px-3 py-2 text-right">${fmt(c.iva)}</td>
                    <td className="px-3 py-2 text-right font-semibold">${fmt(c.montoConIva)}</td>
                    <td className="px-3 py-2"><EstadoBadge estado={c.estado} /></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700">
              <tr>
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right">${fmt(totalSinIva.toFixed(2))}</td>
                <td className="px-3 py-2 text-right">${fmt(totalIva.toFixed(2))}</td>
                <td className="px-3 py-2 text-right">${fmt(totalConIva.toFixed(2))}</td>
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main component --------------------------------------------------------

export const HistorialActivaciones = forwardRef<HistorialActivacionesHandle, {
  empresasOpts: EmpresaOption[]
  onRefresh?: () => void
}>(function HistorialActivaciones({ empresasOpts, onRefresh }, ref) {
  const [hEmpresa, setHEmpresa]     = useState('')
  const [hEstado,  setHEstado]      = useState('')
  const [historial, setHistorial]   = useState<CobroHistorial[]>([])
  const [loadingH,  setLoadingH]    = useState(false)
  const [uploadingPdf, setUploadingPdf]       = useState<string | null>(null)
  const [marcandoCobrado, setMarcandoCobrado] = useState<string | null>(null)
  const [modalCobro, setModalCobro] = useState<CobroHistorial | null>(null)
  const [detalleRow, setDetalleRow] = useState<DisplayRow | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    void fetchHistorial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchHistorial() {
    setLoadingH(true)
    try {
      const qs = new URLSearchParams({ tipo: 'ACTIVACIONES' })
      if (hEmpresa) qs.set('empresaId', hEmpresa)
      if (hEstado)  qs.set('estado',    hEstado)
      const res = await fetch(`/api/cobros-unificado?${qs}`)
      const data = (await res.json()) as { data?: CobroHistorial[] }
      setHistorial(data.data ?? [])
    } finally {
      setLoadingH(false)
    }
  }

  useImperativeHandle(ref, () => ({ refresh: () => void fetchHistorial() }))

  async function eliminarCobro(id: string) {
    if (!confirm('¿Eliminar este cobro?')) return
    await fetch(`/api/cobros-unificado/${id}`, { method: 'DELETE' })
    void fetchHistorial()
    onRefresh?.()
  }

  async function confirmarCobro(id: string, fecha: string) {
    setMarcandoCobrado(id)
    try {
      await fetch(`/api/cobros-unificado/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'COBRADO', fechaCobro: fecha }),
      })
      setModalCobro(null)
      void fetchHistorial()
    } finally {
      setMarcandoCobrado(null)
    }
  }

  async function subirPdf(facturaId: string | null, cobroId: string, file: File) {
    const key = facturaId ?? cobroId
    setUploadingPdf(key)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = facturaId
        ? `/api/facturas/${facturaId}/pdf`
        : `/api/cobros-unificado/${cobroId}/pdf`
      await fetch(url, { method: 'POST', body: fd })
      void fetchHistorial()
    } finally {
      setUploadingPdf(null)
    }
  }

  const displayRows = buildDisplayRows(historial)

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Historial de facturación</h2>

          {/* Historial filters */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-xs font-medium text-slate-600">
              Empresa
              <select
                className="mt-1 block h-8 w-44 rounded-md border border-slate-300 px-2 text-xs"
                value={hEmpresa} onChange={(e) => setHEmpresa(e.target.value)}
              >
                <option value="">Todas</option>
                {empresasOpts.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Estado cobro
              <select
                className="mt-1 block h-8 w-36 rounded-md border border-slate-300 px-2 text-xs"
                value={hEstado} onChange={(e) => setHEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="FACTURADO">FACTURADO</option>
                <option value="COBRADO">COBRADO</option>
              </select>
            </label>
            <button
              onClick={() => void fetchHistorial()}
              className="h-8 rounded-md border border-slate-300 px-3 text-xs text-slate-600 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {loadingH ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-left">Empresa(s)</th>
                    <th className="px-4 py-3 text-right">S/IVA (UYU)</th>
                    <th className="px-4 py-3 text-right">IVA (UYU)</th>
                    <th className="px-4 py-3 text-right">C/IVA (UYU)</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fecha Cobro</th>
                    <th className="px-4 py-3 text-left">PDF</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">Sin registros.</td>
                    </tr>
                  ) : displayRows.map((row) => {
                    const pdfUrl = row.facturaId
                      ? `/api/facturas/${row.facturaId}/pdf`
                      : `/api/cobros-unificado/${row.cobroId}/pdf`
                    const uploadKey = row.facturaId ?? row.cobroId

                    return (
                      <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{formatPeriod(row.anio, row.mes)}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <EmpresaCell cobros={row.cobros} />
                        </td>
                        <td className="px-4 py-3 text-right">${fmt(row.montoSinIva)}</td>
                        <td className="px-4 py-3 text-right">${fmt(row.iva)}</td>
                        <td className="px-4 py-3 text-right font-semibold">${fmt(row.montoConIva)}</td>
                        <td className="px-4 py-3"><EstadoBadge estado={row.estado} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.fechaCobro)}</td>
                        <td className="px-4 py-3">
                          {row.urlPdfFactura ? (
                            <div className="flex flex-wrap gap-1">
                              <a
                                href={pdfUrl}
                                target="_blank" rel="noopener noreferrer"
                                className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                              >
                                Ver PDF
                              </a>
                              <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                {uploadingPdf === uploadKey ? 'Subiendo...' : 'Reemplazar'}
                                <input type="file" accept=".pdf" className="hidden"
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirPdf(row.facturaId, row.cobroId, f) }}
                                />
                              </label>
                            </div>
                          ) : (
                            <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              {uploadingPdf === uploadKey ? 'Subiendo...' : 'Subir PDF'}
                              <input type="file" accept=".pdf" className="hidden"
                                ref={(el) => { fileInputRefs.current[uploadKey] = el }}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirPdf(row.facturaId, row.cobroId, f) }}
                              />
                            </label>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              type="button"
                              onClick={() => setDetalleRow(row)}
                            >
                              <Eye size={12} />
                              Ver detalle
                            </button>
                            {row.estado !== 'COBRADO' && (
                              <button
                                onClick={() => setModalCobro(row.cobros[0]!)}
                                disabled={marcandoCobrado === row.cobroId}
                                className="rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Marcar cobrado
                              </button>
                            )}
                            {row.cobros.length === 1 && (
                              <button
                                onClick={() => void eliminarCobro(row.cobroId)}
                                className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Eliminar
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
        </div>
      </section>

      {modalCobro && (
        <ConfirmarCobroModal
          empresas={(modalCobro.empresas.length > 0 ? modalCobro.empresas : [{ id: modalCobro.empresaId, nombre: modalCobro.empresa }])
            .map((e) => e.nombre).join(', ')}
          periodo={formatPeriod(modalCobro.anio, modalCobro.mes)}
          onConfirm={(fecha) => confirmarCobro(modalCobro.id, fecha)}
          onCancel={() => setModalCobro(null)}
        />
      )}

      {detalleRow && (
        <DetalleModal row={detalleRow} onClose={() => setDetalleRow(null)} />
      )}
    </>
  )
})
