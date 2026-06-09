export type Empresa = {
  id: string
  nombre: string
  razonSocial: string | null
  rut: string | null
  direccion: string | null
  contacto: string | null
  mail: string | null
  telefono: string | null
  activa: boolean
  creadaEn: string
}

export type EmpresaFormData = {
  nombre: string
  razonSocial: string
  rut: string
  direccion: string
  contacto: string
  mail: string
  telefono: string
}

export const EMPTY_FORM: EmpresaFormData = {
  nombre: '', razonSocial: '', rut: '', direccion: '', contacto: '', mail: '', telefono: '',
}

export const PRIMARY = '#1769E0'
export const BORDER  = '#e6eefc'
export const TEXT    = '#0B1F3A'
export const MUTED   = '#8ba3c7'
export const SURFACE = '#F5F7FA'

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  let res: Response
  try {
    res = await fetch(url, options)
  } catch {
    return { data: null, error: 'Error de red: no se pudo conectar con el servidor.' }
  }
  let json: Record<string, unknown>
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    return { data: null, error: `Error del servidor (${res.status}). Intente nuevamente.` }
  }
  if (!res.ok) return { data: null, error: (json.message as string) ?? 'Error inesperado.' }
  return { data: json as T, error: null }
}
