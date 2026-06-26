-- Cuotas admin por empresa (schema admin). Idempotente para Supabase SQL Editor.
ALTER TABLE admin."ClientesEmpresas"
    ADD COLUMN IF NOT EXISTS "LimiteSucursalesOverride" integer NULL;

ALTER TABLE admin."ClientesEmpresas"
    ADD COLUMN IF NOT EXISTS "LimiteUsuariosStaffOverride" integer NULL;

ALTER TABLE admin."ClientesEmpresas"
    ADD COLUMN IF NOT EXISTS "LimiteCanchasOverride" integer NULL;

ALTER TABLE admin."ClientesEmpresas"
    ADD COLUMN IF NOT EXISTS "PrecioMensualAcordado" numeric NULL;

ALTER TABLE admin."ClientesEmpresas"
    ADD COLUMN IF NOT EXISTS "ReservaWebPermitida" boolean NOT NULL DEFAULT true;

-- Registrar migración EF (tabla histórico en public, como el resto del master)
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
SELECT '20260625183000_ClienteEmpresaAdministracion', '10.0.8'
WHERE NOT EXISTS (
    SELECT 1 FROM "__EFMigrationsHistory"
    WHERE "MigrationId" = '20260625183000_ClienteEmpresaAdministracion'
);
