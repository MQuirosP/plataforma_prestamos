# Business Logic, Roles & Architecture Guidelines

## Code Naming Conventions & Language Separation

- **Code Base & Database in English**: All Prisma schemas, model fields, API payloads, TS interfaces, variables, and function names MUST be written strictly in **English** (e.g. `lenderId`, `clientName`, `originalAmount`, `installmentAmount`, `accumulatedFines`, `waivedAmount`, `paymentCategory`).
- **User Interface (UI) strictly in Spanish**: All user-facing text, labels, button captions, toast messages, receipts, and audit event descriptions displayed in the UI MUST remain **100% in Spanish** (e.g., "Condonación de Mora", "Registrar Abono", "Crear Préstamo").

## Billing, Plans & Permissions

- **Collector Restrictions**: Members with the role `COBRADOR` have restricted access. They are forbidden from creating, editing, or deleting loans, and cannot modify business settings. These endpoints/actions must return `403 Forbidden` on the backend and hide their respective UI elements on the frontend.
- **SaaS Demos, Trials & Environment Variables Rules**:
  - **Zero Hardcoded Phone Numbers / Support Contacts**: NEVER hardcode support WhatsApp numbers or trial duration days in components or controllers. Always read `SUPPORT_WHATSAPP_NUMBER`, `DEFAULT_TRIAL_DAYS`, and `DEFAULT_COUNTRY_CODE` from `process.env` in backend or `environment.supportWhatsappNumber` in frontend.
  - **Trial Lifecycle & Kill-Switch**: A tenant account created as demo MUST have `isTrial = true` and `fechaPruebaFin` calculated based on `DEFAULT_TRIAL_DAYS` (default 14 days). If `fechaPruebaFin` expires without a `paymentDate`, `authMiddleware` MUST block operations returning HTTP `403 Forbidden` (`TRIAL_EXPIRED`).
  - **Trial Extension**: The Super Admin can extend trials using either relative days (`days`) or an explicit calendar date (`targetDate`) via `<app-date-field mode="single" [iconOnly]="true">`.
  - **CORS Allowed Origins**: `process.env.ALLOWED_ORIGINS` MUST be parsed as a comma-separated list of origins. Never hardcode single domain strings in `index.ts`.

## Strict Type Safety & Verification
- Do not bypass type declarations. Always update frontend interfaces and service methods to reflect changes in backend controller payloads or database structures.
- **Use Enums instead of hardcoded strings**: Always import and use explicit typescript `Enum` values (e.g. `Role.ADMIN` or `FineFrequency.DAILY`) rather than hardcoded string literals (like `'admin'` or `'DAILY'`) to capture typos at compile-time instead of runtime.
- Before declaring any task finished, the agent MUST run `npx tsc --noEmit` in both `frontend/` and `backend/` directories to verify 100% successful type compilation.
