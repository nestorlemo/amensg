import { ReportPreviewPage } from '@/components/reportes/report-preview-page'
import { getReportPreview, type ReportSlug } from '@/lib/reportes'

type ReportRoutePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  slug: ReportSlug
}

export async function ReportRoutePage({ searchParams, slug }: ReportRoutePageProps) {
  const preview = await getReportPreview(slug, (await searchParams) ?? {})
  return <ReportPreviewPage preview={preview} />
}
