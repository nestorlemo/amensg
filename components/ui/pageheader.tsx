import type { ReactNode } from 'react'

export function PageHeader({
  section,
  title,
  subtitle,
  action,
}: {
  section: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header
      className="relative overflow-hidden rounded-2xl px-8 py-7"
      style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #1769E0 100%)' }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,195,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '-40px', left: '25%',
          width: '140px', height: '140px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(32,224,178,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: '#20E0B2', boxShadow: '0 0 6px #20E0B2' }}
            />
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {section}
            </p>
          </div>
          <h1
            className="text-3xl font-bold text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}
