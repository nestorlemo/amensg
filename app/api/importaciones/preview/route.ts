import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { buildImportPreview } from '@/lib/import-preview/preview'
import type { ImportPreviewParameters, ValidationIssue } from '@/lib/import-preview/types'
import { isPeriodClosed } from '@/lib/periods'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const DEFAULT_PARAMETERS: ImportPreviewParameters = {
  precioUnitarioActivacion: '0',
  porcentajeIva: '0',
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
  const { parameters, warnings } = await getCurrentParameters()

  const preview = buildImportPreview({
    csvText,
    fileName: uploadedFile.name,
    fileSize: uploadedFile.size,
    fileHash,
    parameters,
    parameterWarnings: warnings,
  })

  if (preview.detectedPeriod && (await isPeriodClosed(preview.detectedPeriod.anio, preview.detectedPeriod.mes))) {
    preview.validation.hasBlockingErrors = true
    preview.validation.errors.push({
      code: 'PERIODO_CERRADO',
      message: 'El período ya está cerrado. No se puede confirmar una nueva importación.',
    })
  }

  return NextResponse.json(preview)
}

async function getCurrentParameters() {
  const warnings: ValidationIssue[] = []

  try {
    const parametros = await prisma.parametro.findMany({
      where: {
        clave: {
          in: ['precio_unitario_activacion', 'porcentaje_iva'],
        },
      },
      select: {
        clave: true,
        valor: true,
      },
    })

    const byKey = new Map(parametros.map((parametro) => [parametro.clave, parametro.valor.toString()]))

    return {
      parameters: {
        precioUnitarioActivacion:
          byKey.get('precio_unitario_activacion') ?? DEFAULT_PARAMETERS.precioUnitarioActivacion,
        porcentajeIva: byKey.get('porcentaje_iva') ?? DEFAULT_PARAMETERS.porcentajeIva,
      },
      warnings,
    }
  } catch {
    warnings.push({
      code: 'PARAMETERS_UNAVAILABLE',
      message: 'No se pudieron leer los parametros actuales. Se usan valores 0 para la vista previa economica.',
    })

    return {
      parameters: DEFAULT_PARAMETERS,
      warnings,
    }
  }
}
