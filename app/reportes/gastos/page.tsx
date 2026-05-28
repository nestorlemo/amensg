import { ReportRoutePage } from '@/components/reportes/report-route-page'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function GastosReportPage({ searchParams }: PageProps) {
  return <ReportRoutePage searchParams={searchParams} slug="gastos" />
}
