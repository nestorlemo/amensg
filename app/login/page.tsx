import { LoginForm } from '@/components/login-form'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function LogoMark() {
  return (
    <svg viewBox="0 0 100 110" width="48" height="54" aria-hidden="true">
      <path
        d="M 50 5 L 93 30 L 93 80 L 50 105 L 7 80 L 7 30 Z"
        fill="none"
        stroke="#1769E0"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <line x1="27" y1="73" x2="73" y2="37" stroke="#1769E0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="27" cy="73" r="7" fill="#1769E0" />
      <circle cx="50" cy="55" r="9" fill="#19C3FF" />
      <circle cx="73" cy="37" r="7" fill="#1769E0" />
    </svg>
  )
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const next = Array.isArray(params.next) ? params.next[0] : params.next

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#F5F7FA', position: 'relative', overflow: 'hidden' }}
    >
      {/* Background decorations */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,195,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(32,224,178,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <section
        className="relative w-full max-w-md p-8"
        style={{
          background: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 8px 40px rgba(23,105,224,0.10)',
          border: '1px solid #e6eefc',
        }}
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoMark />
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#0B1F3A', letterSpacing: '-0.01em' }}>amensg</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold mb-6" style={{ color: '#0B1F3A' }}>Iniciar sesión</h1>

        <LoginForm next={next ?? '/'} />
      </section>
    </main>
  )
}
