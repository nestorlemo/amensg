export type NavItem = { href: string; label: string; icon: string; adminOnly?: boolean; issuesOnly?: boolean }

export const navigationItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/importaciones', label: 'Importaciones', icon: 'Upload' },
  { href: '/activaciones', label: 'Activaciones', icon: 'Zap' },
  { href: '/facturacion', label: 'Facturacion', icon: 'FileText' },
  { href: '/cobros', label: 'Cobros', icon: 'CreditCard' },
  { href: '/empresas', label: 'Empresas', icon: 'Building2' },
  { href: '/gastos', label: 'Gastos', icon: 'Receipt' },
  { href: '/ingresos-adicionales', label: 'Ingresos adicionales', icon: 'PlusCircle' },
  { href: '/liquidaciones', label: 'Liquidaciones', icon: 'Calculator' },
  { href: '/cierres', label: 'Cierres', icon: 'Lock' },
  { href: '/reportes', label: 'Reportes', icon: 'BarChart2' },
  { href: '/issues', label: 'Issues', icon: 'Bug', issuesOnly: true },
  { href: '/issues/facturar', label: 'Facturar desarrollo', icon: 'FileCode2' },
  { href: '/parametros', label: 'Parametros', icon: 'Settings', adminOnly: true },
  { href: '/socios', label: 'Socios', icon: 'Users', adminOnly: true },
  { href: '/usuarios', label: 'Usuarios', icon: 'UserCog', adminOnly: true },
  { href: '/auditoria', label: 'Auditoria', icon: 'Shield', adminOnly: true },
]
