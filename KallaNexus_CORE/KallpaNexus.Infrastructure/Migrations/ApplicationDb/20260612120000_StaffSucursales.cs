using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260612120000_StaffSucursales")]
    public partial class StaffSucursales : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UsuariosStaffSucursales",
                columns: table => new
                {
                    UsuarioStaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuariosStaffSucursales", x => new { x.UsuarioStaffId, x.SucursalId });
                    table.ForeignKey(
                        name: "FK_UsuariosStaffSucursales_Sucursales_SucursalId",
                        column: x => x.SucursalId,
                        principalTable: "Sucursales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsuariosStaffSucursales_UsuariosStaff_UsuarioStaffId",
                        column: x => x.UsuarioStaffId,
                        principalTable: "UsuariosStaff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosStaffSucursales_SucursalId",
                table: "UsuariosStaffSucursales",
                column: "SucursalId");

            migrationBuilder.Sql("""
                INSERT INTO "UsuariosStaffSucursales" ("UsuarioStaffId", "SucursalId")
                SELECT u."Id", s."Id"
                FROM "UsuariosStaff" u
                INNER JOIN "RolesTenant" r ON r."Id" = u."RolTenantId"
                INNER JOIN LATERAL (
                    SELECT s2."Id"
                    FROM "Sucursales" s2
                    WHERE s2."TenantId" = u."TenantId" AND s2."Activa" = true
                    ORDER BY s2."Nombre"
                    LIMIT 1
                ) s ON true
                WHERE r."Codigo" <> 'Gerente'
                  AND NOT EXISTS (
                    SELECT 1 FROM "UsuariosStaffSucursales" x WHERE x."UsuarioStaffId" = u."Id"
                  );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UsuariosStaffSucursales");
        }
    }
}
