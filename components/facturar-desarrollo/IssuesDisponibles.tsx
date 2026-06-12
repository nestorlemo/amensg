'use client'

import { useEffect, useState } from 'react'

import { DateInput } from '@/components/date-input'

import { EmpresaOption, IssueDisponible, SocioState, fmt } from './types'

export function IssuesDisponibles({
  empresasOpts,
  valorHora,
  socios: sociosProp,
  onFacturaGenerada,
}: {
  empresasOpts: EmpresaOption[]
  valorHora: number
  socios: SocioState[]
  onFacturaGenerada: () => void
}) {
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [fEmpresaBusqueda, setFEmpresaBusqueda] = useState('')
  const [issuesDisponibles, setIssuesDisponibles] = useState<IssueDisponible[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [socios, setSocios] = useState<SocioState[]>(sociosProp)
  const [buscando, setBuscando] = useState(false)
  const [searched, setSearched] = useState(false)
  const [generando,      setGenerando]      = useState(false)
  const [agruparFactura, setAgruparFactura] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Sync socios when loaded asynchronously by parent
  useEffect(() => {
    if (sociosProp.length > 0) setSocios(sociosProp)
  }, [sociosProp])

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    setBuscando(true)
    setSearched(false)
    setIssuesDisponibles([])
    setSelectedIds(new Set())
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const qs = new URLSearchParams({ estado: 'sin_facturar' })
      if (fDesde) qs.set('fechaDesde', fDesde)
      if (fHasta) qs.set('fechaHasta', fHasta)
      if (fEmpresaBusqueda) qs.set('empresaId', fEmpresaBusqueda)
      const res = await fetch(`/api/facturas-desarrollo?${qs}`)
      const data = (await res.json()) as { issues?: IssueDisponible[] }
      const issues = data.issues ?? []
      setIssuesDisponibles(issues)
      // Pre-select all
      setSelectedIds(new Set(issues.map((i) => i.id)))
      setSearched(true)
    } finally {
      setBuscando(false)
    }
  }

  function toggleAll() {
    if (selectedIds.size === issuesDisponibles.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(issuesDisponibles.map((i) => i.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function setSocioPct(id: string, pct: string) {
    setSocios((prev) => prev.map((s) => (s.id === id ? { ...s, porcentaje: pct } : s)))
  }

  const totalPct = socios.reduce((acc, s) => acc + Number(s.porcentaje || 0), 0)
  const pctOk = socios.length === 0 || Math.abs(totalPct - 100) < 0.01

  const selIssues = issuesDisponibles.filter((i) => selectedIds.has(i.id))
  const totalHorasSel = selIssues.reduce((s, i) => s + i.totalHoras, 0)
  const totalSinIva = Math.round(totalHorasSel * valorHora * 100) / 100
  const ivaAmt = Math.round(totalSinIva * 0.22 * 100) / 100
  const totalConIva = Math.round((totalSinIva + ivaAmt) * 100) / 100

  // Derive empresaId from selected issues (first one)
  const empresaIdDeIssues = selIssues[0]?.empresa?.id ?? ''

  async function handleGenerar() {
    setGenerando(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    // We need to derive fechaDesde/fechaHasta from the selected issues or the filter
    // Use filter values if provided, otherwise derive from issues dates
    const sortedDates = selIssues.map((i) => i.fecha).sort()
    const derivedDesde = fDesde || sortedDates[0] || ''
    const derivedHasta = fHasta || sortedDates[sortedDates.length - 1] || ''

    const distribuciones = socios
      .map((s) => ({ socioId: s.id, porcentaje: Number(s.porcentaje || 0) }))
      .filter((d) => d.porcentaje > 0)

    try {
      const res = await fetch('/api/facturas-desarrollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaDesde: derivedDesde,
          fechaHasta: derivedHasta,
          empresaId: empresaIdDeIssues,
          tipoCambio: 1,
          issueIds: Array.from(selectedIds),
          distribuciones,
          crearCobro: true,
          agruparEnFactura: agruparFactura,
        }),
      })
      const data = (await res.json()) as { message?: string; totalConIva?: number }
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Error al generar la factura.')
      } else {
        setSuccessMsg(`Factura generada. Total: $${fmt(data.totalConIva ?? 0)} USD`)
        setSelectedIds(new Set())
        setIssuesDisponibles([])
        setSearched(false)
        onFacturaGenerada()
      }
    } catch {
      setErrorMsg('Error de red al generar la factura.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-5 text-base font-semibold text-slate-950">
        Issues disponibles para facturar
      </h2>

      {/* Search filters */}
      <form className="mb-5 flex flex-wrap items-end gap-4" onSubmit={(e) => void handleBuscar(e)}>
        <label className="block text-sm font-medium text-slate-700">
          Fecha prod. desde
          <DateInput
            className="mt-1 block h-9 w-32 rounded-md border border-slate-300 px-3 text-sm"
            value={fDesde}
            onChange={setFDesde}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Fecha prod. hasta
          <DateInput
            className="mt-1 block h-9 w-32 rounded-md border border-slate-300 px-3 text-sm"
            value={fHasta}
            onChange={setFHasta}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Empresa
          <select
            className="mt-1 block h-9 w-48 rounded-md border border-slate-300 px-3 text-sm"
            value={fEmpresaBusqueda}
            onChange={(e) => setFEmpresaBusqueda(e.target.value)}
          >
            <option value="">Todas</option>
            {empresasOpts.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre}
              </option>
            ))}
          </select>
        </label>
        <button
          className="h-9 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={buscando}
          type="submit"
        >
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {valorHora > 0 && (
        <p className="mb-4 text-sm text-slate-500">
          Valor hora actual:{' '}
          <span className="font-semibold text-slate-800">${valorHora.toFixed(2)} USD</span>
        </p>
      )}

      {/* Issues table */}
      {searched && issuesDisponibles.length === 0 && (
        <p className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
          No hay issues sin facturar para los filtros seleccionados.
        </p>
      )}

      {issuesDisponibles.length > 0 && (
        <>
          <div className="mb-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === issuesDisponibles.length && issuesDisponibles.length > 0}
                      onChange={toggleAll}
                      title="Seleccionar todos"
                    />
                  </th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issuesDisponibles.map((issue) => (
                  <tr
                    key={issue.id}
                    className={selectedIds.has(issue.id) ? '' : 'opacity-50'}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(issue.id)}
                        onChange={() => toggleOne(issue.id)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {issue.fecha}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {issue.empresa?.nombre ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <span title={issue.descripcion}>
                        {issue.descripcion.length > 80
                          ? issue.descripcion.slice(0, 80) + '…'
                          : issue.descripcion}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                      {issue.totalHoras}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dynamic summary */}
          <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <span className="font-medium">Issues seleccionados:</span>{' '}
              {selectedIds.size} de {issuesDisponibles.length}
            </p>
            <p>
              <span className="font-medium">Total horas:</span>{' '}
              {totalHorasSel.toFixed(2)} h
            </p>
            <p>
              <span className="font-medium">Total USD s/IVA:</span>{' '}
              ${fmt(totalSinIva)}
            </p>
            <p>
              <span className="font-medium">IVA (22%):</span>{' '}
              ${fmt(ivaAmt)}
            </p>
            <p className="font-semibold text-slate-950">
              Total c/IVA USD: ${fmt(totalConIva)}
            </p>
          </div>

          {/* Socios distribution */}
          <div className="mb-6 rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Distribución entre socios — sobre monto s/IVA
            </h3>
            {socios.length === 0 ? (
              <p className="text-sm text-slate-400">Cargando socios…</p>
            ) : (
              <>
                <div className="space-y-2">
                  {socios.map((socio) => {
                    const monto = totalSinIva * Number(socio.porcentaje || 0) / 100
                    return (
                      <div key={socio.id} className="flex items-center gap-3">
                        <span className="w-40 text-sm text-slate-700">{socio.nombre}</span>
                        <input
                          className="h-9 w-24 rounded-md border border-slate-300 px-3 text-right text-sm"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={socio.porcentaje}
                          onChange={(e) => setSocioPct(socio.id, e.target.value)}
                        />
                        <span className="text-sm text-slate-500">%</span>
                        <span className="w-28 text-right text-sm font-semibold text-slate-800">
                          {socio.porcentaje ? `$${fmt(monto)} USD` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${pctOk ? 'text-emerald-700' : totalPct > 0 ? 'text-red-600' : 'text-slate-400'}`}
                  >
                    Total asignado: {totalPct.toFixed(1)}%
                  </span>
                  {!pctOk && totalPct > 0 && (
                    <span className="text-xs text-red-600">
                      Los porcentajes deben sumar 100%
                    </span>
                  )}
                  {pctOk && totalPct > 0 && (
                    <span className="text-xs text-emerald-600">OK</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Feedback messages */}
          {successMsg && (
            <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </p>
          )}

          {/* Agrupar en factura */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={agruparFactura}
              onChange={(e) => setAgruparFactura(e.target.checked)}
              className="rounded"
            />
            Agrupar en una sola factura (PDF único)
          </label>

          {/* Generate button */}
          <button
            className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={
              generando ||
              selectedIds.size === 0 ||
              !pctOk ||
              !empresaIdDeIssues
            }
            onClick={() => void handleGenerar()}
            title={
              !pctOk
                ? 'Los porcentajes de socios deben sumar 100%'
                : selectedIds.size === 0
                ? 'Seleccioná al menos un issue'
                : undefined
            }
          >
            {generando ? 'Generando…' : 'Generar factura'}
          </button>
        </>
      )}
    </section>
  )
}
