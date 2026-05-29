export function AccessDenied() {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-6">
      <p className="text-sm font-semibold uppercase text-red-700">Acceso denegado</p>
      <h1 className="mt-2 text-2xl font-semibold text-red-950">No tiene permisos para ver esta pantalla.</h1>
      <p className="mt-2 text-sm text-red-800">Solicite acceso a un usuario administrador si necesita operar este modulo.</p>
    </div>
  )
}
