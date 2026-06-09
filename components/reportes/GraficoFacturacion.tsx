import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { COMP_COLOR, fmtShort, type AnioData } from './types'
import { ChartCard, CustomTooltip, SectionTitle } from './primitives'

type Props = {
  resultadoData: Record<string, number | string>[]
  finTotalData: Record<string, number | string>[]
  distribucionSocios: { socio: string; monto: number }[]
  anio: number
  comp: (AnioData & { anio: number }) | null
  compSuffix: string
  empresaNombre?: string
}

export function GraficoFacturacion({ resultadoData, finTotalData, distribucionSocios, anio, comp, compSuffix, empresaNombre }: Props) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Financiero" color="#20E0B2" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartCard title={empresaNombre ? `Resultado mensual — ${empresaNombre} (gastos totales compartidos)` : 'Resultado mensual (UYU)'}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={resultadoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos S/IVA (UYU)" stackId="stack" fill="#93c5fd" />
              <Bar dataKey="gastos" name="Gastos S/IVA (UYU)" stackId="stack" fill="#fca5a5" />
              <Line type="monotone" dataKey="resultado" name={`Resultado ${anio}`} stroke="#20E0B2" strokeWidth={2} dot />
              {comp && (
                <Line type="monotone" dataKey={`resultado${compSuffix}`} name={`Resultado ${comp.anio}`} stroke={COMP_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

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
              <Line type="monotone" dataKey="resultado" name={`Resultado ${anio}`} stroke="#0B6B3A" strokeWidth={3} dot={{ r: 4 }} />
              {comp && (
                <Line type="monotone" dataKey={`resultado${compSuffix}`} name={`Resultado ${comp.anio}`} stroke={COMP_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución acumulada por socio (UYU)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribucionSocios} layout="vertical">
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
  )
}
