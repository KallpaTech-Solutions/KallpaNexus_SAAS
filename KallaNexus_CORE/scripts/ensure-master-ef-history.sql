-- Sincroniza __EFMigrationsHistory del master cuando el esquema ya se aplicó a mano.
-- Ejecutar en Supabase (DB master) si MigrateAsync falla por columnas/tablas existentes.

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
SELECT v."MigrationId", '10.0.8'
FROM (VALUES
    ('20260611180000_SolicitudesContratoPlanDiasDemo'),
    ('20260625011010_SupabaseMasterSync'),
    ('20260625183000_ClienteEmpresaAdministracion'),
    ('20260625200000_PlanSaasLimiteCanchas')
) AS v("MigrationId")
WHERE NOT EXISTS (
    SELECT 1 FROM "__EFMigrationsHistory" h WHERE h."MigrationId" = v."MigrationId"
);

-- Columnas cuotas admin (por si aún faltan)
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

ALTER TABLE admin."PlanesSaaS"
    ADD COLUMN IF NOT EXISTS "LimiteCanchas" integer NOT NULL DEFAULT 0;
