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
| **Decolecta** (RENIEC/SUNAT) | User Secrets `Decolecta:ApiKey` | `Decolecta__ApiKey`, opcional `Decolecta__BaseUrl` |
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

### Keep-alive (Render Free)

Los servicios Free se **apagan por inactividad** (~15 min). Un cron externo (UptimeRobot, cron-job.org, GitHub Actions, etc.) puede hacer **GET** cada **10–14 min** — **sin auth**, solo despertar el proceso:

| Servicio | URL sugerida | Respuesta |
|----------|--------------|-----------|
| **kallpanexus-api** | `https://kallpanexus-api.onrender.com/health` | `OK` (texto) |
| | `https://kallpanexus-api.onrender.com/healthz` | JSON `{ "status": "ok" }` (health check Render) |
| **kallpanexus-tenant-web** | `https://kallpanexus-tenant-web.onrender.com/health` | `OK` |
| **kallpanexus-admin-web** | `https://kallpanexus-admin-web.onrender.com/health` | `OK` |

En Render → **Health Check Path** de la API: `/healthz`. En los fronts Node puedes usar `/health` si configuras health check.

No expongas secretos en estas rutas; no hace falta JWT ni API key.

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
- **Health Check Path:** `/healthz` (o `/health` para ping texto `OK`)

### API — variables

`ASPNETCORE_ENVIRONMENT=Production`, `ASPNETCORE_URLS=http://0.0.0.0:$PORT` (opcional si usas imagen reciente: la API también lee env **`PORT`** de Render), connection strings Supabase, `Jwt__Key` (≥32 chars, distinto a dev), `Platform__*`. **No** `Development:SeedDemoData` en prod.

**Render + Supabase:** no uses el host directo `db.PROJECT_REF.supabase.co` en las connection strings (suele resolver a **IPv6** → `Network is unreachable` en el contenedor). Usa el **Session pooler** (IPv4), mismo valor en `ConnectionStrings__MasterConnection` y `ConnectionStrings__SharedTenantConnection`:

```text
Host=aws-1-us-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.TU_PROJECT_REF;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

**Usuario:** con Session pooler debe ser `postgres.xunhqcirknuawqvvbdel` (ref de tu proyecto), **no** solo `postgres`. Si el log dice `password authentication failed for user "postgres"`, casi seguro falta el sufijo `.PROJECT_REF` en `Username`.

**Password:** la contraseña actual de Database en Supabase (si la rotaste, actualiza Render). Si la password tiene `;` o `@`, escríbela tal cual o resetea una password alfanumérica simple para deploy.

Copia host, usuario (`postgres.xxxxx`) y password desde Supabase → **Connect** → **Session pooler**. Tras guardar env vars, Render redeploya solo.

### API — Decolecta (Render)

Consultas DNI/RUC/tipo de cambio usan [Decolecta](https://decolecta.com). **No** commitees la API key; contrólala solo con variables de entorno del servicio **kallpanexus-api**:

| Variable | Obligatoria | Notas |
|----------|-------------|--------|
| `Decolecta__ApiKey` | Sí, si usas consultas RENIEC/SUNAT en prod | Marca como **Secret** en Render. Token Bearer de la cuenta Decolecta activa. |
| `Decolecta__BaseUrl` | No | Por defecto `https://api.decolecta.com` (`appsettings.Production.json`). Solo cámbiala si Decolecta te indica otra URL. |

**Desarrollo local** (misma clave u otra de prueba):

```powershell
cd KallaNexus_CORE\KallaNexus_CORE
dotnet user-secrets set "Decolecta:ApiKey" "TU_TOKEN_DECOLECTA"
```

**Cuota mensual agotada (~100 consultas):** en Render → **Environment** → edita `Decolecta__ApiKey` con el token de tu **segunda cuenta** → guardar (Render reinicia el servicio). No hace falta redeploy desde Git. Los DNI ya guardados en `Personas` / clientes siguen sirviendo sin llamar a la API.

Si regeneras el token en el panel Decolecta, actualiza la misma variable y reinicia.

### tenant-web — Render (Node)

- **Name:** `kallpanexus-tenant-web`
- **Language:** Node
- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build --workspace=tenant-web`
- **Start Command:** `npm run start --workspace=tenant-web`
- **Health Check Path:** `/health` (respuesta `OK`) o vacío (`/`)

**Variables:** `NODE_VERSION=20`, `KNX_API_URL=https://TU-API.onrender.com`, `NEXT_PUBLIC_APP_URL=https://TU-TENANT.onrender.com`, `NEXT_PUBLIC_ADMIN_URL=https://TU-ADMIN.onrender.com/login`  
`NEXT_PUBLIC_*` deben existir **antes del build** (Render → Environment → marcar disponibles en build si aplica).

### admin-web — Render (Node)

- **Name:** `kallpanexus-admin-web`
- **Language:** Node
- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build --workspace=admin-web`
- **Start Command:** `npm run start --workspace=admin-web`
- **Health Check Path:** `/health`

**Variables:** `NODE_VERSION=20`, `KNX_API_URL`, `NEXT_PUBLIC_APP_URL=https://TU-ADMIN.onrender.com`, `NEXT_PUBLIC_TENANT_WEB_URL=https://TU-TENANT.onrender.com`

### tenant-web — variables (referencia)

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
