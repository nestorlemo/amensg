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

## Expenses and Additional Income UI

- `/gastos` manages expense concepts and monthly expenses.
- `/gastos` filters expenses by year, month, concept, and type.
- `/gastos` shows summary cards for total expenses, fixed expenses, variable expenses, and quantity.
- `/ingresos-adicionales` manages additional income entries.
- `/ingresos-adicionales` filters by year, month, and company.
- Additional income forms allow selecting `UYU` or `USD`, entering `montoOrigen`, and setting `fechaFacturacion`.
- For USD additional income, the UI shows `tipoCambioAplicado` and an action to obtain the exchange rate for `fechaFacturacion`.
- The UI shows calculated UYU values for `montoSinIva`, `iva`, and `montoConIva`.
- Expense and additional income screens allow create, edit, and delete actions only while the period is open.
- These screens do not implement liquidation closure.

## Liquidation and Closing UI

- `/liquidaciones` allows selecting year and month.
- `/liquidaciones` shows liquidation preview values, validation messages, active partners, and partner distribution.
- `/liquidaciones` allows closing only when validations pass.
- `/cierres` lists monthly closures.
- `/cierres/:id` shows frozen snapshot values and must not recalculate the close.
- Reopening closures is not implemented.
