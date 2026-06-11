'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { GenerarDesdeCierre } from '@/components/transferencias/GenerarDesdeCierre'
import { HistorialTransferencias } from '@/components/transferencias/HistorialTransferencias'
import type { Socio } from '@/components/transferencias/types'

export default function TransferenciasPage() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    fetch('/api/socios').then(r => r.json()).then((d: { rows?: Socio[] }) => setSocios(d.rows ?? []))
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        section="GESTIÓN MENSUAL"
        title="Gestión de Transferencias"
        description="Generá transferencias a socios desde el resultado neto del cierre mensual."
      />

      <GenerarDesdeCierre
        onAfterGenerate={() => setRefreshTrigger(t => t + 1)}
      />

      <HistorialTransferencias
        socios={socios}
        refreshTrigger={refreshTrigger}
      />
    </div>
  )
}
