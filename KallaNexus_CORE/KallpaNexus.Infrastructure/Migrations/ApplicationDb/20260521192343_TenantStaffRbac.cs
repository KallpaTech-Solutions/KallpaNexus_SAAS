using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class TenantStaffRbac : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RolesTenant",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Nivel = table.Column<int>(type: "integer", nullable: false),
                    EsSistema = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolesTenant", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolesTenantPermisos",
                columns: table => new
                {
                    RolTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermisoCodigo = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolesTenantPermisos", x => new { x.RolTenantId, x.PermisoCodigo });
                    table.ForeignKey(
                        name: "FK_RolesTenantPermisos_RolesTenant_RolTenantId",
                        column: x => x.RolTenantId,
                        principalTable: "RolesTenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsuariosStaff",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NombreCompleto = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RolTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuariosStaff", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsuariosStaff_RolesTenant_RolTenantId",
                        column: x => x.RolTenantId,
                        principalTable: "RolesTenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RolesTenant_TenantId_Codigo",
                table: "RolesTenant",
                columns: new[] { "TenantId", "Codigo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosStaff_RolTenantId",
                table: "UsuariosStaff",
                column: "RolTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosStaff_TenantId_Email",
                table: "UsuariosStaff",
                columns: new[] { "TenantId", "Email" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RolesTenantPermisos");

            migrationBuilder.DropTable(
                name: "UsuariosStaff");

            migrationBuilder.DropTable(
                name: "RolesTenant");
        }
    }
}
