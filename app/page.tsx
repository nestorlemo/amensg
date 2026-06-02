import { getCurrentUser } from '@/lib/auth'
import { DashboardMain } from '@/components/dashboard-main'
import { DashboardIssues } from '@/components/dashboard-issues'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (user?.rol === 'ISSUES') return <DashboardIssues />
  return <DashboardMain />
}
