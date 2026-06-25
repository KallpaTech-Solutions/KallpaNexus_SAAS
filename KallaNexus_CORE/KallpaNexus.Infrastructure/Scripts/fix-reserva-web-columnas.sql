-- Ejecutar en PostgreSQL del tenant si falla "no existe la columna GrupoSolicitudWebId"
ALTER TABLE "Reservas" ADD COLUMN IF NOT EXISTS "GrupoSolicitudWebId" uuid NULL;

ALTER TABLE "MediosPago" ADD COLUMN IF NOT EXISTS "VisibleEnWeb" boolean NOT NULL DEFAULT false;

UPDATE "MediosPago"
SET "VisibleEnWeb" = true
WHERE "Tipo" IN (2, 3, 1)
  AND "Activo" = true
  AND NOT "EsPasarelaExterna";

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
SELECT '20260612180000_ReservaGrupoWebMedioVisible', '10.0.8'
WHERE NOT EXISTS (
  SELECT 1 FROM "__EFMigrationsHistory"
  WHERE "MigrationId" = '20260612180000_ReservaGrupoWebMedioVisible'
);
