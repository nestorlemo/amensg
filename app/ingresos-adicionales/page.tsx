'use client'

import { IngresosAdicionalesManager } from '@/components/ingresos-adicionales-manager'
import { PageHeader } from '@/components/page-header'

export default function IngresosAdicionalesPage() {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        section="Facturación Adicional"
        title="Facturación Adicional"
        description="Ingresos no provenientes de activaciones, con IVA calculado."
      />
      <IngresosAdicionalesManager />
    </div>
  )
}
