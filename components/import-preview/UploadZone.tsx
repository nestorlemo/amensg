type Props = {
  isParsing: boolean
  isChecking: boolean
  isProcessing: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function UploadZone({ isParsing, isChecking, isProcessing, onChange }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <label className="block text-sm font-medium text-slate-700" htmlFor="csv-file">
        Archivo CSV
      </label>
      <p className="mt-1 text-xs text-slate-500">
        El archivo se procesa en tu navegador — cada mes se envía al servidor por separado.
      </p>
      <input
        accept=".csv,text/csv"
        className="mt-3 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        disabled={isParsing || isChecking || isProcessing}
        id="csv-file"
        name="file"
        onChange={onChange}
        type="file"
      />
      {(isParsing || isChecking) ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          {isParsing ? 'Analizando archivo...' : 'Verificando importaciones existentes...'}
        </p>
      ) : null}
    </section>
  )
}
