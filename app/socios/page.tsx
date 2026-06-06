import { AccessDenied } from '@/components/access-denied'
import { PageHeader } from '@/components/page-header'
import { SociosManager } from '@/components/socios-manager'
import { requireAdminPage } from '@/lib/auth'
import { getSocios } from '@/lib/parametros-socios'

export const dynamic = 'force-dynamic'

export default async function SociosPage() {
  const user = await requireAdminPage()
  if (!user) return <AccessDenied />

  const { rows, validation } = await getSocios()

  return (
    <div className="space-y-6">
      <PageHeader
        section="Administración"
        title="Gestión de socios"
        description="Solo los socios activos participan en liquidaciones. Los porcentajes activos deben sumar 100%."
      />
      <SociosManager socios={rows} validation={validation} />
    </div>
  )
}
