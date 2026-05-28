import { ReportRoutePage } from '@/components/reportes/report-route-page'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ActivacionesReportPage({ searchParams }: PageProps) {
  return <ReportRoutePage searchParams={searchParams} slug="activaciones" />
}
