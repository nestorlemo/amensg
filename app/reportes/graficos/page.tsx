'use client'

import { useEffect, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#94a3b8',
  EN_DESARROLLO: '#1769E0',
  EN_TEST: '#F0B840',
  EN_PRODUCCION: '#20E0B2',
  CANCELADO: '#f87171',
}

const DEFAULT_COLORS = ['#1769E0', '#20E0B2', '#F0B840', '#a78bfa', '#f87171', '#fb923c']

type GraficosData = {
  activacionesPorMesEmpresa: Array<{ mes: number; empresa: string; cantidad: number }>
  facturacionPorMesEmpresa: Array<{ mes: number; empresa: string; totalSinIva: number }>
  resultadoMensual: Array<{ mes: number; ingresos: number; gastos: number; resultado: number }>
  distribucionSocios: Array<{ socio: string; monto: number }>
  tipoCambioMensual: Array<{ mes: number; tc: number }>
  issuesPorEstado: Array<{ estado: string; count: number }>
  horasDesarrolloPorMes: Array<{ mes: number; horas: number }>
  facturacionDesarrolloPorMes: Array<{ mes: number; totalUSD: number; acumulado: number }>
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; color: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {new Intl.NumberFormat('es-UY').format(p.value)}
        </p>
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

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {children}
    </section>
  )
}

