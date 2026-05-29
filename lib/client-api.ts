export type ClientApiResult<T = unknown> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; body?: unknown }

type ApiErrorPayload = {
  error?: unknown
  message?: unknown
  details?: unknown
}

export async function requestJson<T = unknown>(
  url: string,
  init?: RequestInit,
  fallback = 'Ocurrió un error inesperado.',
): Promise<ClientApiResult<T>> {
  try {
    const response = await fetch(url, init)
    const payload = await parseResponsePayload(response)

    if (!response.ok) {
      return {
        ok: false,
        error: apiErrorMessage(payload, response.status, fallback),
        status: response.status,
        body: payload,
      }
    }

    return { ok: true, data: payload as T, status: response.status }
  } catch {
    return {
      ok: false,
      error: 'No se pudo conectar con el servidor.',
      status: 0,
    }
  }
}

export async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}))
  }

  const text = await response.text().catch(() => '')
  return text ? { message: text } : {}
}

export function apiErrorMessage(payload: unknown, status: number, fallback = 'Ocurrió un error inesperado.') {
  const body = isObject(payload) ? (payload as ApiErrorPayload) : {}
  const code = typeof body.error === 'string' ? body.error : ''
  const message = typeof body.message === 'string' && body.message.trim() ? body.message : ''

  if (message) return message
  if (status === 401 || code === 'UNAUTHORIZED') return 'Debe iniciar sesión para continuar.'
  if (status === 403 || code === 'FORBIDDEN') return 'No tiene permisos para realizar esta acción.'
  if (code === 'PERIODO_CERRADO') return 'El período ya está cerrado. No se puede realizar esta acción.'
  if (code === 'VALIDATION_ERROR') return 'Revise los datos ingresados.'
  if (code === 'INVALID_CREDENTIALS') return 'Email o contraseña incorrectos.'
  if (code === 'INTERNAL_ERROR') return 'Ocurrió un error interno. Intente nuevamente.'
  return fallback
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
