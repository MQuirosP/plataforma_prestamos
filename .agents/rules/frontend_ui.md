# Frontend & UI Guidelines

## UX/UI Design & Confirmation Modals

- **No Native Dialogs**: NEVER use browser native `confirm()` or `alert()` dialogues. Always use the custom confirmation modal component (`confirmModalConfig` signal/modal flow) for a premium, consistent visual appearance matching the application's color theme (Caterpillar yellow accent, dark design, backdrop-blur).
- **Chips, Tabs and Navigation Hover States**: When rendering clickable filter chips, horizontal tab selectors, or general button options, their hover state text color MUST transition to the brand's signature Caterpillar yellow accent color (`hover:text-caterpillar` and `hover:border-caterpillar/30` or similar) instead of plain white (`hover:text-white`), keeping the aesthetic consistent and premium.
- **Custom Dropdown Selects Layout**: To avoid broken focus borders or cut-off corners around custom select arrow dropdown elements:
  - Do NOT apply borders, outlines, or focus styles on the `<select>` tag itself.
  - Wrap the `<select>` in a parent container `div` styled exactly like `app-numeric-stepper` buttons (e.g. `group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface`).
  - Make the `<select>` borderless and full width (`w-full bg-transparent focus:outline-none appearance-none cursor-pointer text-white text-sm px-3 py-3 pr-12`).
  - Posititon the custom dropdown arrow container as an absolute overlay (`absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150`).
  - When the element is disabled, apply desaturation classes (`opacity-50 cursor-not-allowed`) to both the parent wrapper container and the inner select.
  - **No Bounce & No Layout Side-Effects**: `<select>` dropdowns and non-action text elements MUST NEVER be targeted with `active:scale(...)` or bounce micro-animations. Never alter the underlying layout bounds, width, or positioning of dropdown menus when requested to tweak an interaction or hover state.
  - **Reference Markup**:

    ```html
    <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
      <select [(ngModel)]="field" name="field" class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
        <option value="VAL">Option</option>
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
    ```

