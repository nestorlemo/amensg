import { StatCard } from '@/components/ui/index'
import { fmt, type ResumenData } from './types'

type Props = {
  resumen: ResumenData | null
}

export function KpisCobros({ resumen }: Props) {
  return (
    <section className="grid gap-3 md:grid-cols-5">
      <StatCard
        label="Pendiente (UYU)"
        value={resumen ? fmt(resumen.pendienteUYU.total) : null}
        accent="amber"
      />
      <StatCard
        label="Pendiente (USD)"
        value={resumen ? fmt(resumen.pendienteUSD.total) : null}
        accent="amber"
      />
      <StatCard
        label="Cobrado este mes (UYU)"
        value={resumen ? fmt(resumen.cobradoEsteMesUYU) : null}
        accent="green"
      />
      <StatCard
        label="Facturas pendientes"
        value={resumen ? resumen.facturasPendientes : null}
        accent="amber"
      />
      <StatCard
        label="Empresas con deuda"
        value={resumen ? resumen.empresasConDeuda : null}
        accent="red"
      />
    </section>
  )
}
