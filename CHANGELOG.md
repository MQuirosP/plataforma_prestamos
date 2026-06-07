# Changelog - CAT-LOAN

Todos los cambios notables en este proyecto serán documentados en este archivo.

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
