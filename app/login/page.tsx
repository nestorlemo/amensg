import { LoginForm } from '@/components/login-form'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const next = Array.isArray(params.next) ? params.next[0] : params.next

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase text-slate-500">AMENSG</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-slate-600">Ingrese con el usuario local configurado para operar el sistema.</p>
        <div className="mt-6">
          <LoginForm next={next ?? '/'} />
        </div>
      </section>
    </main>
  )
}
