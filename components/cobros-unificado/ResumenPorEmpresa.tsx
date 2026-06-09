'use client'

import { useState } from 'react'
import { fmt, type ResumenData } from './types'

type Props = {
  resumen: ResumenData
}

export function ResumenPorEmpresa({ resumen }: Props) {
  const [showResumen, setShowResumen] = useState(true)

  if (resumen.pendienteUYU.porEmpresa.length === 0 && resumen.pendienteUSD.porEmpresa.length === 0) {
    return null
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Cobros pendientes por empresa</h2>
        <button
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
          type="button"
          onClick={() => setShowResumen((v) => !v)}
        >
          {showResumen ? 'Ocultar resumen' : 'Mostrar resumen'}
        </button>
      </div>
      {showResumen && (
        <div className="divide-y divide-slate-100">
          {resumen.pendienteUYU.porEmpresa.length > 0 && (
            <div className="overflow-x-auto">
              <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Activaciones pendientes (UYU)</div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Empresa</th>
                    <th className="px-4 py-2 text-right">Facturas</th>
                    <th className="px-4 py-2 text-right">S/IVA (UYU)</th>
                    <th className="px-4 py-2 text-right">IVA (UYU)</th>
                    <th className="px-4 py-2 text-right">C/IVA (UYU)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.pendienteUYU.porEmpresa.map((r) => (
                    <tr key={r.empresa} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{r.empresa}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{r.facturas}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{fmt(r.sinIva)}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{fmt(r.iva)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{fmt(r.conIva)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {resumen.pendienteUSD.porEmpresa.length > 0 && (
            <div className="overflow-x-auto">
              <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Desarrollo pendiente (USD)</div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Empresa</th>
                    <th className="px-4 py-2 text-right">Facturas</th>
                    <th className="px-4 py-2 text-right">S/IVA (USD)</th>
                    <th className="px-4 py-2 text-right">IVA (USD)</th>
                    <th className="px-4 py-2 text-right">C/IVA (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.pendienteUSD.porEmpresa.map((r) => (
                    <tr key={r.empresa} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{r.empresa}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{r.facturas}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{fmt(r.sinIva)}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{fmt(r.iva)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{fmt(r.conIva)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
