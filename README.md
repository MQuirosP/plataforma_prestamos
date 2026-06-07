# CAT-LOAN - Plataforma de Cobranza SaaS B2B

CAT-LOAN es una plataforma SaaS B2B móvil-first diseñada para prestamistas y cobradores individuales. Permite gestionar préstamos activos, registrar abonos semanales, visualizar el rendimiento de capital en tiempo real y emitir recibos/estados de cuenta compartibles mediante WhatsApp.

## 🚀 Arquitectura del Proyecto

El proyecto está estructurado como un monorepo administrado con npm workspaces:

- **`/backend`**: Servidor API REST desarrollado con **Node.js**, **Express**, **Prisma ORM** y base de datos **PostgreSQL (Neon DB)**. Cuenta con fallback automático en memoria para desarrollo sin conexión.
- **`/frontend`**: Aplicación de cliente desarrollada en **Angular 19** con Standalone Components, gestión de estado reactivo mediante **Angular Signals** y estilos CSS con **Tailwind CSS**.

---

## 🛠️ Tecnologías Principales

- **Frontend**: Angular 19+, Tailwind CSS, html2canvas, RxJS.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (Neon / Railway).
- **Herramientas**: Concurrently, Ts-node-dev.

---

## 💻 Configuración Local y Desarrollo

### Requisitos Previos

- **Node.js** (Versión 18 o superior)
- **npm** (Versión 9 o superior)

### Instalación de Dependencias

Ejecuta el siguiente comando en la raíz del monorepo para instalar las dependencias de todos los módulos:

```bash
npm install
```

### Ejecutar en Desarrollo

Para iniciar el frontend y el backend de forma simultánea con recarga en caliente (hot reload):

```bash
npm run dev
```

Esto levantará:
- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:4200`

### Inicializar y Semillar Base de Datos (Neon DB)

Si deseas sincronizar los esquemas de base de datos e insertar los usuarios iniciales de prueba (incluyendo perfiles de administrador y cobradores):

```bash
cd backend
npx prisma db push
npx prisma db seed
```

---

## 🛡️ Credenciales de Prueba por Defecto

### Administrador del SaaS (Acceso al Panel General)
- **Correo**: `mario.quiros.admin@gmail.com`
- **Contraseña**: CUALQUIERA (Entorno de desarrollo acepta contraseña de prueba)

### Prestamista de Pruebas (Acceso al Dashboard de Préstamos)
- **Correo**: `mario.quiros.prestamista@gmail.com`
- **Contraseña**: CUALQUIERA

---

## 📋 Funcionalidades Principales

1. **Dashboard de Cobranza (Cobranza Wall)**:
   - Fichas interactivas divididas en tres pestañas reactivas: **Atrasados**, **Vencen Hoy** y **Al Día**.
   - Indicadores clave (KPIs) en tiempo real: Capital en la Calle, Por Cobrar esta Semana y Rendimiento Estimado.

2. **Panel de Administración SaaS**:
   - Visualización y búsqueda de todos los cobradores registrados.
   - Activación, suspensión y extensión de suscripciones (+30 días) en un solo clic.

3. **Control de Suscripciones**:
   - Bloqueo automático del dashboard al expirar la suscripción con pantalla amigable de contacto de soporte.

4. **Integración con WhatsApp**:
   - Generación de enlaces directos para enviar recordatorios personalizados con plantilla dinámica de cobro según el país y la moneda local.

---

## 📞 Soporte e Información
Para cualquier soporte técnico o comercial, por favor contactar al administrador del sistema en [mquirosp78@gmail.com](mailto:mquirosp78@gmail.com).
