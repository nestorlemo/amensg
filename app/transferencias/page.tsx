'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(v: string | number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
}

function mesNombre(m: number) { return MESES[m - 1] ?? '' }

type Cobro = {
  id: string
  tipo: string
  empresa: string
  empresaId: string
  anio: number
  mes: number
  moneda: string
  montoSinIva: string
  montoConIva: string
  estado: string
  fechaCobro: string | null
}

type Transferencia = {
  id: string
  socioId: string
  socio: string
  cobroId: string
  cobroTipo: string
  cobroAnio: number
  cobroMes: number
  empresa: string
  moneda: string
  monto: string
  cuentaDestino: string | null
  fecha: string | null
  estado: string
  concepto: string
  creadoEn: string
}

type Socio = { id: string; nombre: string }
type Empresa = { id: string; nombre: string }

const TIPO_BADGE: Record<string, string> = {
  ACTIVACIONES: 'bg-blue-100 text-blue-800',
  DESARROLLO:   'bg-purple-100 text-purple-800',
  ADICIONAL:    'bg-teal-100 text-teal-800',
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:   'bg-amber-100 text-amber-700',
  TRANSFERIDO: 'bg-emerald-100 text-emerald-800',
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button className="rounded-md p-1 text-slate-400 hover:bg-slate-200" onClick={onClose} type="button">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function TransferenciasPage() {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selectedCobros, setSelectedCobros] = useState<Set<string>>(new Set())
  const [loadingCobros, setLoadingCobros] = useState(false)
  const [loadingTrans, setLoadingTrans] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cobros filters
  const [cobroEmpresaId, setCobroEmpresaId] = useState('')
  const [cobroDesde, setCobroDesde] = useState('')
  const [cobroHasta, setCobroHasta] = useState('')

  // Transferencias filters
  const [filtroSocio, setFiltroSocio] = useState('')
  const [filtroMoneda, setFiltroMoneda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  // Marcar transferido modal
  const [marcando, setMarcando] = useState<Transferencia | null>(null)
  const [fechaTransferencia, setFechaTransferencia] = useState(new Date().toISOString().split('T')[0]!)
  const [savingMarca, setSavingMarca] = useState(false)

  const fetchCobros = useCallback(async () => {
    setLoadingCobros(true)
    try {
      const params = new URLSearchParams()
      if (cobroEmpresaId) params.set('empresaId', cobroEmpresaId)
      if (cobroDesde) params.set('fechaDesde', cobroDesde)
      if (cobroHasta) params.set('fechaHasta', cobroHasta)
      const res = await fetch(`/api/transferencias/cobros-disponibles?${params}`)
      const data = await res.json() as { cobros?: Cobro[] }
      setCobros(data.cobros ?? [])
      setSelectedCobros(new Set())
    } finally {
      setLoadingCobros(false)
    }
  }, [cobroEmpresaId, cobroDesde, cobroHasta])

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

  useEffect(() => {
    fetch('/api/socios').then(r => r.json()).then((d: { rows?: Socio[] }) => setSocios(d.rows ?? []))
    fetch('/api/empresas').then(r => r.json()).then((d: Empresa[] | { empresas?: Empresa[] }) => {
      if (Array.isArray(d)) setEmpresas(d)
      else setEmpresas(d.empresas ?? [])
    })
  }, [])

  useEffect(() => { void fetchCobros() }, [fetchCobros])
  useEffect(() => { void fetchTransferencias() }, [fetchTransferencias])

  async function handleGenerar() {
    if (selectedCobros.size === 0) return
    setError(null)
    setGenerando(true)
    try {
      let lastError: string | null = null
      for (const cobroId of selectedCobros) {
        const res = await fetch('/api/transferencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cobroId }),
        })
        if (!res.ok) {
          const d = await res.json() as { error?: string }
          lastError = d.error ?? 'Error al generar transferencias.'
        }
      }
      if (lastError) setError(lastError)
      await fetchCobros()
      await fetchTransferencias()
    } finally {
      setGenerando(false)
    }
  }

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

  // Group transferencias by socio for display
  const bySocio = new Map<string, { nombre: string; rows: Transferencia[] }>()
  for (const t of transferencias) {
    const entry = bySocio.get(t.socioId) ?? { nombre: t.socio, rows: [] }
    entry.rows.push(t)
    bySocio.set(t.socioId, entry)
  }

  const anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-8">
      {/* Header */}
      <header
        className="relative overflow-hidden rounded-2xl px-8 py-8"
        style={{ background: 'var(--gradient-header)' }}
      >
        <div aria-hidden="true" style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(25,195,255,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <p className="relative mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>GESTIÓN MENSUAL</p>
        <h1 className="relative text-3xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>Gestión de Transferencias</h1>
        <p className="relative mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Generá y gestioná transferencias a socios desde cobros realizados.</p>
      </header>

      {/* Sección 1: Cobros disponibles */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Cobros disponibles para transferir</h2>
          <p className="mt-0.5 text-xs text-slate-500">Cobros en estado COBRADO sin transferencias generadas.</p>
        </div>

        {/* Filtros cobros */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Empresa</label>
            <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={cobroEmpresaId} onChange={e => setCobroEmpresaId(e.target.value)}>
              <option value="">Todas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Fecha cobro desde</label>
            <input type="date" className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={cobroDesde} onChange={e => setCobroDesde(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hasta</label>
            <input type="date" className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={cobroHasta} onChange={e => setCobroHasta(e.target.value)} />
          </div>
          <button className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-900" onClick={() => { setCobroEmpresaId(''); setCobroDesde(''); setCobroHasta('') }}>Limpiar</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={cobros.length > 0 && selectedCobros.size === cobros.length}
                    onChange={e => setSelectedCobros(e.target.checked ? new Set(cobros.map(c => c.id)) : new Set())}
                  />
                </th>
                <th className="whitespace-nowrap px-4 py-3">Tipo</th>
                <th className="whitespace-nowrap px-4 py-3">Empresa</th>
                <th className="whitespace-nowrap px-4 py-3">Período</th>
                <th className="whitespace-nowrap px-4 py-3">Moneda</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">S/IVA</th>
                <th className="whitespace-nowrap px-4 py-3">Estado cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingCobros ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Cargando…</td></tr>
              ) : cobros.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay cobros disponibles.</td></tr>
              ) : cobros.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCobros.has(c.id)}
                      onChange={e => {
                        const next = new Set(selectedCobros)
                        if (e.target.checked) next.add(c.id)
                        else next.delete(c.id)
                        setSelectedCobros(next)
                      }}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge label={c.tipo} cls={TIPO_BADGE[c.tipo] ?? 'bg-slate-100 text-slate-700'} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{c.empresa}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{mesNombre(c.mes)} {c.anio}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{c.moneda}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">{fmt(c.montoSinIva)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">COBRADO</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <span className="text-xs text-slate-500">{selectedCobros.size} cobro{selectedCobros.size !== 1 ? 's' : ''} seleccionado{selectedCobros.size !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <button
              className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={selectedCobros.size === 0 || generando}
              onClick={() => void handleGenerar()}
            >
              {generando ? 'Generando…' : 'Generar transferencias'}
            </button>
          </div>
        </div>
      </section>

      {/* Sección 2: Historial */}
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
                  {/* Socio header */}
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
    </div>
  )
}
