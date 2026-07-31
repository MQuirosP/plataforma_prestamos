# Backend & Database Guidelines

## Active Server Awareness & Database Synchronization

- **Always Assume Active Local Dev Server**: Always assume the user has `npm run dev` running locally.
- **Verification and Warnings**: Before executing commands that mutate database schemas (`npx prisma db push`, `prisma generate`, environment variables), always verify and explicitly warn the user if they need to restart or refresh the server/browser to load new schema models or environment changes seamlessly.

## Database & Memory Store Synchronization

- **Simulated Memory Sync**: The monorepo incorporates an in-memory database fallback (`inMemoryStore` in `backend/src/services/db.ts`). Whenever a table schema changes in `schema.prisma`, you MUST also update `inMemoryStore` interfaces (e.g. `MemoryLoan`, `MemoryBusinessSettings`) and default seeded states to prevent controller compilation failure.

## Timezone-Aware Multi-Tenant Date Rules

- **Zero Hardcoded Timezones**: NEVER hardcode timezones (e.g. `'America/Costa_Rica'`) or rely on global `process.env.TZ`. Always retrieve the tenant's IANA timezone from `BusinessSettings.timezone` (e.g. `America/Costa_Rica`, `America/Mexico_City`, `America/Bogota`).
- **Midnight Normalization & Date Diff Utility**: All calendar day calculations, due dates, and penalty evaluations MUST utilize [`dateUtils.ts`](file:///c:/Users/mquir/.gemini/antigravity-ide/scratch/loan-saas-monorepo/backend/src/services/dateUtils.ts) (`getDaysDiffInTimezone`, `getMidnightInTimezone`). This guarantees 00:00:00 midnight normalization in the tenant's exact local time and prevents UTC server offset jumps.

## Error Handling & Validations

- **Use `AppError` Exclusively**: NEVER use generic `throw new Error(...)` for validation logic or business rules. Always use `throw new AppError(HTTP_CODE, 'Message')` from `backend/src/utils/AppError.ts`. This ensures the UI displays the correct Toast message.
- **Global Prisma Error Interception**: Do NOT manually catch generic Prisma database exceptions (`P2025`, `P2002`, `P2003`, `P2000`) unless you need highly specific logic. Let them bubble up to `next(err)`. The global error handler in `backend/src/index.ts` automatically captures these Prisma errors and translates them into appropriate `404`, `409` or `400` HTTP status codes.
