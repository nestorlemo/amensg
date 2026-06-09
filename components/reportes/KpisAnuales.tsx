import { fmt, type Kpis } from './types'
import { KpiCard, SectionTitle } from './primitives'

type Props = {
  kpis: Kpis
  empresaNombre?: string
}

export function KpisAnuales({ kpis, empresaNombre }: Props) {
  return (
    <section className="space-y-4">
      <SectionTitle title={empresaNombre ? `KPIs del año — ${empresaNombre}` : 'KPIs del año'} color="#1769E0" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total activaciones" value={fmt(kpis.activaciones)} />
        <KpiCard label="Facturado activaciones S/IVA (UYU)" value={fmt(kpis.facturadoActivaciones)} />
        <KpiCard label="Facturado desarrollo S/IVA (USD)" value={fmt(kpis.facturadoDesarrollo)} />
        <KpiCard label="Resultado distribuible (UYU)" value={fmt(kpis.resultado)} />
      </div>
    </section>
  )
}
