import './globals.css'
import Link from 'next/link'

const items = [
  'dashboard','importaciones','activaciones','facturacion','cobros','empresas','gastos','ingresos-adicionales','liquidaciones','cierres','reportes','parametros','usuarios','auditoria'
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <aside style={{ width: 260, padding: 16, borderRight: '1px solid #ddd' }}>
            <h2>AMENSG</h2>
            <nav>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {items.map((item) => (
                  <li key={item} style={{ margin: '8px 0' }}>
                    <Link href={item === 'dashboard' ? '/' : `/${item}`}>{item}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <main style={{ flex: 1, padding: 24 }}>{children}</main>
        </div>
      </body>
    </html>
  )
}
