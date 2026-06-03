'use client'

import { useEffect, useState } from 'react'

import { DateInput } from '@/components/date-input'
import { PageHeader } from '@/components/page-header'

type Issue = {
  id: string; fecha: string; descripcion: string; totalHoras: number; estado: string
  empresa: { id: string; nombre: string } | null
}

type Socio = { id: string; nombre: string; porcentajeParticipacion: string }

type EmpresaGroup = {
  empresaId: string
  nombre: string
  issues: Issue[]
  totalHoras: number
}

type Distribucion = { socioId: string; nombre: string; porcentaje: string }

type EmpresaOption = { id: string; nombre: string }

type EstadoFact = 'sin_facturar' | 'facturados' | 'todos'

export default function FacturarDesarrolloPage() {
  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]!

  const [fechaDesde, setFechaDesde] = useState(firstOfMonth)
  const [fechaHasta, setFechaHasta] = useState(today)
  const [fEmpresa, setFEmpresa] = useState('')
  const [fEstadoFact, setFEstadoFact] = useState<EstadoFact>('sin_facturar')
  const [empresasOpts, setEmpresasOpts] = useState<EmpresaOption[]>([])
  const [groups, setGroups]     = useState<EmpresaGroup[]>([])
  const [socios, setSocios]     = useState<Socio[]>([])
  const [valorHora, setValorHora] = useState(0)
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)

  // Per-empresa form state
  const [distribuciones, setDistribuciones] = useState<Record<string, Distribucion[]>>({})
  const [selectedIssues, setSelectedIssues] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({})

  useEffect(() => {
    fetch('/api/socios')
      .then((r) => r.json())
      .then((d) => setSocios(d.socios ?? []))
      .catch(() => null)
    fetch('/api/issues/config')
      .then((r) => r.json())
      .then((d: { valorHoraUSD: number }) => setValorHora(d.valorHoraUSD ?? 0))
      .catch(() => null)
    fetch('/api/empresas?activo=true')
      .then((r) => r.json())
      .then((d: { empresas?: EmpresaOption[]; data?: EmpresaOption[] }) => setEmpresasOpts(d.empresas ?? d.data ?? []))
      .catch(() => null)
  }, [])

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSearched(false)
    setGroups([])
    try {
      const qs = new URLSearchParams({ fechaDesde, fechaHasta })
      if (fEmpresa) qs.set('empresaId', fEmpresa)
      if (fEstadoFact === 'sin_facturar') {
        qs.set('estado', 'EN_PRODUCCION')
      } else if (fEstadoFact === 'facturados') {
        qs.set('estado', 'FACTURADO')
      } else {
        qs.append('estadoIn', 'EN_PRODUCCION')
        qs.append('estadoIn', 'FACTURADO')
      }
      const res = await fetch(`/api/issues?${qs}`)
      const data = await res.json()
      const issues: Issue[] = data.issues ?? []

      // Group by empresa
      const map = new Map<string, EmpresaGroup>()
      for (const issue of issues) {
        const eId = issue.empresa?.id ?? 'sin-empresa'
        const eNombre = issue.empresa?.nombre ?? 'Sin empresa'
        if (!map.has(eId)) map.set(eId, { empresaId: eId, nombre: eNombre, issues: [], totalHoras: 0 })
        const g = map.get(eId)!
        g.issues.push(issue)
        g.totalHoras += issue.totalHoras
      }

      const gs = Array.from(map.values())
      setGroups(gs)

      // Init state per empresa — only pre-select issues that are NOT already FACTURADO
      const initSel: Record<string, Set<string>> = {}
      const initDist: Record<string, Distribucion[]> = {}
      for (const g of gs) {
        initSel[g.empresaId] = new Set(g.issues.filter((i) => i.estado !== 'FACTURADO').map((i) => i.id))
        initDist[g.empresaId] = socios.map((s) => ({ socioId: s.id, nombre: s.nombre, porcentaje: '' }))
      }
      setSelectedIssues(initSel)
      setDistribuciones(initDist)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleFacturar(g: EmpresaGroup) {
    if (valorHora <= 0) {
      setResults((r) => ({ ...r, [g.empresaId]: { ok: false, msg: 'No hay valor hora registrado.' } }))
      return
    }

    const issueIds = Array.from(selectedIssues[g.empresaId] ?? [])
    if (issueIds.length === 0) {
      setResults((r) => ({ ...r, [g.empresaId]: { ok: false, msg: 'Seleccioná al menos un issue.' } }))
      return
    }

    const dist = distribuciones[g.empresaId]?.filter((d) => d.porcentaje !== '') ?? []
    const totalPct = dist.reduce((s, d) => s + Number(d.porcentaje), 0)
    if (socios.length > 0 && Math.abs(totalPct - 100) > 0.01) {
      setResults((r) => ({ ...r, [g.empresaId]: { ok: false, msg: 'Los porcentajes de distribución deben sumar 100%.' } }))
      return
    }

    setSaving((s) => ({ ...s, [g.empresaId]: true }))
    try {
      const res = await fetch('/api/facturas-desarrollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaDesde,
          fechaHasta,
          empresaId: g.empresaId,
          tipoCambio: 1,
          valorHoraUSD: valorHora,
          issueIds,
          distribuciones: dist.map((d) => ({ socioId: d.socioId, porcentaje: Number(d.porcentaje) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResults((r) => ({ ...r, [g.empresaId]: { ok: false, msg: data.message ?? 'Error al facturar.' } }))
      } else {
        setResults((r) => ({ ...r, [g.empresaId]: { ok: true, msg: `Factura creada. Total: $${(data.totalConIva as number)?.toFixed(2)} USD` } }))
        // Mark included issues as FACTURADO in local state
        setGroups((prev) => prev.map((grp) =>
          grp.empresaId !== g.empresaId ? grp : {
            ...grp,
            issues: grp.issues.map((i) => issueIds.includes(i.id) ? { ...i, estado: 'FACTURADO' } : i),
          }
        ))
      }
    } finally {
      setSaving((s) => ({ ...s, [g.empresaId]: false }))
    }
  }

  function toggleIssue(eId: string, issue: Issue) {
    if (issue.estado === 'FACTURADO') return
    setSelectedIssues((prev) => {
      const next = new Set(prev[eId] ?? [])
      if (next.has(issue.id)) next.delete(issue.id); else next.add(issue.id)
      return { ...prev, [eId]: next }
    })
  }

  function setDist(eId: string, socioId: string, pct: string) {
    setDistribuciones((prev) => ({
      ...prev,
      [eId]: (prev[eId] ?? []).map((d) => d.socioId === socioId ? { ...d, porcentaje: pct } : d),
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader section="DESARROLLO" title="Facturación de desarrollo" description="Generá facturas de desarrollo por empresa a partir de issues en producción." />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <form className="flex flex-wrap items-end gap-4" onSubmit={(e) => void handleBuscar(e)}>
          <label className="block text-sm font-medium text-slate-700">
            Fecha prod. desde
            <DateInput className="mt-1 block h-9 w-40 rounded-md border border-slate-300 px-3 text-sm" value={fechaDesde} onChange={setFechaDesde} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Fecha prod. hasta
            <DateInput className="mt-1 block h-9 w-40 rounded-md border border-slate-300 px-3 text-sm" value={fechaHasta} onChange={setFechaHasta} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Empresa
            <select className="mt-1 block h-9 w-48 rounded-md border border-slate-300 px-3 text-sm" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)}>
              <option value="">Todas</option>
              {empresasOpts.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Estado de facturación
            <select className="mt-1 block h-9 w-44 rounded-md border border-slate-300 px-3 text-sm" value={fEstadoFact} onChange={(e) => setFEstadoFact(e.target.value as EstadoFact)}>
              <option value="sin_facturar">Sin facturar</option>
              <option value="facturados">Facturados</option>
              <option value="todos">Todos</option>
            </select>
          </label>
          <button className="h-9 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={loading} type="submit">
            {loading ? 'Buscando…' : 'Buscar issues'}
          </button>
        </form>
        {valorHora > 0 && (
          <p className="mt-2 text-sm text-slate-500">Valor hora actual: <span className="font-semibold text-slate-800">${valorHora.toFixed(2)} USD</span></p>
        )}
      </section>

      {searched && groups.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay issues para los filtros seleccionados.
        </p>
      )}

      {groups.map((g) => {
        const selIds      = selectedIssues[g.empresaId] ?? new Set()
        const selIssues   = g.issues.filter((i) => selIds.has(i.id))
        const selHoras    = selIssues.reduce((s, i) => s + i.totalHoras, 0)
        const totalUSD    = Math.round(selHoras * valorHora * 100) / 100
        const ivaUSD      = Math.round(totalUSD * 0.22 * 100) / 100
        const totalConIvaUSD = Math.round((totalUSD + ivaUSD) * 100) / 100
        const dist        = distribuciones[g.empresaId] ?? []
        const totalPct    = dist.reduce((s, d) => s + Number(d.porcentaje || 0), 0)
        const distOk      = socios.length === 0 || Math.abs(totalPct - 100) < 0.01
        const res         = results[g.empresaId]

        return (
          <section key={g.empresaId} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-950">{g.nombre}</h2>

            {/* Issues */}
            <div className="mb-4 overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-center">✓</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-right">Horas</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {g.issues.map((issue) => {
                    const isFacturado = issue.estado === 'FACTURADO'
                    return (
                      <tr key={issue.id} className={selIds.has(issue.id) ? '' : 'opacity-50'}>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selIds.has(issue.id)}
                            disabled={isFacturado}
                            onChange={() => toggleIssue(g.empresaId, issue)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{issue.fecha}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{issue.empresa?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">
                          <span title={issue.descripcion}>{issue.descripcion.length > 80 ? issue.descripcion.slice(0, 80) + '…' : issue.descripcion}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{issue.totalHoras}h</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {isFacturado && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">Ya facturado</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cálculo */}
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Total horas</p>
                <p className="text-xl font-bold text-slate-950">{selHoras.toFixed(2)}h</p>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Total USD s/IVA</p>
                <p className="text-xl font-bold text-blue-700">${totalUSD.toFixed(2)}</p>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">IVA (22%) USD</p>
                <p className="text-xl font-bold text-slate-700">${ivaUSD.toFixed(2)}</p>
              </div>
              <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-center">
                <p className="text-xs text-slate-500">Total c/IVA USD</p>
                <p className="text-xl font-bold text-emerald-700">${totalConIvaUSD.toFixed(2)}</p>
              </div>
            </div>

            {/* Distribución entre socios */}
            {socios.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Distribución entre socios</h3>
                <div className="flex flex-wrap items-end gap-4">
                  {dist.map((d) => (
                    <label key={d.socioId} className="block text-sm font-medium text-slate-700">
                      {d.nombre} (%)
                      <input
                        className="mt-1 block h-9 w-24 rounded-md border border-slate-300 px-3 text-sm"
                        type="number" step="0.01" min="0" max="100" placeholder="0"
                        value={d.porcentaje}
                        onChange={(e) => setDist(g.empresaId, d.socioId, e.target.value)}
                      />
                      {d.porcentaje ? (
                        <span className="block text-xs text-slate-400">${(totalConIvaUSD * Number(d.porcentaje) / 100).toFixed(2)} USD</span>
                      ) : null}
                    </label>
                  ))}
                  <div className="pb-2">
                    <span className={`text-sm font-semibold ${distOk ? 'text-emerald-700' : 'text-red-600'}`}>
                      Total: {totalPct.toFixed(1)}%
                    </span>
                    {!distOk && totalPct > 0 && (
                      <p className="mt-0.5 text-xs text-red-600">Debe sumar 100%</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {res && (
              <p className={`mb-3 rounded-md px-3 py-2 text-sm ${res.ok ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
                {res.msg}
              </p>
            )}

            {!res?.ok && (
              <button
                className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={saving[g.empresaId] || valorHora <= 0 || !distOk || selIssues.length === 0}
                onClick={() => void handleFacturar(g)}
                title={!distOk ? 'Completá la distribución entre socios (debe sumar 100%)' : undefined}
              >
                {saving[g.empresaId] ? 'Generando…' : 'Generar factura'}
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}
