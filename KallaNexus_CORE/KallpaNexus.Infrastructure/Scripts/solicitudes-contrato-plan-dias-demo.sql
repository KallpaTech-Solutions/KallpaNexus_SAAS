-- Master DB (kallpanexus_master): columnas y tabla de solicitudes de contrato
-- Ejecutar si falla: no existe la columna "DiasDuracionDemo"

ALTER TABLE admin."PlanesSaaS"
  ADD COLUMN IF NOT EXISTS "DiasDuracionDemo" integer NULL;

UPDATE admin."PlanesSaaS"
SET "DiasDuracionDemo" = 30
WHERE "PrecioMensual" <= 0 AND "DiasDuracionDemo" IS NULL;

CREATE TABLE IF NOT EXISTS admin."SolicitudesContratoPlan"
(
    "Id" uuid NOT NULL,
    "ClienteEmpresaId" uuid NOT NULL,
    "PlanSaaSId" uuid NOT NULL,
    "TenantId" uuid NULL,
    "Subdomain" character varying(80) NULL,
    "Estado" integer NOT NULL,
    "MensajeCliente" character varying(2000) NULL,
    "NotasPlataforma" character varying(4000) NULL,
    "SolicitanteNombre" character varying(200) NOT NULL,
    "SolicitanteDni" character varying(20) NOT NULL,
    "SolicitanteEmail" character varying(256) NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "RespondidoEn" timestamp with time zone NULL,
    CONSTRAINT "PK_SolicitudesContratoPlan" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_SolicitudesContratoPlan_ClientesEmpresas_ClienteEmpresaId"
        FOREIGN KEY ("ClienteEmpresaId") REFERENCES admin."ClientesEmpresas" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_SolicitudesContratoPlan_PlanesSaaS_PlanSaaSId"
        FOREIGN KEY ("PlanSaaSId") REFERENCES admin."PlanesSaaS" ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_SolicitudesContratoPlan_ClienteEmpresaId_Estado"
    ON admin."SolicitudesContratoPlan" ("ClienteEmpresaId", "Estado");

CREATE INDEX IF NOT EXISTS "IX_SolicitudesContratoPlan_PlanSaaSId"
    ON admin."SolicitudesContratoPlan" ("PlanSaaSId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
SELECT '20260611180000_SolicitudesContratoPlanDiasDemo', '10.0.0'
WHERE NOT EXISTS (
  SELECT 1 FROM "__EFMigrationsHistory"
  WHERE "MigrationId" = '20260611180000_SolicitudesContratoPlanDiasDemo'
);
