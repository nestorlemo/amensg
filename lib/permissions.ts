export type PermissionRole = 'ADMIN' | 'OPERADOR' | 'ISSUES'

const ADMIN_ONLY_PREFIXES        = ['/parametros', '/socios', '/usuarios', '/auditoria']
const ISSUES_ALLOWED_PREFIXES    = ['/issues']
const ISSUES_ADMIN_ONLY_PREFIXES = ['/issues/facturar', '/issues/valor-hora']

export function isAdminRole(role: string | null | undefined) {
  return role === 'ADMIN'
}

export function isIssuesRole(role: string | null | undefined) {
  return role === 'ISSUES'
}

export function canViewRouteForRole(role: PermissionRole | null | undefined, path: string) {
  if (!role) return false
  if (isAdminRole(role)) return true

  if (isIssuesRole(role)) {
    if (ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p))) return false
    if (ISSUES_ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p))) return false
    return ISSUES_ALLOWED_PREFIXES.some((p) => path.startsWith(p))
  }

  // OPERADOR: block admin-only
  return !ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix))
}
