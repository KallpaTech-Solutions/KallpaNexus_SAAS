# KallpaNexus_SAAS

Monorepo Kallpa Nexus (SaaS Sport B2B/B2C): API .NET 10 + Next.js (`tenant-web`, `admin-web`).

| Carpeta | Contenido |
|---------|-----------|
| `KallaNexus_CORE/` | API, EF Core, migraciones PostgreSQL |
| `frontend/` | Apps Next.js y paquetes `@kallpanexus/*` |

**Índice:** [Desarrollo local](#desarrollo-local) · [Base de datos Supabase](#base-de-datos-supabase) · [Variables de entorno](#variables-de-entorno) · [Inventario funcional](#inventario-funcional) · [Despliegue Render](#despliegue-render--supabase) · [Git](#git)

---

## Desarrollo local

### API

- Abrir `KallaNexus_CORE/KallpaNexus_API.slnx` o:

```powershell
cd KallaNexus_CORE\KallaNexus_CORE
dotnet run
```

- Swagger (Development): `https://localhost:7110/swagger`
- Connection strings Supabase: **User Secrets** en `KallaNexus_CORE/KallaNexus_CORE` (no commitear).

### Frontend

Requisito: Node 20+, API en ejecución.

```powershell
cd frontend
npm install
copy apps\tenant-web\.env.local.example apps\tenant-web\.env.local
copy apps\admin-web\.env.local.example apps\admin-web\.env.local
npm run dev:tenant   # http://localhost:3000
npm run dev:admin    # http://localhost:3001
```

| App | Uso |
|-----|-----|
| `tenant-web` | Landing B2B, `/sports`, panel staff |
| `admin-web` | Consola plataforma Kallpa |

En dev el navegador llama `/api/*` y Next reenvía a `KNX_API_URL` (ver `frontend/.env.example`). Config central: `frontend/packages/env/src/knx-env.ts`.

### Credenciales dev (Development)

Sincronizadas al arrancar la API según `appsettings.Development.json`:

- **Plataforma:** `Platform:SuperAdminEmail` / `Platform:SuperAdminPassword`
- **Staff tenant:** sección `Development:Tenants` (ej. `sportza`)

### Paquetes frontend

`@kallpanexus/types`, `@kallpanexus/api-client`, `@kallpanexus/shared`, `@kallpanexus/env`

---

## Base de datos Supabase

Un proyecto Supabase (piloto): **misma cadena** en `MasterConnection` y `SharedTenantConnection`.

| Capa | Esquema | Ejemplos |
|------|---------|----------|
| **Master** (SaaS) | `admin` | `Tenants`, `ClientesEmpresas`, `PlanesSaaS`, `UsuariosPlataforma` |
| **Tenant / Sport** | `public` | `Sucursales`, `Reservas`, `UsuariosStaff` (+ columna `TenantId`) |

**Session pooler** (Windows / IPv4), ejemplo — copiar host del dashboard:

```text
Host=aws-1-us-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.xunhqcirknuawqvvbdel;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

Migraciones (primera vez o tras pull):

```powershell
cd KallaNexus_CORE
$env:ConnectionStrings__MasterConnection = "..."
$env:ConnectionStrings__SharedTenantConnection = "..."
dotnet ef database update --context MasterDbContext --project KallpaNexus.Infrastructure --startup-project KallaNexus_CORE\KallpaNexus.API.csproj
dotnet ef database update --context ApplicationDbContext --project KallpaNexus.Infrastructure --startup-project KallaNexus_CORE\KallpaNexus.API.csproj
```

Al arrancar, el API aplica migraciones de **ApplicationDb**; **Master** requiere EF CLI la primera vez.

---

## Variables de entorno

| Dato | Desarrollo | Producción (Render) |
|------|------------|---------------------|
| Postgres | User Secrets | `ConnectionStrings__MasterConnection`, `ConnectionStrings__SharedTenantConnection` |
| JWT / Platform | `appsettings.Development.json` + secrets | `Jwt__*`, `Platform__*` |
| URL API (front) | `apps/*/.env.local` → `KNX_API_URL` | Env en tenant-web y admin-web |

Referencia front: `frontend/.env.example`.

---

## Inventario funcional

Estimación E2E (junio 2026):

| Ámbito | % | Notas |
|--------|---|--------|
| B2B SaaS (onboarding + admin + panel) | ~78 % | Piloto controlado |
| B2C (reserva web, sin `consumer-web`) | ~55 % | `/sports/{slug}` |
| Sport total (visión producto) | ~65 % | Solo vertical Sport |
| Admin plataforma | ~82 % | |
| API backend | ~85 % | |

**Checklist pre-deploy:** `KNX_API_URL` en ambos fronts; dominios `NEXT_PUBLIC_*`; JWT prod; sin `.env` en Git; smoke login admin/staff y reserva web.

**Limitaciones piloto:** uploads en disco API efímeros en Render Free; Swagger solo en Development.

---

## Despliegue Render + Supabase

**Arquitectura:** 1 repo GitHub privado → **3 Web Services** Render + 1 Supabase.

| Servicio | Root Directory | Language | Dockerfile / comandos |
|----------|----------------|----------|------------------------|
| **API** | `KallaNexus_CORE` | **Docker** | `Dockerfile` (en esa carpeta) |
| **tenant-web** | `frontend` | **Node** | build/start npm (ver abajo) |
| **admin-web** | `frontend` | **Node** | build/start npm (ver abajo) |

**Fronts (Node):** Build `npm ci && npm run build --workspace=tenant-web` (o `admin-web`). Start `npm run start --workspace=tenant-web` (Render inyecta `PORT`).

### API — Render (formulario)

- **Name:** `kallpanexus-api`
- **Language:** Docker
- **Root Directory:** `KallaNexus_CORE`
- **Dockerfile Path:** `Dockerfile`
- **Region:** Ohio (US East)

### API — variables

`ASPNETCORE_ENVIRONMENT=Production`, `ASPNETCORE_URLS=http://0.0.0.0:$PORT`, connection strings Supabase, `Jwt__Key` (≥32 chars, distinto a dev), `Platform__*`, `Decolecta__*` opcional. **No** `Development:SeedDemoData` en prod.

### tenant-web — variables

`NODE_VERSION=20`, `KNX_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`

### admin-web — variables

`NODE_VERSION=20`, `KNX_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TENANT_WEB_URL`

### Dominios ejemplo

- `kallpanexus.page` → tenant  
- `admin.kallpanexus.page` → admin  
- API → `*.onrender.com` o `api.*`

### Orden

1. Supabase + migraciones EF  
2. Push Git  
3. Render API → URL  
4. Render tenant + admin con `KNX_API_URL`  
5. DNS + pruebas  

Supabase al crear: **Data API OFF**, región Americas. Render API preferible **US East** cerca del pooler Supabase.

---

## Git

**No subir:** passwords, `.env` / `.env.local`, `bin/`, `obj/`, `node_modules/`, `.next/`.

```powershell
git init
git add .
git commit -m "Initial commit: Kallpa Nexus monorepo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/KallpaNexus_SAAS.git
git push -u origin main
```

La carpeta **`obj` en la raíz** no es parte del proyecto; bórrala si aparece (artefacto de build).
