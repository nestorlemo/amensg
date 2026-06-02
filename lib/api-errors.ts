import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'PERIODO_CERRADO'
  | 'DUPLICATE_IMPORT'
  | 'INVALID_CSV'
  | 'INVALID_CREDENTIALS'
  | 'INTERNAL_ERROR'
  | string

export type ApiErrorBody = {
  error: ApiErrorCode
  message: string
  details?: unknown
}

export function apiError(error: ApiErrorCode, message: string, status: number, details?: unknown) {
  const body: ApiErrorBody = details === undefined ? { error, message } : { error, message, details }
  return NextResponse.json(body, { status })
}

export function validationError(message: string, details?: unknown) {
  return apiError('VALIDATION_ERROR', message, 422, details)
}

export function notFoundError(message = 'No se encontró el recurso solicitado.') {
  return apiError('NOT_FOUND', message, 404)
}

export function internalError(message = 'Ocurrió un error interno. Intente nuevamente.') {
  return apiError('INTERNAL_ERROR', message, 500)
}

/** Handles Prisma P2002 unique constraint errors, returning a 409 response. Re-throws anything else. */
export function handlePrismaError(error: unknown, fieldLabels: Record<string, string> = {}) {
  if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
    const fields = (error.meta?.target as string[]) ?? []
    const label = fields.map((f) => fieldLabels[f] ?? f).join(', ')
    return apiError('DUPLICATE', `Ya existe un registro con el mismo ${label}.`, 409)
  }
  throw error
}

/** Same as handlePrismaError but returns lib-style { error, status } instead of NextResponse. Re-throws anything else. */
export function handlePrismaLibError(error: unknown, fieldLabels: Record<string, string> = {}): { error: ApiErrorBody; status: number } {
  if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
    const fields = (error.meta?.target as string[]) ?? []
    const label = fields.map((f) => fieldLabels[f] ?? f).join(', ')
    return { error: { error: 'DUPLICATE', message: `Ya existe un registro con el mismo ${label}.` }, status: 409 }
  }
  throw error
}
