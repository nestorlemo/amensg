# UI_SPEC

The current UI is a placeholder shell only.

## Layout

- Base app layout with persistent sidebar navigation.
- Main content area for module pages.
- Tailwind CSS for styling.
- shadcn/ui-ready project configuration through `components.json`, `tailwind.config.ts`, and path aliases.

## Placeholder Pages

- Dashboard
- Importaciones
- Activaciones
- Facturacion
- Cobros
- Empresas
- Gastos
- Ingresos adicionales
- Liquidaciones
- Cierres
- Reportes
- Parametros
- Socios
- Usuarios
- Auditoria

## Import Preview UI

- `/importaciones/nueva` contains the CSV upload preview UI.
- The user uploads only the CSV file.
- The UI must not ask the user to select company, month, or year.
- The UI displays file name, size, hash, detected period, row counts, company count, lot count, state count, activation date counts, validation results, company summary, state summary, lot summary, and economic preview.
- Blocking errors and non-blocking warnings must be displayed separately.
- After successful preview without blocking errors, the UI shows `Confirmar importación`.
- Before confirming, the UI shows a clear confirmation step.
- If companies are missing in `Empresa`, the UI shows the missing company names and blocks confirmation.
- If confirmation succeeds, the UI shows `importacionId` and generated facturaciones.
- The UI provides a link back to importaciones after confirmation.

## Collection UI

- `/facturacion` shows billing collection status, collection date, and a simple action to change status.
- `/cobros` lists billing rows for collection follow-up.
- `/cobros` supports filters by year, month, company, and status.
- `/cobros` shows summary cards for pending totals, companies with debt, and pending periods.
- Collection screens must not implement deletion, expenses, liquidations, or billing amount recalculation.
