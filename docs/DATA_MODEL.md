# DATA_MODEL

## Reglas globales
- Base de datos PostgreSQL.
- IDs UUID.
- Valores monetarios con Decimal.
- No usar Float para dinero.

## Entidades mínimas
- Usuario
- Empresa
- Socio
- Parametro
- EstadoCobro
- ImportacionActivacion
- ActivacionImportada
- FacturacionMensual
- GastoConcepto
- GastoMensual
- IngresoAdicional
- CierreMensual
- CierreSocio
- Auditoria

## Reglas de unicidad
- MID: único por `empresa_id + anio + mes`.
- Chip: único por `empresa_id + anio + mes`.
