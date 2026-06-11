import { CierresTable } from '@/components/cierres/CierresTable'
import { PageHeader } from '@/components/page-header'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getCierres } from '@/lib/liquidaciones'

export const dynamic = 'force-dynamic'

export default async function CierresPage() {
  const user = await getCurrentUser()
  const { rows } = await getCierres()

  return (
    <div className="space-y-6">
      <PageHeader
        section="Cierres"
        title="Cierres mensuales"
        description="Consulta de cierres históricos y reapertura de períodos cerrados."
      />
      <CierresTable rows={rows} isAdmin={isAdmin(user)} />
    </div>
  )
}
