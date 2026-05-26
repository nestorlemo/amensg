type ModulePlaceholderProps = {
  title: string
  description: string
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className="max-w-4xl">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Modulo</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
    </section>
  )
}
