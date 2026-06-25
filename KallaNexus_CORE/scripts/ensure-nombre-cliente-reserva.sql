-- Nombre por reserva (cliente varios DNI 123)
ALTER TABLE "Reservas"
    ADD COLUMN IF NOT EXISTS "NombreClienteReserva" character varying(150) NULL;

UPDATE "Reservas" r
SET "NombreClienteReserva" = c."NombreCompleto"
FROM "Clientes" c
WHERE r."ClienteId" = c."Id"
  AND r."NombreClienteReserva" IS NULL;