- **Date Pickers Standard (`<app-date-field>`)**:
  - NEVER use native `<input type="date">` or `<input type="datetime-local">`. Always use the custom component `<app-date-field>` ([date-field.component.ts](file:///c:/Users/mquir/.gemini/antigravity-ide/scratch/loan-saas-monorepo/frontend/src/app/shared/date-field/date-field.component.ts)).
  - **Single mode (`mode="single"`)**: Used for single date pickers (e.g. specific payment date or point-in-time selection). Integrates with Reactive Forms (`FormControl`) or `[(ngModel)]`.
  - **Range mode (`mode="range"`)**: Used for date range filtering (e.g. audit logs, report date bounds). Exposes an object `{ start: string, end: string }` via `ControlValueAccessor` / `[(ngModel)]` and provides quick presets (Hoy, Ayer, Últimos 7 días, Últimos 30 días, Este mes, Mes anterior).
  - **Responsive Behavior**: Automatically adapts via CDK `BreakpointObserver`:
    - Mobile (`< 768px`): Renders as a full-screen Touch UI dialog with horizontal chip presets scrollable at top, 44x44px minimum touch targets, and a fixed "Aplicar" confirmation button.
    - Desktop (`>= 768px`): Renders as a floating popover overlay with a vertical preset sidebar on the left and dual-month display.
  - **Mobile Creation Action Buttons (FAB Pattern)**: In mobile viewport (`< 768px`), main creation/addition actions (such as adding a loan or adding a team cobrador) MUST NOT use rectangular header buttons. Instead, render a fixed circular Floating Action Button (FAB) at the bottom right (`fixed right-5 bottom-6 w-14 h-14 rounded-full bg-caterpillar text-industrial-black z-40`). When impersonation mode is active, offset the FAB bottom position (`bottom-32`) to avoid overlapping the bottom admin return banner.
- **WhatsApp Phone Link Hover State**: All clickable phone numbers linking to WhatsApp (e.g. `https://wa.me/...`) MUST display as a clean minimal text link in muted tone (`text-industrial-muted`) and transition on hover specifically to WhatsApp emerald green (`hover:text-emerald-400 transition duration-150`) instead of Caterpillar yellow, without unnecessary inline icons or auxiliary text like "(Enviar mensaje)".
- **Collapsible Sections Interaction Pattern**: When creating expandable/collapsible settings or list sections (such as "Planes y Límites" or "Cambiar Contraseña"), NEVER wrap the entire header row or section title inside a `<button>` tag. The section title text MUST remain static, non-interactive text (`<span>`/`<div>`). The click event (`(click)="..."`), hover state, and cursor pointer MUST be applied ONLY to the isolated action button surrounding the chevron icon (`<button class="p-1 text-industrial-muted hover:text-caterpillar..."><svg>...</svg></button>`).
- **Account Statement Page & Document Design Rules (`LoanStatementComponent`)**:
  - **Single Primary Share Button**: Document views (like account statements) MUST feature a single, clean primary action button labeled simply **"Compartir"** (never duplicated as "Compartir por WhatsApp" at the top and bottom).
  - **No Misplaced Creation Buttons**: Official document inspection views MUST NOT contain primary record creation buttons (such as "+ Registrar Abono" or "+ Crear Préstamo"). Record creation belongs strictly in the main Dashboard or dedicated workflow screens.
  - **Single Clear Exit Control**: Avoid duplicating top and bottom exit buttons. Render a single, prominent exit control ("Cerrar y Volver") in the action footer.
  - **Compact Mobile Client Metadata Card**: On mobile viewports (`< 768px`), client information boxes MUST NOT stack 3 vertical full-width rows. Use a 2-column grid where the client name (`clienteNombre`) spans full width at the top, followed by 2 parallel columns for Teléfono and Fecha de Inicio below it.
  <!-- Single Primary Share Button ... (existing rule preserved by doing it here) -->
  - **Inline Modalidad Badge**: In document cards, place the modalidad badge (`TRADICIONAL` / `ALQUILER`) inline within the top header bar next to the logo/business title, keeping the card compact and avoiding vertical gap wasted space.

- **Standard View Layout (Page Containers)**:
  - **Global Header**: The application features a persistent global `<app-header>` at the root `AppComponent` level. **NEVER** hardcode a custom `<header>` bar inside a routed page component.
  - **Main Container**: All routed page components (e.g., Settings, Create Loan, Edit Loan, Clients Directory) MUST use a clean `<main class="max-w-md md:max-w-xl mx-auto px-4 pb-24 pt-6">` tag as their top-level viewport container. **NEVER** wrap the view in `min-h-screen bg-industrial-black` (as this is handled by `app.component.html`).
  - **Premium Card Style**: The primary content of any view MUST be wrapped inside the standardized "Premium Card":
    ```html
    <div class="bg-industrial-dark border border-industrial-border rounded-2xl p-5 shadow-2xl relative overflow-hidden mb-6">
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>
      <!-- Content goes here -->
    </div>
    ```

- **Form Page Header Layout (`CreateLoanComponent`, `EditLoanComponent`)**:
  - Creation and edition form pages MUST NOT render an external top floating header bar with a back chevron (`<`).
  - Form titles (e.g., `NUEVO PRÉSTAMO` or `EDITAR PRÉSTAMO`) MUST be placed **INSIDE the main form card container** (`bg-industrial-dark`) at the top, with a subtle bottom divider line (`border-b border-industrial-border/60`).
- **Form & Modal Action Button Layout & Labels**:
  - In all forms, modals, and confirmation dialogs:
    - **Left Button**: Secondary exit button, strictly labeled **"Cerrar y volver"** (NEVER "Cancelar").
    - **Right Button**: Primary action button in Caterpillar yellow accent (e.g., "Crear Préstamo", "Guardar Cambios", "Confirmar").
  - Dashboard loan card buttons (`Estado Cuenta` on left / `Registrar Abono` in yellow on right) stay intact as designed.
- **Native Share API (`canShare`)**: When building WhatsApp share links or any content sharing actions that trigger external applications, ALWAYS prioritize using the native Web Share API (`navigator.share()` and `navigator.canShare()`). Only fallback to a `window.open(whatsappUrl, '_blank')` if the browser does not support native sharing. Avoid hardcoded `<a>` tags with `wa.me` links; use action buttons `<button (click)="...">` that execute this logic gracefully.
- **Outside Click Interaction (`HostListener`)**: When implementing custom dropdown menus or floating context menus, ALWAYS bind a `@HostListener('document:click', ['$event'])` to the component to detect outside clicks and close the dropdown automatically when the user clicks anywhere else on the screen. Prevent event propagation on the trigger button itself using `$event.stopPropagation()` to avoid immediate closure.