function SkeletonGrid() {
  return (
    <div className="space-y-10">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[1, 2, 3].map((c) => (
              <div key={c} className="h-[300px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function pivotByEmpresa<T extends { mes: number; empresa: string }>(
  rows: T[],
  valueKey: keyof T,
): Array<Record<string, number | string>> {
  const mesMap = new Map<number, Record<string, number | string>>()
  for (const row of rows) {
    if (!mesMap.has(row.mes)) {
      mesMap.set(row.mes, { mes: MESES[row.mes - 1] ?? row.mes })
    }
    const entry = mesMap.get(row.mes)!
    entry[row.empresa] = (entry[row.empresa] as number ?? 0) + (row[valueKey] as number)
  }
  return Array.from(mesMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v)
}

function getEmpresas(rows: Array<{ empresa: string }>) {
  return Array.from(new Set(rows.map((r) => r.empresa)))
}

export default function GraficosPage() {
  const [data, setData] = useState<GraficosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reportes/graficos?anio=${anio}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [anio])

  const totalActivaciones = data?.activacionesPorMesEmpresa.reduce((s, r) => s + r.cantidad, 0) ?? 0
  const totalFacturadoUYU = data?.facturacionPorMesEmpresa.reduce((s, r) => s + r.totalSinIva, 0) ?? 0
  const totalFacturadoUSD = data?.facturacionDesarrolloPorMes.reduce((s, r) => s + r.totalUSD, 0) ?? 0
  const totalResultado = data?.resultadoMensual.reduce((s, r) => s + r.resultado, 0) ?? 0

  const empresas = data ? getEmpresas(data.activacionesPorMesEmpresa) : []
  const activacionesPivot = data ? pivotByEmpresa(data.activacionesPorMesEmpresa, 'cantidad') : []
  const facturacionPivot = data ? pivotByEmpresa(data.facturacionPorMesEmpresa, 'totalSinIva') : []

  const activacionesTotales = empresas.map((emp) => ({
    empresa: emp,
    total: data?.activacionesPorMesEmpresa.filter((r) => r.empresa === emp).reduce((s, r) => s + r.cantidad, 0) ?? 0,
  }))

  const resultadoConLabel = data?.resultadoMensual.map((r) => ({
    ...r,
    mesLabel: MESES[r.mes - 1] ?? r.mes,
  })) ?? []

  const distribucionSociosSorted = [...(data?.distribucionSocios ?? [])].sort((a, b) => b.monto - a.monto)

  const tipoCambioConLabel = [...(data?.tipoCambioMensual ?? [])]
    .sort((a, b) => a.mes - b.mes)
    .map((r) => ({ ...r, mesLabel: MESES[r.mes - 1] ?? r.mes }))

  const horasConLabel = data?.horasDesarrolloPorMes.map((r) => ({
    ...r,
    mesLabel: MESES[r.mes - 1] ?? r.mes,
  })) ?? []

  const facturasDesConLabel = data?.facturacionDesarrolloPorMes.map((r) => ({
    ...r,
    mesLabel: MESES[r.mes - 1] ?? r.mes,
  })) ?? []

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <PageHeader section="REPORTES" title="Reportes y Gráficos" />

      {/* Year filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">
          Año:{' '}
          <select
            className="ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1769E0]"
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value, 10))}
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="space-y-10">
          {/* KPIs */}
          <Section title="KPIs del año" color="#1769E0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total activaciones', value: new Intl.NumberFormat('es-UY').format(totalActivaciones), suffix: '' },
                { label: 'Facturado activaciones', value: new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(totalFacturadoUYU), suffix: 'UYU' },
                { label: 'Facturado desarrollo', value: new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(totalFacturadoUSD), suffix: 'USD' },
                { label: 'Resultado distribuible', value: new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(totalResultado), suffix: 'UYU' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-[#e6eefc] p-5 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #EEF4FF 0%, #ffffff 100%)' }}
                >
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-bold" style={{ color: '#1769E0' }}>
                    {kpi.value}
                  </p>
                  {kpi.suffix && <p className="mt-0.5 text-xs text-slate-400">{kpi.suffix}</p>}
                </div>
              ))}
            </div>
          </Section>

          {/* Activaciones */}
          <Section title="Activaciones" color="#1769E0">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Chart 1: Line activaciones por empresa */}
              <ChartCard title="Evolución activaciones por empresa">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activacionesPivot}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {empresas.map((emp, i) => (
                      <Line
                        key={emp}
                        type="monotone"
                        dataKey={emp}
                        stroke={EMPRESA_COLORS[emp] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 2: Bar facturación por empresa */}
              <ChartCard title="Facturación por empresa (UYU sin IVA)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={facturacionPivot}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => new Intl.NumberFormat('es-UY', { notation: 'compact' }).format(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {empresas.map((emp, i) => (
                      <Bar
                        key={emp}
                        dataKey={emp}
                        fill={EMPRESA_COLORS[emp] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 3: Pie mix activaciones */}
              <ChartCard title="Mix de activaciones por empresa">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activacionesTotales}
                      dataKey="total"
                      nameKey="empresa"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {activacionesTotales.map((entry, i) => (
                        <Cell
                          key={entry.empresa}
                          fill={EMPRESA_COLORS[entry.empresa] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => new Intl.NumberFormat('es-UY').format(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </Section>

          {/* Financiero */}
          <Section title="Financiero" color="#20E0B2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Chart 4: Bar resultado mensual */}
              <ChartCard title="Resultado mensual (UYU)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={resultadoConLabel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => new Intl.NumberFormat('es-UY', { notation: 'compact' }).format(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#1769E0" />
                    <Bar dataKey="gastos" name="Gastos" fill="#f87171" />
                    <Bar dataKey="resultado" name="Resultado" fill="#20E0B2" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 5: Bar horizontal distribución socios */}
              <ChartCard title="Distribución por socio (UYU acumulado)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribucionSociosSorted} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => new Intl.NumberFormat('es-UY', { notation: 'compact' }).format(v)} />
                    <YAxis type="category" dataKey="socio" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="monto" name="Monto" fill="#1769E0">
                      {distribucionSociosSorted.map((_, i) => (
                        <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 6: Line tipo de cambio */}
              <ChartCard title="Tipo de cambio USD mensual">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tipoCambioConLabel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="tc" name="TC USD" stroke="#20E0B2" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </Section>

          {/* Desarrollo */}
          <Section title="Desarrollo" color="#F0B840">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Chart 7: Pie issues por estado */}
              <ChartCard title="Issues por estado">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.issuesPorEstado ?? []}
                      dataKey="count"
                      nameKey="estado"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${String(name ?? '').replace(/_/g, ' ')} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {(data?.issuesPorEstado ?? []).map((entry) => (
                        <Cell
                          key={entry.estado}
                          fill={ESTADO_COLORS[entry.estado] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => new Intl.NumberFormat('es-UY').format(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 8: Bar horas desarrollo */}
              <ChartCard title="Horas de desarrollo por mes">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={horasConLabel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="horas" name="Horas" fill="#1769E0" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Chart 9: Line facturación desarrollo acumulada */}
              <ChartCard title="Facturación desarrollo (USD)">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={facturasDesConLabel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => new Intl.NumberFormat('es-UY', { notation: 'compact' }).format(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="totalUSD" name="USD mes" stroke="#F0B840" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#1769E0" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
