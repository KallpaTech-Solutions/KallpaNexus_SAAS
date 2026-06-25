using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ReniecPersonasCatalogo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "ConsultasReniecDni",
                newName: "Personas");

            migrationBuilder.RenameColumn(
                name: "ConsultadoEnUtc",
                table: "Personas",
                newName: "ConsultadoReniecEnUtc");

            migrationBuilder.AddColumn<DateTime>(
                name: "ActualizadoEnUtc",
                table: "Personas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW() AT TIME ZONE 'UTC'");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Personas",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FuenteUltimaActualizacion",
                table: "Personas",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "decolecta");

            migrationBuilder.AddColumn<string>(
                name: "Telefono",
                table: "Personas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Personas"
                SET "ActualizadoEnUtc" = "ConsultadoReniecEnUtc",
                    "FuenteUltimaActualizacion" = 'decolecta';
                """);

            migrationBuilder.Sql("""
                INSERT INTO "Personas" (
                    "NumeroDocumento", "FirstName", "FirstLastName", "SecondLastName", "FullName",
                    "Telefono", "Email", "FuenteUltimaActualizacion", "ConsultadoReniecEnUtc", "ActualizadoEnUtc", "PayloadJson")
                SELECT DISTINCT ON (c."Dni")
                    c."Dni",
                    '', '', '',
                    c."NombreCompleto",
                    NULLIF(NULLIF(TRIM(c."Telefono"), ''), '000000000'),
                    NULLIF(TRIM(c."Email"), ''),
                    'cliente_sistema',
                    NOW() AT TIME ZONE 'UTC',
                    NOW() AT TIME ZONE 'UTC',
                    NULL
                FROM "Clientes" c
                WHERE c."Activo" = true
                  AND LENGTH(REGEXP_REPLACE(c."Dni", '\D', '', 'g')) = 8
                  AND c."Dni" !~ '^M'
                ON CONFLICT ("NumeroDocumento") DO UPDATE SET
                    "Telefono" = COALESCE(EXCLUDED."Telefono", "Personas"."Telefono"),
                    "Email" = COALESCE(EXCLUDED."Email", "Personas"."Email"),
                    "FullName" = CASE
                        WHEN TRIM("Personas"."FullName") = '' THEN EXCLUDED."FullName"
                        ELSE "Personas"."FullName"
                    END,
                    "ActualizadoEnUtc" = NOW() AT TIME ZONE 'UTC';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Telefono", table: "Personas");
            migrationBuilder.DropColumn(name: "Email", table: "Personas");
            migrationBuilder.DropColumn(name: "FuenteUltimaActualizacion", table: "Personas");
            migrationBuilder.DropColumn(name: "ActualizadoEnUtc", table: "Personas");

            migrationBuilder.RenameColumn(
                name: "ConsultadoReniecEnUtc",
                table: "Personas",
                newName: "ConsultadoEnUtc");

            migrationBuilder.RenameTable(
                name: "Personas",
                newName: "ConsultasReniecDni");
        }
    }
}
