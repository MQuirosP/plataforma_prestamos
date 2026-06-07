# Graph Report - loan-saas-monorepo  (2026-06-07)

## Corpus Check
- 51 files · ~850,331 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 419 nodes · 600 edges · 33 communities (21 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `104f80ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `AdminComponent` - 30 edges
2. `LoanService` - 25 edges
3. `isUsingMemoryStore()` - 23 edges
4. `DashboardComponent` - 20 edges
5. `AdminService` - 17 edges
6. `compilerOptions` - 11 edges
7. `ToastService` - 11 edges
8. `prisma` - 10 edges
9. `options` - 9 edges
10. `AuthenticatedRequest` - 8 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --calls--> `checkDatabaseConnection()`  [EXTRACTED]
  backend/src/index.ts → backend/src/services/db.ts
- `changeTenantPlan()` --calls--> `isUsingMemoryStore()`  [EXTRACTED]
  backend/src/controllers/adminController.ts → backend/src/services/db.ts
- `updateTenantPaymentDate()` --calls--> `isUsingMemoryStore()`  [EXTRACTED]
  backend/src/controllers/adminController.ts → backend/src/services/db.ts
- `changePassword()` --calls--> `isUsingMemoryStore()`  [EXTRACTED]
  backend/src/controllers/authController.ts → backend/src/services/db.ts
- `getCajaCobrador()` --calls--> `isUsingMemoryStore()`  [EXTRACTED]
  backend/src/controllers/cobradorController.ts → backend/src/services/db.ts

## Communities (33 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (40): changeTenantPlan(), createTenant(), getLogs(), getPlanConfigs(), getStats(), getTenants(), impersonateTenant(), logAudit() (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (17): environment, ExpiredComponent, LoginComponent, SaaSLog, SaaSPlanConfig, SaaSStats, Tenant, CountriesService (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (34): build, extract-i18n, serve, test, builder, configurations, defaultConfiguration, options (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (31): dependencies, bcryptjs, cors, express, express-rate-limit, jsonwebtoken, loan-saas-monorepo, @prisma/client (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (13): DashboardComponent, dependencies, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-browser-dynamic (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (25): devDependencies, @angular/cli, @angular/compiler-cli, @angular-devkit/build-angular, autoprefixer, jasmine-core, karma, karma-chrome-launcher (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): Administrador del SaaS (Acceso al Panel General), 🚀 Arquitectura del Proyecto, CAT-LOAN - Plataforma de Cobranza SaaS B2B, code:bash (npm install), code:bash (npm run dev), code:bash (cd backend), 💻 Configuración Local y Desarrollo, 🛡️ Credenciales de Prueba por Defecto (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (13): Additional Resources, Building, Code scaffolding, code:bash (ng serve), code:bash (ng generate component component-name), code:bash (ng generate --help), code:bash (ng build), code:bash (ng test) (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (5): AppComponent, compiled, fixture, appConfig, routes

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (10): prefix, projectType, root, schematics, sourceRoot, newProjectRoot, projects, frontend (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (10): dependencies, concurrently, description, name, private, scripts, build:all, dev (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): [1.0.0] - 2026-06-06, [1.1.0] - 2026-06-06, Añadido, Añadido, Changelog - CAT-LOAN, Corregido, Modificado

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (6): checkDatabaseConnection(), allowedOrigins, app, generalLimiter, startServer(), strictAuthLimiter

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (6): Adding Collectors (Cobradores), Backend (Railway), code:bash (cd frontend), code:bash (npx wrangler pages deploy dist/frontend/browser --project-na), Deployment Guide, Frontend (Cloudflare Pages)

## Knowledge Gaps
- **155 isolated node(s):** `name`, `version`, `description`, `private`, `install:all` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DashboardComponent` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 4` to `Community 6`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10522496371552975 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07653061224489796 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07130124777183601 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._