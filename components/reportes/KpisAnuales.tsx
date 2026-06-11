import { fmt, type Kpis } from './types'
import { SectionTitle } from './primitives'
import { StatCard } from '@/components/ui/index'

type Props = {
  kpis: Kpis
  empresaNombre?: string
}

export function KpisAnuales({ kpis, empresaNombre }: Props) {
  return (
    <section className="space-y-4">
      <SectionTitle title={empresaNombre ? `KPIs del año — ${empresaNombre}` : 'KPIs del año'} color="#1769E0" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total activaciones" value={fmt(kpis.activaciones)} />
        <StatCard label="Facturado activaciones S/IVA (UYU)" value={fmt(kpis.facturadoActivaciones)} />
        <StatCard label="Facturado desarrollo S/IVA (USD)" value={fmt(kpis.facturadoDesarrollo)} />
        <StatCard label="Resultado distribuible (UYU)" value={fmt(kpis.resultado)} />
      </div>
    </section>
  )
}
