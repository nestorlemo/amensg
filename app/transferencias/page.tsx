'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { CobrosDisponibles } from '@/components/transferencias/CobrosDisponibles'
import { HistorialTransferencias } from '@/components/transferencias/HistorialTransferencias'
import type { Empresa, Socio } from '@/components/transferencias/types'

export default function TransferenciasPage() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    fetch('/api/socios').then(r => r.json()).then((d: { rows?: Socio[] }) => setSocios(d.rows ?? []))
    fetch('/api/empresas').then(r => r.json()).then((d: Empresa[] | { empresas?: Empresa[] }) => {
      if (Array.isArray(d)) setEmpresas(d)
      else setEmpresas(d.empresas ?? [])
    })
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        section="GESTIÓN MENSUAL"
        title="Gestión de Transferencias"
        description="Generá y gestioná transferencias a socios desde cobros realizados."
      />

      <CobrosDisponibles
        empresas={empresas}
        onAfterGenerate={() => setRefreshTrigger(t => t + 1)}
      />

      <HistorialTransferencias
        socios={socios}
        refreshTrigger={refreshTrigger}
      />
    </div>
  )
}
