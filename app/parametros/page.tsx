import { AccessDenied } from '@/components/access-denied'
import { PageHeader } from '@/components/page-header'
import { ParametrosManager } from '@/components/parametros-manager'
import { requireAdminPage } from '@/lib/auth'
import { getParametros } from '@/lib/parametros-socios'

export const dynamic = 'force-dynamic'

export default async function ParametrosPage() {
  const user = await requireAdminPage()
  if (!user) return <AccessDenied />

  const { rows } = await getParametros()

  return (
    <div className="space-y-6">
      <PageHeader
        section="Administración"
        title="Parámetros del sistema"
        description="Los cambios aplican a cálculos futuros y no modifican facturaciones históricas ni cierres ya guardados."
      />
      <ParametrosManager parametros={rows} />
    </div>
  )
}
