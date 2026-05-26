# OPERATIONS_SPEC

## Local Storage

- `storage/importaciones/` is reserved for imported files when `STORAGE_DRIVER=local`.
- The directory is tracked with `.gitkeep`; uploaded files are ignored by Git.

## Backups

- `backups/` is reserved for local database dumps or operational backup files.
- The directory is tracked with `.gitkeep`; backup contents are ignored by Git.

## Validation

Run these commands after foundation changes:

```bash
npx.cmd prisma generate
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

If tests are introduced later, add and run `npm.cmd run test`.
