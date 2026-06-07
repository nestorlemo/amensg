'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

import { ConfirmarCobroModal } from '@/components/confirmar-cobro-modal'

import { CobroHistorial, EmpresaOption, EstadoBadge, fmt, formatDate, formatPeriod } from './types'

export type HistorialActivacionesHandle = { refresh: () => void }

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

  async function subirPdf(cobroId: string, file: File) {
    setUploadingPdf(cobroId)
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
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">Sin registros.</td>
                    </tr>
                  ) : historial.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{formatPeriod(c.anio, c.mes)}</td>
                      <td className="px-4 py-3 text-sm">
                        {(c.empresas.length > 0 ? c.empresas : [{ id: c.empresaId, nombre: c.empresa }])
                          .map((e) => e.nombre)
                          .join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right">${fmt(c.montoSinIva)}</td>
                      <td className="px-4 py-3 text-right">${fmt(c.iva)}</td>
                      <td className="px-4 py-3 text-right font-semibold">${fmt(c.montoConIva)}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.fechaCobro)}</td>
                      <td className="px-4 py-3">
                        {c.urlPdfFactura ? (
                          <div className="flex flex-wrap gap-1">
                            <a
                              href={`/api/cobros-unificado/${c.id}/pdf`}
                              target="_blank" rel="noopener noreferrer"
                              className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            >
                              Ver PDF
                            </a>
                            <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              {uploadingPdf === c.id ? 'Subiendo...' : 'Reemplazar'}
                              <input type="file" accept=".pdf" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirPdf(c.id, f) }}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            {uploadingPdf === c.id ? 'Subiendo...' : 'Subir PDF'}
                            <input type="file" accept=".pdf" className="hidden"
                              ref={(el) => { fileInputRefs.current[c.id] = el }}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirPdf(c.id, f) }}
                            />
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {c.estado !== 'COBRADO' && (
                            <button
                              onClick={() => setModalCobro(c)}
                              disabled={marcandoCobrado === c.id}
                              className="rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              Marcar cobrado
                            </button>
                          )}
                          <button
                            onClick={() => void eliminarCobro(c.id)}
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
    </>
  )
})
