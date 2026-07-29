# Changelog - CAT-LOAN

Todos los cambios notables en este proyecto serán documentados en este archivo.

---

## [1.3.0] - 2026-07-28
### Añadido
- **Condonación de Mora (Fine Waiver)**: Implementada la funcionalidad de condonación de mora parcial o total exclusiva para el rol `PRESTAMISTA` y `ADMIN` (`POST /api/loans/:id/condonar-mora`), con persisencia acumulada en la columna `montoCondonado` (`waivedAmount`).
- **Motor Centralizado de Zonas Horarias (`dateUtils.ts`)**: Creado motor multi-tenant para el cómputo de días transcurridos y medianoche (`getDaysDiffInTimezone`, `getMidnightInTimezone`) evaluado estrictamente en la zona horaria IANA del tenant (`BusinessSettings.timezone`), previniendo desfasajes UTC del servidor Render/Neon.
- **Formateo de Eventos de Auditoría en Español**: Estandarizados todos los eventos de auditoría (ej: `Condonación de Mora`, `Crear Préstamo`, `Registro de Pago`) con etiquetas amigables en español en la Consola Administrador y vista impersonada.
- **Seguridad y Cabeceras HTTP**: Integrado `helmet` middleware para inyectar cabeceras de protección contra XSS, Clickjacking, MIME-sniffing y eliminación de cabecera `X-Powered-By`.

### Modificado
- **Reglas de Clasificación de Atrasados**: Préstamos con `multasAcumuladas > 0` se clasifican incondicionalmente bajo la pestaña "ATRASADOS" del Dashboard.
- **Feedback Táctil Micro-Animado**: Añadido efecto global `:active` (`scale(0.96)`) en todos los botones y elementos interactivos para respuesta al toque.
- **Seguridad en Cookies JWT**: Configurado `sameSite: 'none'` con `secure: true` en producción para cookies de `refresh_token` cross-domain entre Cloudflare Pages y Render.

---

## [1.2.0] - 2026-07-24

### Añadido
- **Enums de Dominio**: Introducidos enums tipados para `Role`, `PaymentMethod`, `FineFrequency`, `LoanStatus`, y `SubscriptionType` reemplazando cadenas de texto hardcodeadas en toda la aplicación (frontend y backend).
- **Estadísticas en Panel de Administración**: Implementado el conteo en tiempo real de clientes y cobradores por prestamista en la vista de administración, tanto para base de datos real (Prisma `_count`) como para el fallback en memoria.

### Modificado
- **Comportamiento del Modal de Abono**: 
  - La ventana emergente para registrar un abono ahora se centra verticalmente en pantallas de escritorio (`sm:items-center` y esquinas redondeadas completas) para evitar que aparezca desplazada al fondo.
  - El campo de monto del abono ahora tiene como valor predeterminado el valor de la cuota acordada (`cuotaSemanal`) del préstamo seleccionado, mejorando la rapidez de registro.
- **Seguridad y Roles**: Bloqueado el botón de crear préstamo para usuarios con rol `COBRADOR` tanto en la interfaz de usuario móvil (botón flotante FAB) como en el backend.

---

## [1.1.0] - 2026-06-06
### Añadido
- **Prefijo telefónico automático**: Se pre-llena automáticamente el código de llamada de país (ej. `+506` para Costa Rica, `+52` para México) en el formulario de creación de préstamos y en el onboarding inicial basándose en la moneda/país de operación del cobrador.
- **Dynamic CORS Policy (Backend)**: Soporte dinámico de orígenes que permite cualquier subdominio en `*.pages.dev`, `*.workers.dev` y `localhost` para facilitar despliegues en Cloudflare y acceso desde dispositivos móviles.
- **Soporte de Soporte en Login**: Añadido enlace directo de ayuda `mailto:mquirosp78@gmail.com` en el login.

### Modificado
- **Diseño del Login**: Ajustado el formulario en móviles para cargarse alineado al tope (`justify-start pt-10`) previniendo cortes de pantalla causados por el teclado en pantallas pequeñas.
- **Footer del Login**: Reemplazada la advertencia de sandbox local por una firma y aviso de copyright profesional de 2026.
- **Normalización de Autenticación**: Se limpian y convierten a minúsculas (`.trim().toLowerCase()`) todos los correos entrantes para evitar fallas de inicio de sesión debido a diferencias de capitalización.
- **Rol de Admin Automático**: Sincronización en base de datos asigna automáticamente el rol `ADMIN` a correos que incluyan "admin" (ej. `mario.quiros.admin@gmail.com`) durante su primer inicio de sesión.

### Corregido
- **Cálculo de Atraso (Weeks Active)**: Ajustado el cálculo del indicador de atraso usando `Math.max(0, Math.floor(...))` en lugar de `Math.ceil` para evitar que un préstamo creado hoy para pago en sábados se marque como atrasado en su primer día.
- **Placeholder de Moneda de WhatsApp**: Corregido el bug de reemplazo de `{moneda}` en el link de WhatsApp. Ahora se reemplazan todas las ocurrencias mediante expresiones regulares (`/\{moneda\}/g`), y se ajustó la plantilla predeterminada a símbolo al frente (`{moneda}{valor}`) para Costa Rica.

---

## [1.0.0] - 2026-06-06
### Añadido
- **Estructura Monorepo Workspaces**: Configuración con npm workspaces para la carpeta `backend` y `frontend`.
- **Base de Datos Relacional**: Implementación de PostgreSQL con Neon DB y Prisma ORM.
- **Servidor API REST (Backend)**: Rutas autenticadas para la gestión de préstamos, abonos y configuraciones.
- **Frontend Standalone Angular 19**: Interfaz móvil-first con esquema de marca oficial Caterpillar (#111111 negro industrial y acentos amarillo/verde/rojo).
- **Mapeo de Países (REST Countries)**: Onboarding inteligente y configuración que deduce la moneda de operación según el país del prestamista.
- **Compartición de Recibos Visuales**: Generación de captura de estado de cuenta en formato de imagen utilizando `html2canvas` para compartir a través de WhatsApp.
- **Panel de Administración**: Acceso para el rol `ADMIN` para prorrogar o suspender las suscripciones de los prestamistas.
- **Fallback Offline**: Soporte de base de datos en memoria si no se logra conexión con PostgreSQL.
