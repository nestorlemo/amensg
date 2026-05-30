import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { parseSemicolonCsv } from '@/lib/import-preview/csv'
import { parseDatePeriod } from '@/lib/import-preview/preview'

export const runtime = 'nodejs'

const EXPECTED_HEADERS = [
  'MID',
  'Chip',
  'Empresa',
  'Tipo de activación',
  'Lote',
  'Estado de activación',
  'Fecha de importación',
  'Fecha de activación',
  'Fecha de vencimiento',
  'Sub-lote',
  'Distribuidor',
  'Fecha asignación distribuidor',
]

export type MultiPeriodPreview = {
  file: { name: string; size: number; hash: string }
  periodos: PeriodoResumen[]
  totalFilas: number
  validation: {
    hasBlockingErrors: boolean
    errors: Array<{ code: string; message: string }>
    warnings: Array<{ code: string; message: string }>
  }
}

export type PeriodoResumen = {
  periodo: string
  anio: number
  mes: number
  filas: number
  empresas: string[]
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
  const fileHash = createHash('sha256').update(bytes).digest('hex')

  const errors: Array<{ code: string; message: string }> = []
  const warnings: Array<{ code: string; message: string }> = []

  const parsed = parseSemicolonCsv(csvText)

  if (parsed.rows.length === 0) {
    errors.push({ code: 'EMPTY_FILE', message: 'El archivo CSV está vacío o no contiene filas de datos.' })
    return NextResponse.json({
      file: { name: uploadedFile.name, size: uploadedFile.size, hash: fileHash },
      periodos: [],
      totalFilas: 0,
      validation: { hasBlockingErrors: true, errors, warnings },
    } satisfies MultiPeriodPreview)
  }

  const missingHeaders = EXPECTED_HEADERS.filter((h) => !parsed.headers.includes(h))
  if (missingHeaders.length > 0) {
    errors.push({
      code: 'MISSING_HEADERS',
      message: `Columnas faltantes: ${missingHeaders.join(', ')}`,
    })
    return NextResponse.json({
      file: { name: uploadedFile.name, size: uploadedFile.size, hash: fileHash },
      periodos: [],
      totalFilas: parsed.rows.length,
      validation: { hasBlockingErrors: true, errors, warnings },
    } satisfies MultiPeriodPreview)
  }

  // Group rows by (anio, mes) from "Fecha de importación"
  const periodoMap = new Map<string, { anio: number; mes: number; filas: number; empresas: Set<string> }>()
  let rowsWithoutPeriod = 0

  for (const row of parsed.rows) {
    const fechaImportacion = row['Fecha de importación'] ?? ''
    const period = parseDatePeriod(fechaImportacion)

    if (!period) {
      rowsWithoutPeriod++
      continue
    }

    const key = `${period.anio}-${String(period.mes).padStart(2, '0')}`
    const existing = periodoMap.get(key)

    if (existing) {
      existing.filas++
      if (row.Empresa) existing.empresas.add(row.Empresa)
    } else {
      periodoMap.set(key, {
        anio: period.anio,
        mes: period.mes,
        filas: 1,
        empresas: new Set(row.Empresa ? [row.Empresa] : []),
      })
    }
  }

  if (rowsWithoutPeriod > 0) {
    warnings.push({
      code: 'ROWS_WITHOUT_PERIOD',
      message: `${rowsWithoutPeriod} filas no tienen una Fecha de importación válida y serán ignoradas.`,
    })
  }

  if (periodoMap.size === 0) {
    errors.push({ code: 'NO_VALID_PERIODS', message: 'No se encontraron períodos válidos en el archivo.' })
  }

  const periodos: PeriodoResumen[] = [...periodoMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, data]) => ({
      periodo,
      anio: data.anio,
      mes: data.mes,
      filas: data.filas,
      empresas: [...data.empresas].sort(),
    }))

  return NextResponse.json({
    file: { name: uploadedFile.name, size: uploadedFile.size, hash: fileHash },
    periodos,
    totalFilas: parsed.rows.length - rowsWithoutPeriod,
    validation: { hasBlockingErrors: errors.length > 0, errors, warnings },
  } satisfies MultiPeriodPreview)
}
