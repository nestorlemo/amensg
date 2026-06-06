'use client'

import { useEffect, useState } from 'react'

import { DateInput } from '@/components/date-input'
import { PageHeader } from '@/components/page-header'

// ── Types ────────────────────────────────────────────────────────────────────

type IssueDisponible = {
  id: string
  fecha: string
  descripcion: string
  totalHoras: number
  estado: string
  empresa: { id: string; nombre: string } | null
}

type SocioState = {
  id: string
  nombre: string
  porcentaje: string // editable string, e.g. "50"
}

type EmpresaOption = { id: string; nombre: string }

type FacturaHistorial = {
  id: string
  anio: number
  mes: number
  creadoEn: string
  empresa: { id: string; nombre: string }
  totalHoras: number
  totalUSD: number
  iva: number
  totalConIva: number
  estado: string
  ingresoAdicionalId: string | null
  distribuciones: {
    id: string
    porcentaje: number
    montoUYU: number
    socio: { id: string; nombre: string }
  }[]
  issues: { id: string; descripcion: string; totalHoras: number }[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── Page component ────────────────────────────────────────────────────────────

export default function FacturarDesarrolloPage() {
  // ── Shared data ────────────────────────────────────────────────────────────
  const [empresasOpts, setEmpresasOpts] = useState<EmpresaOption[]>([])
  const [valorHora, setValorHora] = useState(45) // default 45 if config unavailable

  // ── Section 1: Issues disponibles para facturar ───────────────────────────
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [fEmpresaBusqueda, setFEmpresaBusqueda] = useState('')
  const [issuesDisponibles, setIssuesDisponibles] = useState<IssueDisponible[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [socios, setSocios] = useState<SocioState[]>([])
  const [buscando, setBuscando] = useState(false)
  const [searched, setSearched] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── Section 2: Historial de facturas ──────────────────────────────────────
  const [fEmpresaHistorial, setFEmpresaHistorial] = useState('')
  const [fEstadoCobro, setFEstadoCobro] = useState('')
  const [facturas, setFacturas] = useState<FacturaHistorial[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    // Socios
    fetch('/api/socios')
      .then((r) => r.json())
      .then((d: unknown) => {
        const rows: { id: string; nombre: string; porcentajeParticipacion: string | number }[] =
          Array.isArray(d) ? d : Array.isArray((d as { rows?: unknown[] }).rows) ? (d as { rows: { id: string; nombre: string; porcentajeParticipacion: string | number }[] }).rows : []
        setSocios(
          rows.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            porcentaje: String(Math.round(Number(s.porcentajeParticipacion) * 100)),
          }))
        )
      })
      .catch(() => null)

    // Valor hora from config
    fetch('/api/issues/config')
      .then((r) => r.json())
      .then((d: { valorHoraUSD?: number }) => {
        if (d.valorHoraUSD && d.valorHoraUSD > 0) setValorHora(d.valorHoraUSD)
      })
      .catch(() => null)

    // Empresas
    fetch('/api/empresas?activo=true')
      .then((r) => r.json())
      .then((d: { empresas?: EmpresaOption[]; data?: EmpresaOption[] }) =>
        setEmpresasOpts(d.empresas ?? d.data ?? [])
      )
      .catch(() => null)

    void fetchHistorial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Section 1 helpers ─────────────────────────────────────────────────────

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
        void fetchHistorial()
      }
    } catch {
      setErrorMsg('Error de red al generar la factura.')
    } finally {
      setGenerando(false)
    }
  }

  // ── Section 2 helpers ─────────────────────────────────────────────────────

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

  const filteredFacturas = facturas.filter((f) => {
    if (fEstadoCobro && f.estado !== fEstadoCobro) return false
    if (fEmpresaHistorial && f.empresa.id !== fEmpresaHistorial) return false
    return true
  })

  async function marcarCobrado(facturaId: string) {
    await fetch(`/api/facturas-desarrollo/${facturaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COBRADO' }),
    })
    void fetchHistorial()
  }

  async function eliminarFactura(facturaId: string) {
    if (!confirm('¿Eliminar esta factura y su ingreso adicional asociado?')) return
    await fetch(`/api/facturas-desarrollo/${facturaId}`, { method: 'DELETE' })
    void fetchHistorial()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        section="DESARROLLO"
        title="Facturación de desarrollo"
        description="Generá facturas de desarrollo por empresa a partir de issues en producción."
      />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Issues disponibles para facturar
      ══════════════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — Historial de facturas
      ══════════════════════════════════════════════════════════════════════ */}
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
                <option value="PENDIENTE">Pendiente</option>
                <option value="COBRADO">Cobrado</option>
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
                  <th className="px-4 py-3 text-right">USD S/IVA</th>
                  <th className="px-4 py-3 text-right">IVA USD</th>
                  <th className="px-4 py-3 text-right">Total C/IVA USD</th>
                  <th className="px-4 py-3 text-left">Distribución</th>
                  <th className="px-4 py-3 text-left">Estado cobro</th>
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
                    <td className="px-4 py-3 text-right">${fmt(f.totalUSD)} USD</td>
                    <td className="px-4 py-3 text-right">${fmt(f.iva)} USD</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ${fmt(f.totalConIva)} USD
                    </td>
                    <td className="px-4 py-3">
                      {f.distribuciones.length === 0
                        ? '—'
                        : f.distribuciones.map((d) => (
                            <div key={d.id} className="text-xs">
                              {d.socio.nombre}: {d.porcentaje}% · $
                              {fmt(d.montoUYU / f.tipoCambio)} USD
                            </div>
                          ))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.estado === 'COBRADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {f.estado !== 'COBRADO' && (
                          <button
                            onClick={() => void marcarCobrado(f.id)}
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
    </div>
  )
}
