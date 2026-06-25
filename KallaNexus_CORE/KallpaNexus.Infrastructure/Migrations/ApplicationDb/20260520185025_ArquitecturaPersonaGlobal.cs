using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ArquitecturaPersonaGlobal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clientes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Dni = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    NombreCompleto = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clientes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_TenantId_Dni",
                table: "Clientes",
                columns: new[] { "TenantId", "Dni" },
                unique: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ClienteId",
                table: "Reservas",
                type: "uuid",
                nullable: true);

            // Migra contactos legados a Clientes (DNI sintético único por reserva sin DNI histórico)
            migrationBuilder.Sql("""
                INSERT INTO "Clientes" ("Id", "Dni", "NombreCompleto", "Telefono", "Email", "Activo", "TenantId")
                SELECT
                    gen_random_uuid(),
                    LEFT('M' || REPLACE(r."Id"::text, '-', ''), 15),
                    COALESCE(NULLIF(TRIM(r."NombreCliente"), ''), 'Cliente migrado'),
                    COALESCE(NULLIF(TRIM(r."TelefonoCliente"), ''), '000000000'),
                    NULL,
                    true,
                    r."TenantId"
                FROM "Reservas" r;

                UPDATE "Reservas" r
                SET "ClienteId" = c."Id"
                FROM "Clientes" c
                WHERE c."Dni" = LEFT('M' || REPLACE(r."Id"::text, '-', ''), 15)
                  AND c."TenantId" = r."TenantId";
                """);

            migrationBuilder.DropColumn(
                name: "NombreCliente",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "TelefonoCliente",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "UsuarioClienteId",
                table: "Reservas");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClienteId",
                table: "Reservas",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reservas_ClienteId",
                table: "Reservas",
                column: "ClienteId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reservas_Clientes_ClienteId",
                table: "Reservas",
                column: "ClienteId",
                principalTable: "Clientes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reservas_Clientes_ClienteId",
                table: "Reservas");

            migrationBuilder.DropIndex(
                name: "IX_Reservas_ClienteId",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "ClienteId",
                table: "Reservas");

            migrationBuilder.AddColumn<Guid>(
                name: "UsuarioClienteId",
                table: "Reservas",
                type: "uuid",
                nullable: false,
                defaultValue: Guid.Empty);

            migrationBuilder.AddColumn<string>(
                name: "NombreCliente",
                table: "Reservas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TelefonoCliente",
                table: "Reservas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.DropTable(
                name: "Clientes");
        }
    }
}
