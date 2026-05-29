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
