using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RbacPlataformaPermisos : Migration
    {
        private static readonly Guid RolSuperAdminId = Guid.Parse("a1000000-0000-0000-0000-000000000001");
        private static readonly Guid RolAdminPlataformaId = Guid.Parse("a1000000-0000-0000-0000-000000000002");

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Permisos",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Codigo = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Modulo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permisos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolesPlataforma",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolesPlataforma", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolesPlataformaPermisos",
                schema: "admin",
                columns: table => new
                {
                    RolPlataformaId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermisoId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolesPlataformaPermisos", x => new { x.RolPlataformaId, x.PermisoId });
                    table.ForeignKey(
                        name: "FK_RolesPlataformaPermisos_Permisos_PermisoId",
                        column: x => x.PermisoId,
                        principalSchema: "admin",
                        principalTable: "Permisos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolesPlataformaPermisos_RolesPlataforma_RolPlataformaId",
                        column: x => x.RolPlataformaId,
                        principalSchema: "admin",
                        principalTable: "RolesPlataforma",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "admin",
                table: "RolesPlataforma",
                columns: new[] { "Id", "Codigo", "Nombre" },
                values: new object[,]
                {
                    { RolSuperAdminId, "SuperAdmin", "Super Administrador" },
                    { RolAdminPlataformaId, "AdminPlataforma", "Administrador de plataforma" }
                });

            migrationBuilder.AddColumn<Guid>(
                name: "RolPlataformaId",
                schema: "admin",
                table: "UsuariosPlataforma",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql($"""
                UPDATE admin."UsuariosPlataforma"
                SET "RolPlataformaId" = '{RolSuperAdminId}'
                WHERE "Rol" = 0;

                UPDATE admin."UsuariosPlataforma"
                SET "RolPlataformaId" = '{RolAdminPlataformaId}'
                WHERE "Rol" = 1;

                UPDATE admin."UsuariosPlataforma"
                SET "RolPlataformaId" = '{RolSuperAdminId}'
                WHERE "RolPlataformaId" IS NULL;
                """);

            migrationBuilder.DropColumn(
                name: "Rol",
                schema: "admin",
                table: "UsuariosPlataforma");

            migrationBuilder.AlterColumn<Guid>(
                name: "RolPlataformaId",
                schema: "admin",
                table: "UsuariosPlataforma",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosPlataforma_RolPlataformaId",
                schema: "admin",
                table: "UsuariosPlataforma",
                column: "RolPlataformaId");

            migrationBuilder.CreateIndex(
                name: "IX_Permisos_Codigo",
                schema: "admin",
                table: "Permisos",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolesPlataforma_Codigo",
                schema: "admin",
                table: "RolesPlataforma",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolesPlataformaPermisos_PermisoId",
                schema: "admin",
                table: "RolesPlataformaPermisos",
                column: "PermisoId");

            migrationBuilder.AddForeignKey(
                name: "FK_UsuariosPlataforma_RolesPlataforma_RolPlataformaId",
                schema: "admin",
                table: "UsuariosPlataforma",
                column: "RolPlataformaId",
                principalSchema: "admin",
                principalTable: "RolesPlataforma",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UsuariosPlataforma_RolesPlataforma_RolPlataformaId",
                schema: "admin",
                table: "UsuariosPlataforma");

            migrationBuilder.DropTable(
                name: "RolesPlataformaPermisos",
                schema: "admin");

            migrationBuilder.DropTable(
                name: "Permisos",
                schema: "admin");

            migrationBuilder.DropTable(
                name: "RolesPlataforma",
                schema: "admin");

            migrationBuilder.DropIndex(
                name: "IX_UsuariosPlataforma_RolPlataformaId",
                schema: "admin",
                table: "UsuariosPlataforma");

            migrationBuilder.DropColumn(
                name: "RolPlataformaId",
                schema: "admin",
                table: "UsuariosPlataforma");

            migrationBuilder.AddColumn<int>(
                name: "Rol",
                schema: "admin",
                table: "UsuariosPlataforma",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
