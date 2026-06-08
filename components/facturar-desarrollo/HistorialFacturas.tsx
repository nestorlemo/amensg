'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { ConfirmarCobroModal } from '@/components/confirmar-cobro-modal'

import { EmpresaOption, FacturaHistorial, fmt, formatDate } from './types'

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:     'bg-slate-100 text-slate-700',
  EN_DESARROLLO: 'bg-blue-100 text-blue-800',
  EN_TEST:       'bg-yellow-100 text-yellow-800',
  EN_PRODUCCION: 'bg-emerald-100 text-emerald-800',
  CANCELADO:     'bg-red-100 text-red-700',
}

export type HistorialHandle = { refresh: () => void }

export const HistorialFacturas = forwardRef<HistorialHandle, {
  empresasOpts: EmpresaOption[]
  onRefresh?: () => void
}>(function HistorialFacturas({ empresasOpts, onRefresh }, ref) {
  const [fEmpresaHistorial, setFEmpresaHistorial] = useState('')
  const [fEstadoCobro, setFEstadoCobro] = useState('')
  const [facturas, setFacturas] = useState<FacturaHistorial[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null)
  const [modalFactura, setModalFactura] = useState<FacturaHistorial | null>(null)
  const [issuesModal, setIssuesModal] = useState<FacturaHistorial | null>(null)

  useEffect(() => {
    void fetchHistorial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchHistorial() {
    setLoadingHistorial(true)
    try {
      const res = await fetch('/api/facturas-desarrollo')
      const data = (await res.json()) as { facturas?: FacturaHistorial[] }
      setFacturas(data.facturas ?? [])
    } finally {
      setLoadingHistorial(false)
    }
  }

  useImperativeHandle(ref, () => ({ refresh: () => void fetchHistorial() }))

  const filteredFacturas = facturas.filter((f) => {
    if (fEstadoCobro && f.estado !== fEstadoCobro) return false
    if (fEmpresaHistorial && f.empresa.id !== fEmpresaHistorial) return false
    return true
  })

  async function confirmarCobrado(facturaId: string, fecha: string) {
    await fetch(`/api/facturas-desarrollo/${facturaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COBRADO', fechaCobro: fecha }),
    })
    setModalFactura(null)
    void fetchHistorial()
  }

  async function eliminarFactura(facturaId: string) {
    if (!confirm('¿Eliminar esta factura y su ingreso adicional asociado?')) return
    await fetch(`/api/facturas-desarrollo/${facturaId}`, { method: 'DELETE' })
    void fetchHistorial()
  }

  async function subirPdf(cobroId: string, facturaId: string, file: File) {
    setUploadingPdf(facturaId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await fetch(`/api/cobros-unificado/${cobroId}/pdf`, { method: 'POST', body: fd })
      void fetchHistorial()
    } finally {
      setUploadingPdf(null)
    }
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Historial de facturas</h2>

          {/* Historial filters */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-xs font-medium text-slate-600">
              Empresa
              <select
                className="mt-1 block h-8 w-44 rounded-md border border-slate-300 px-2 text-xs"
                value={fEmpresaHistorial}
                onChange={(e) => setFEmpresaHistorial(e.target.value)}
              >
                <option value="">Todas</option>
                {empresasOpts.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Estado cobro
              <select
                className="mt-1 block h-8 w-36 rounded-md border border-slate-300 px-2 text-xs"
                value={fEstadoCobro}
                onChange={(e) => setFEstadoCobro(e.target.value)}
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

        {loadingHistorial ? (
          <p className="p-6 text-sm text-slate-400">Cargando…</p>
        ) : filteredFacturas.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            No hay facturas para los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-right">Horas</th>
                  <th className="px-4 py-3 text-right">S/IVA (USD)</th>
                  <th className="px-4 py-3 text-right">IVA (USD)</th>
                  <th className="px-4 py-3 text-right">C/IVA (USD)</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha Cobro</th>
                  <th className="px-4 py-3 text-left">PDF</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFacturas.map((f) => (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {String(f.mes).padStart(2, '0')}/{f.anio}
                    </td>
                    <td className="px-4 py-3">{f.empresa.nombre}</td>
                    <td className="px-4 py-3 text-right">{f.totalHoras}h</td>
                    <td className="px-4 py-3 text-right">${fmt(f.totalUSD)}</td>
                    <td className="px-4 py-3 text-right">${fmt(f.iva)}</td>
                    <td className="px-4 py-3 text-right font-semibold">${fmt(f.totalConIva)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${f.estado === 'COBRADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {formatDate(f.fechaCobro)}
                    </td>
                    <td className="px-4 py-3">
                      {f.cobroId && (
                        f.urlPdfFactura ? (
                          <a
                            href={`/api/cobros-unificado/${f.cobroId}/pdf`}
                            target="_blank" rel="noopener noreferrer"
                            className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Ver PDF
                          </a>
                        ) : (
                          <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            {uploadingPdf === f.id ? 'Subiendo...' : 'Subir PDF'}
                            <input
                              type="file" accept=".pdf" className="hidden"
                              onChange={(e) => { const file = e.target.files?.[0]; if (file && f.cobroId) void subirPdf(f.cobroId, f.id, file) }}
                            />
                          </label>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {f.issues.length > 0 && (
                          <button
                            onClick={() => setIssuesModal(f)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Detalles
                          </button>
                        )}
                        {f.estado !== 'COBRADO' && (
                          <button
                            onClick={() => setModalFactura(f)}
                            className="rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Marcar cobrado
                          </button>
                        )}
                        <button
                          onClick={() => void eliminarFactura(f.id)}
                          className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalFactura && (
        <ConfirmarCobroModal
          empresas={modalFactura.empresa.nombre}
          periodo={`${String(modalFactura.mes).padStart(2, '0')}/${modalFactura.anio}`}
          onConfirm={(fecha) => confirmarCobrado(modalFactura.id, fecha)}
          onCancel={() => setModalFactura(null)}
        />
      )}

      {issuesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden bg-white shadow-xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ background: 'var(--gradient-header)' }}>
              <h2 className="text-base font-semibold text-white">
                Issues facturados — {issuesModal.empresa.nombre} {String(issuesModal.mes).padStart(2, '0')}/{issuesModal.anio}
              </h2>
              <button
                className="ml-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={() => setIssuesModal(null)}
                type="button"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            {/* Scrollable table */}
            <div className="overflow-y-auto overflow-x-auto flex-1">
              <table className="min-w-full text-sm">
                <thead style={{ background: '#1F3864' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Fecha prod.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white">Horas</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issuesModal.issues.map((issue, idx) => (
                    <tr key={issue.id} className={`hover:bg-blue-50 ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {issue.fechaProduccion ? formatDate(issue.fechaProduccion) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 break-words max-w-xs">
                        {issue.descripcion}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                        {Number(issue.totalHoras).toFixed(2).replace(/\.?0+$/, '')}h
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[issue.estado] ?? 'bg-slate-100 text-slate-700'}`}>
                          {issue.estado.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold" style={{ background: '#1F3864' }}>
                    <td className="px-4 py-3 text-white" colSpan={2}>Total horas</td>
                    <td className="px-4 py-3 text-right text-white">
                      {(() => {
                        const t = issuesModal.issues.reduce((s, i) => s + i.totalHoras, 0)
                        return `${parseFloat(t.toFixed(2))}h`
                      })()}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Distribución */}
            {issuesModal.distribuciones.length > 0 && (
              <div className="shrink-0 border-t border-slate-200 px-6 py-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Distribución entre socios</h3>
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Socio</th>
                      <th className="px-3 py-2 text-right">Porcentaje</th>
                      <th className="px-3 py-2 text-right">Monto (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issuesModal.distribuciones.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{d.socio.nombre}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{d.porcentaje}%</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-950">
                          ${fmt((issuesModal.totalConIva * d.porcentaje) / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Footer */}
            <div className="flex justify-end border-t border-slate-200 px-6 py-4 shrink-0">
              <button
                className="h-9 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setIssuesModal(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
