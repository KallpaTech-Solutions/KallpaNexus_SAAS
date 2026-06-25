using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OnboardingNucleoSaaS : Migration
    {
        private static readonly Guid PlanDemoId = Guid.Parse("a1000000-0000-4000-8000-000000000001");

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlanesSaaS",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PrecioMensual = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    LimiteSucursales = table.Column<int>(type: "integer", nullable: false),
                    LimiteUsuariosStaff = table.Column<int>(type: "integer", nullable: false),
                    SoportaModuloSport = table.Column<bool>(type: "boolean", nullable: false),
                    SoportaModuloStay = table.Column<bool>(type: "boolean", nullable: false),
                    SoportaModuloCare = table.Column<bool>(type: "boolean", nullable: false),
                    SoportaFidelizacionPuntos = table.Column<bool>(type: "boolean", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanesSaaS", x => x.Id);
                });

            migrationBuilder.Sql($"""
                INSERT INTO admin."PlanesSaaS" ("Id", "Nombre", "PrecioMensual", "LimiteSucursales", "LimiteUsuariosStaff",
                    "SoportaModuloSport", "SoportaModuloStay", "SoportaModuloCare", "SoportaFidelizacionPuntos", "Activo")
                VALUES ('{PlanDemoId}', 'Básico Sport (Demo)', 0, 3, 5, true, false, false, false, true);
                """);

            migrationBuilder.CreateTable(
                name: "ClientesEmpresas",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    DocumentoFiscal = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RazonSocial = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NombreComercial = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EmailFacturacion = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DireccionFiscal = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Pais = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlanSaaSId = table.Column<Guid>(type: "uuid", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    ProximoPago = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientesEmpresas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientesEmpresas_PlanesSaaS_PlanSaaSId",
                        column: x => x.PlanSaaSId,
                        principalSchema: "admin",
                        principalTable: "PlanesSaaS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddColumn<Guid>(
                name: "ClienteEmpresaId",
                schema: "admin",
                table: "Tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NombreComercialNegocio",
                schema: "admin",
                table: "Tenants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.Sql("""
                INSERT INTO admin."ClientesEmpresas" ("Id", "Tipo", "DocumentoFiscal", "RazonSocial", "NombreComercial",
                    "EmailFacturacion", "Telefono", "DireccionFiscal", "Pais", "PlanSaaSId", "Estado", "ProximoPago")
                SELECT
                    gen_random_uuid(),
                    1,
                    'LEG-' || LEFT(REPLACE(t."Id"::text, '-', ''), 12),
                    COALESCE(NULLIF(TRIM(t."Name"), ''), t."Subdomain"),
                    COALESCE(NULLIF(TRIM(t."Name"), ''), t."Subdomain"),
                    'migracion@kallpanexus.local',
                    '000000000',
                    NULL,
                    'Peru',
                    'a1000000-0000-4000-8000-000000000001',
                    2,
                    NOW() AT TIME ZONE 'UTC'
                FROM admin."Tenants" t;

                UPDATE admin."Tenants" t
                SET "ClienteEmpresaId" = c."Id",
                    "NombreComercialNegocio" = COALESCE(NULLIF(TRIM(t."Name"), ''), t."Subdomain")
                FROM admin."ClientesEmpresas" c
                WHERE c."DocumentoFiscal" = 'LEG-' || LEFT(REPLACE(t."Id"::text, '-', ''), 12);
                """);

            migrationBuilder.DropColumn(
                name: "Name",
                schema: "admin",
                table: "Tenants");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClienteEmpresaId",
                schema: "admin",
                table: "Tenants",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "NombreComercialNegocio",
                schema: "admin",
                table: "Tenants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Subdomain",
                schema: "admin",
                table: "Tenants",
                type: "character varying(63)",
                maxLength: 63,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_ClienteEmpresaId",
                schema: "admin",
                table: "Tenants",
                column: "ClienteEmpresaId");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Subdomain",
                schema: "admin",
                table: "Tenants",
                column: "Subdomain",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientesEmpresas_DocumentoFiscal",
                schema: "admin",
                table: "ClientesEmpresas",
                column: "DocumentoFiscal",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientesEmpresas_PlanSaaSId",
                schema: "admin",
                table: "ClientesEmpresas",
                column: "PlanSaaSId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tenants_ClientesEmpresas_ClienteEmpresaId",
                schema: "admin",
                table: "Tenants",
                column: "ClienteEmpresaId",
                principalSchema: "admin",
                principalTable: "ClientesEmpresas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tenants_ClientesEmpresas_ClienteEmpresaId",
                schema: "admin",
                table: "Tenants");

            migrationBuilder.DropTable(
                name: "ClientesEmpresas",
                schema: "admin");

            migrationBuilder.DropTable(
                name: "PlanesSaaS",
                schema: "admin");

            migrationBuilder.DropIndex(
                name: "IX_Tenants_Subdomain",
                schema: "admin",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ClienteEmpresaId",
                schema: "admin",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "NombreComercialNegocio",
                schema: "admin",
                table: "Tenants");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                schema: "admin",
                table: "Tenants",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
