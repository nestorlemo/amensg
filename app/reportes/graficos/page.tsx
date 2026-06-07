'use client'

import { useEffect, useState } from 'react'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PageHeader } from '@/components/page-header'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const EMPRESA_COLORS: Record<string, string> = {
  Elared: '#1769E0',
  Relpont: '#20E0B2',
  VOS: '#F0B840',
  'Ciudad Móvil': '#a78bfa',
}
const EMPRESA_FALLBACK = '#19C3FF'

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#94a3b8',
  EN_DESARROLLO: '#1769E0',
  EN_TEST: '#F0B840',
  EN_PRODUCCION: '#20E0B2',
  CANCELADO: '#f87171',
}

function empresaColor(nombre: string) {
  return EMPRESA_COLORS[nombre] ?? EMPRESA_FALLBACK
}

type GraficosData = {
  activacionesPorMesEmpresa: { mes: number; empresa: string; cantidad: number }[]
  facturacionPorMesEmpresa: { mes: number; empresa: string; totalSinIva: number }[]
  resultadoMensual: { mes: number; ingresos: number; gastos: number; resultado: number }[]
  resultadoFinancieroTotal: { mes: number; ingresosActivaciones: number; ingresosAdicionales: number; desarrolloUYU: number; gastos: number; resultado: number }[]
  distribucionSocios: { socio: string; monto: number }[]
  issuesPorEstado: { estado: string; count: number }[]
  horasDesarrolloPorMes: { mes: number; horas: number }[]
  facturacionDesarrolloPorMes: { mes: number; totalUSD: number; acumulado: number }[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(n)
}

function fmtShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M`
  if (abs >= 1_000) return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(n / 1_000)}K`
  return new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(n)
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e6eefc] bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  )
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e6eefc] bg-gradient-to-br from-[#EEF4FF] to-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#1769E0] tabular-nums">{value}</p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[300px] animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

function pivotByEmpresa(rows: { mes: number; empresa: string; [k: string]: number | string }[], valueKey: string) {
  const empresas = [...new Set(rows.map(r => r.empresa))]
  const byMes = new Map<number, Record<string, number | string>>()
  for (let m = 1; m <= 12; m++) byMes.set(m, { mes: m })
  for (const row of rows) {
    byMes.get(row.mes)![row.empresa] = Number(row[valueKey])
  }
  return { data: Array.from(byMes.values()).sort((a, b) => Number(a.mes) - Number(b.mes)), empresas }
}

type EmpresaOpt = { id: string; nombre: string }

export default function GraficosPage() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [empresaId, setEmpresaId] = useState('')
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([])
  const [data, setData] = useState<GraficosData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/empresas')
      .then(r => r.json())
      .then((d: { empresas?: EmpresaOpt[] }) => setEmpresas(d.empresas ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setData(null)
    const url = `/api/reportes/graficos?anio=${anio}${empresaId ? `&empresaId=${empresaId}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then((d: GraficosData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [anio, empresaId])

  const kpis = data ? {
    activaciones: data.activacionesPorMesEmpresa.reduce((s, r) => s + r.cantidad, 0),
    facturadoActivaciones: data.facturacionPorMesEmpresa.reduce((s, r) => s + r.totalSinIva, 0),
    facturadoDesarrollo: data.facturacionDesarrolloPorMes.reduce((s, r) => s + r.totalUSD, 0),
    resultado: data.resultadoMensual.reduce((s, r) => s + r.resultado, 0),
  } : null

  const { data: activData, empresas: activEmpresas } = data
    ? pivotByEmpresa(data.activacionesPorMesEmpresa as { mes: number; empresa: string; [k: string]: number | string }[], 'cantidad')
    : { data: [], empresas: [] }

  const { data: facturData, empresas: facturEmpresas } = data
    ? pivotByEmpresa(data.facturacionPorMesEmpresa as { mes: number; empresa: string; [k: string]: number | string }[], 'totalSinIva')
    : { data: [], empresas: [] }

  const pieActivData = data ? (() => {
    const map = new Map<string, number>()
    for (const r of data.activacionesPorMesEmpresa) map.set(r.empresa, (map.get(r.empresa) ?? 0) + r.cantidad)
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  })() : []

  const resultadoData = data?.resultadoMensual.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []
  const finTotalData = data?.resultadoFinancieroTotal.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []
  const horasData = data?.horasDesarrolloPorMes.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []
  const acumuladoData = data?.facturacionDesarrolloPorMes.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <PageHeader
        section="REPORTES"
        title="Reportes y Gráficos"
        description={empresaId
          ? `Mostrando datos de ${empresas.find(e => e.id === empresaId)?.nombre ?? 'empresa seleccionada'} — ${anio}`
          : `Evolución mensual, KPIs y distribución por socio — ${anio}`}
      />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">
          Año
          <select
            className="ml-2 h-9 rounded-md border border-slate-300 px-3 text-sm"
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Empresa
          <select
            className="ml-2 h-9 rounded-md border border-slate-300 px-3 text-sm"
            value={empresaId}
            onChange={e => setEmpresaId(e.target.value)}
          >
            <option value="">Todas las empresas</option>
            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
          </select>
        </label>
      </div>

      {loading ? <Skeleton /> : !data ? (
        <p className="text-center text-sm text-slate-500">Error al cargar datos.</p>
      ) : (
        <div className="space-y-8">
          {/* KPIs */}
          <section className="space-y-4">
            <SectionTitle title={empresaId ? `KPIs del año — ${empresas.find(e => e.id === empresaId)?.nombre ?? ''}` : 'KPIs del año'} color="#1769E0" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KpiCard label="Total activaciones" value={fmt(kpis!.activaciones)} />
              <KpiCard label="Facturado activaciones S/IVA (UYU)" value={fmt(kpis!.facturadoActivaciones)} />
              <KpiCard label="Facturado desarrollo S/IVA (USD)" value={fmt(kpis!.facturadoDesarrollo)} />
              <KpiCard label="Resultado distribuible (UYU)" value={fmt(kpis!.resultado)} />
            </div>
          </section>

          {/* Activaciones */}
          <section className="space-y-4">
            <SectionTitle title="Activaciones" color="#1769E0" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Chart 1: AreaChart evolución activaciones */}
              <ChartCard title="Evolución mensual de activaciones">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={activData.map(d => {
                    const row = { ...d, mes: MESES[Number(d.mes) - 1] } as Record<string, number | string>
                    const total = activEmpresas.reduce((s, emp) => s + Number(row[emp] ?? 0), 0)
                    return { ...row, Total: total }
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {activEmpresas.map((emp) => (
                      <Area
                        key={emp}
                        type="monotone"
                        dataKey={emp}
                        stroke={empresaColor(emp)}
                        fill={empresaColor(emp)}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                    <Area
                      type="monotone"
                      dataKey="Total"
                      stroke="#0B1F3A"
                      fill="#0B1F3A"
                      fillOpacity={0.05}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 2: BarChart apilado facturación */}
              <ChartCard title="Facturación por empresa (UYU s/IVA)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={facturData.map(d => ({ ...d, mes: MESES[Number(d.mes) - 1] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {facturEmpresas.map((emp) => (
                      <Bar key={emp} dataKey={emp} stackId="stack" fill={empresaColor(emp)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 3: PieChart mix */}
              <ChartCard title="Activaciones por empresa (año completo)">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieActivData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}>
                      {pieActivData.map((entry) => (
                        <Cell key={entry.name} fill={empresaColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>

          {/* Financiero */}
          <section className="space-y-4">
            <SectionTitle title="Financiero" color="#20E0B2" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Chart 4: ComposedChart resultado mensual */}
              <ChartCard title={empresaId ? `Resultado mensual — ${empresas.find(e => e.id === empresaId)?.nombre ?? ''} (gastos totales compartidos)` : 'Resultado mensual (UYU)'}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={resultadoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos S/IVA (UYU)" stackId="stack" fill="#93c5fd" />
                    <Bar dataKey="gastos" name="Gastos S/IVA (UYU)" stackId="stack" fill="#fca5a5" />
                    <Line type="monotone" dataKey="resultado" name="Resultado (UYU)" stroke="#20E0B2" strokeWidth={2} dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 4b: ComposedChart resultado financiero total */}
              <ChartCard title="Resultado financiero total mensual (UYU)">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={finTotalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="ingresosActivaciones" name="Activaciones S/IVA (UYU)" stackId="ing" fill="#1769E0" />
                    <Bar dataKey="ingresosAdicionales" name="Adicionales S/IVA (UYU)" stackId="ing" fill="#19C3FF" />
                    <Bar dataKey="desarrolloUYU" name="Desarrollo (UYU)" stackId="ing" fill="#20E0B2" />
                    <Bar dataKey="gastos" name="Gastos S/IVA (UYU)" fill="#f87171" />
                    <Line type="monotone" dataKey="resultado" name="Resultado (UYU)" stroke="#0B6B3A" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 5: BarChart horizontal distribución socios */}
              <ChartCard title="Distribución acumulada por socio (UYU)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.distribucionSocios} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <YAxis type="category" dataKey="socio" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="monto" name="Monto (UYU)" fill="#1769E0" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>

          {/* Desarrollo */}
          <section className="space-y-4">
            <SectionTitle title="Desarrollo" color="#F0B840" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Chart 6: PieChart issues por estado */}
              <ChartCard title="Issues por estado">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.issuesPorEstado} dataKey="count" nameKey="estado" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: { name?: string; percent?: number }) => `${(name ?? '').replace(/_/g, ' ')} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {data.issuesPorEstado.map((entry) => (
                        <Cell key={entry.estado} fill={ESTADO_COLORS[entry.estado] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 7: BarChart horas */}
              <ChartCard title="Horas de desarrollo por mes">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={horasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="horas" name="Horas" fill="#1769E0" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 8: LineChart facturación acumulada */}
              <ChartCard title="Facturación desarrollo acumulada (USD)">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={acumuladoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="totalUSD" name="S/IVA USD mes" stroke="#F0B840" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="acumulado" name="Acumulado S/IVA USD" stroke="#1769E0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
