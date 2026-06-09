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

import { COMP_COLOR, ESTADO_COLORS, fmt, fmtShort, type AnioData } from './types'
import { ChartCard, CustomTooltip, SectionTitle } from './primitives'

type Props = {
  horasData: { mes: string; horas: number }[]
  acumuladoData: Record<string, number | string>[]
  issuesPorEstado: { estado: string; count: number }[]
  anio: number
  comp: (AnioData & { anio: number }) | null
  compSuffix: string
}

export function GraficoDesarrollo({ horasData, acumuladoData, issuesPorEstado, anio, comp, compSuffix }: Props) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Desarrollo" color="#F0B840" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartCard title="Issues por estado">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={issuesPorEstado} dataKey="count" nameKey="estado" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: { name?: string; percent?: number }) => `${(name ?? '').replace(/_/g, ' ')} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {issuesPorEstado.map((entry) => (
                  <Cell key={entry.estado} fill={ESTADO_COLORS[entry.estado] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [fmt(v), name.replace(/_/g, ' ')]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

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

        <ChartCard title="Facturación desarrollo acumulada (USD)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={acumuladoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="totalUSD" name={`S/IVA USD ${anio}`} stroke="#F0B840" strokeWidth={2} dot />
              <Line type="monotone" dataKey="acumulado" name={`Acumulado ${anio}`} stroke="#1769E0" strokeWidth={2} dot={false} />
              {comp && <>
                <Line type="monotone" dataKey={`totalUSD${compSuffix}`} name={`S/IVA USD ${comp.anio}`} stroke="#F0B840" strokeWidth={1.5} strokeDasharray="5 4" dot={false} strokeOpacity={0.6} />
                <Line type="monotone" dataKey={`acumulado${compSuffix}`} name={`Acumulado ${comp.anio}`} stroke={COMP_COLOR} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </>}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  )
}
