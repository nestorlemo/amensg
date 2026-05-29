# UI_SPEC

The current UI is a placeholder shell only.

## Layout

- Base app layout with persistent sidebar navigation.
- Main content area for module pages.
- Tailwind CSS for styling.
- shadcn/ui-ready project configuration through `components.json`, `tailwind.config.ts`, and path aliases.

## Messages and Validation

- User-facing forms and actions display clear business messages, not raw API payloads.
- Error, warning, success, and info messages use consistent lightweight alert styling.
- API validation messages are displayed from the response `message` field when available.
- Network failures use `No se pudo conectar con el servidor.`
- Unexpected failures use `Ocurrió un error inesperado.`
- Screens must not show raw JSON, stack traces, Prisma errors, internal file paths, or JavaScript exception text to business users.

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
- `/importaciones` shows `ANULADA` status clearly.
- `/importaciones` and `/importaciones/:id` show an annul action only for confirmed importations.
- Annulment requires a mandatory reason and refreshes the view after success.
- Annulled importation detail shows annulment timestamp and reason.

## Collection UI

- `/facturacion` shows billing collection status, collection date, and a simple action to change status.
- `/facturacion` disables collection status changes for rows whose period is closed.
- `/facturacion` excludes annulled billing from the default operational view, while direct filtered views can show `ANULADO` rows clearly.
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
- `/gastos` and `/ingresos-adicionales` show a closed-period warning and disable mutation actions when the selected `anio + mes` is closed.
- These screens do not implement liquidation closure.

## Parameters and Partners UI

- `/parametros` lists system parameters and allows editing `valor`, `tipo`, `descripcion`, and `activo`.
- `/parametros` highlights critical parameters: `precio_unitario_activacion`, `porcentaje_iva`, and `tipo_cambio_usd`.
- `/parametros` shows validation errors from the API and explains that updates apply only to future calculations.
- `/socios` lists active and inactive socios.
- `/socios` allows creating, editing, and deactivating socios.
- `/socios` displays and edits `porcentajeParticipacion` as a human percentage while the database stores the decimal value.
- `/socios` shows the total active percentage and warns when active socios do not sum 100%.

## Liquidation and Closing UI

- `/liquidaciones` allows selecting year and month.
- `/liquidaciones` shows liquidation preview values, validation messages, active partners, and partner distribution.
- `/liquidaciones` allows closing only when validations pass.
- `/cierres` lists monthly closures.
- `/cierres/:id` shows frozen snapshot values and must not recalculate the close.
- `/cierres` and `/cierres/:id` show a `Reabrir` action only for closures with `estado = CERRADO`.
- Reopening requires a mandatory reason, refreshes the view after success, and leaves the historical snapshot visible.
- Reopened closures show reopening metadata and do not show the reopen action again.
- `/liquidaciones` treats `REABIERTO` periods as open and may show an informational message that the period can be closed again.

## Audit UI

- `/auditoria` lists relevant system actions newest first.
- `/auditoria` supports filters by date range, entity, action, user, free text, and result limit.
- Audit rows show date/time, user, action, entity, summary, and expandable readable details.
- Audit details are shown as business-readable key/value rows, not raw JSON blocks.
- Audit records are read-only from the UI.

## Users and Permissions UI

- `/login` provides local MVP login.
- The sidebar shows current user name, role, and `Salir`.
- The sidebar hides admin-only menu items for `OPERADOR`: Parametros, Socios, Usuarios, and Auditoria.
- `/usuarios` is an admin-only screen to list users, create users, edit name/role/active state, reset password, and deactivate users.
- Unauthorized users see a clear access denied message for admin-only pages.
- Admin-only actions such as import annulment, liquidation closing, closure reopening, parameter edits, socio edits, and user management are hidden or disabled for non-admin users.
