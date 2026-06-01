// This route is kept for backward compatibility but client-side parsing
// in import-preview-form.tsx now handles period detection without a server round-trip.
// It can be used to validate a single-period partial CSV if needed.

import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { parseSemicolonCsv } from '@/lib/import-preview/csv'
import { parseDatePeriod } from '@/lib/import-preview/preview'

export const runtime = 'nodejs'
export const maxDuration = 60
export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } },
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const formData = await request.formData()
  const uploadedFile = formData.get('file')

  if (!(uploadedFile instanceof File)) {
    return apiError('INVALID_CSV', 'Debe enviar un archivo CSV en el campo "file".', 400)
  }

  const bytes = Buffer.from(await uploadedFile.arrayBuffer())
  const csvText = bytes.toString('utf8')
  const parsed = parseSemicolonCsv(csvText)

  if (parsed.rows.length === 0) {
    return apiError('EMPTY_FILE', 'El archivo CSV está vacío.', 422)
  }

  // Count periods
  const periodoSet = new Set<string>()
  for (const row of parsed.rows) {
    const period = parseDatePeriod(row['Fecha de importación'] ?? '')
    if (period) periodoSet.add(`${period.anio}-${String(period.mes).padStart(2, '0')}`)
  }

  return NextResponse.json({
    filas: parsed.rows.length,
    periodos: [...periodoSet].sort(),
  })
}
