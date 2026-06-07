'use client'

import { useEffect, useRef, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { ActivacionesDisponibles } from '@/components/facturacion-activaciones/ActivacionesDisponibles'
import { HistorialActivaciones, HistorialActivacionesHandle } from '@/components/facturacion-activaciones/HistorialActivaciones'
import { EmpresaOption } from '@/components/facturacion-activaciones/types'

export default function FacturacionActivacionesPage() {
  const [empresasOpts, setEmpresasOpts] = useState<EmpresaOption[]>([])
  const historialRef = useRef<HistorialActivacionesHandle>(null)

  useEffect(() => {
    fetch('/api/empresas?activo=true')
      .then((r) => r.json())
      .then((d: { empresas?: EmpresaOption[] }) => setEmpresasOpts(d.empresas ?? []))
      .catch(() => null)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        section="FACTURACIÓN"
        title="Facturación Activaciones"
        description="Registrá las facturaciones de activaciones y gestioná su estado de cobro."
      />

      <ActivacionesDisponibles
        empresasOpts={empresasOpts}
        onFacturado={() => historialRef.current?.refresh()}
      />

      <HistorialActivaciones
        ref={historialRef}
        empresasOpts={empresasOpts}
      />
    </div>
  )
}
