CREATE TABLE IF NOT EXISTS "ConfiguracionNegocio" (
    "Id" uuid NOT NULL,
    "NombreComercial" character varying(200) NOT NULL,
    "RazonSocial" character varying(250),
    "TelefonoWhatsAppNegocio" character varying(20),
    "MensajeWhatsAppReserva" character varying(2000) NOT NULL,
    "TenantId" uuid NOT NULL,
    CONSTRAINT "PK_ConfiguracionNegocio" PRIMARY KEY ("Id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_ConfiguracionNegocio_TenantId"
    ON "ConfiguracionNegocio" ("TenantId");
