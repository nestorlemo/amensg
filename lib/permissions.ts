export type PermissionRole = 'ADMIN' | 'OPERADOR'

const ADMIN_ONLY_PREFIXES = ['/parametros', '/socios', '/usuarios', '/auditoria']

export function isAdminRole(role: string | null | undefined) {
  return role === 'ADMIN'
}

export function canViewRouteForRole(role: PermissionRole | null | undefined, path: string) {
  if (!role) return false
  if (isAdminRole(role)) return true
  return !ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix))
}
