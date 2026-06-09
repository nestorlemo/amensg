import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { COMP_COLOR, MESES, empresaColor, fmtShort, fmt, type AnioData } from './types'
import { ChartCard, CustomTooltip, SectionTitle } from './primitives'

type Props = {
  activDataWithComp: Record<string, number | string>[]
  activEmpresas: string[]
  facturData: Record<string, number | string>[]
  facturEmpresas: string[]
  pieActivData: { name: string; value: number }[]
  anio: number
  comp: (AnioData & { anio: number }) | null
  compSuffix: string
}

export function GraficoActivaciones({ activDataWithComp, activEmpresas, facturData, facturEmpresas, pieActivData, anio, comp, compSuffix }: Props) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Activaciones" color="#1769E0" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartCard title="Evolución mensual de activaciones">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activDataWithComp}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {activEmpresas.map((emp) => (
                <Area key={emp} type="monotone" dataKey={emp} stroke={empresaColor(emp)} fill={empresaColor(emp)} fillOpacity={0.15} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
              <Area type="monotone" dataKey="Total" name={`Total ${anio}`} stroke="#0B1F3A" fill="#0B1F3A" fillOpacity={0.05} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              {comp && (
                <Line type="monotone" dataKey={`Total${compSuffix}`} name={`Total ${comp.anio}`} stroke={COMP_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

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
  )
}
