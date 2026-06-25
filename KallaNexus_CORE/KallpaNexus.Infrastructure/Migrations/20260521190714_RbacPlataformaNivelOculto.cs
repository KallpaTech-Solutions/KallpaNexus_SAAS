using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RbacPlataformaNivelOculto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Oculto",
                schema: "admin",
                table: "UsuariosPlataforma",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EsSistema",
                schema: "admin",
                table: "RolesPlataforma",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Nivel",
                schema: "admin",
                table: "RolesPlataforma",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosPlataforma_Oculto",
                schema: "admin",
                table: "UsuariosPlataforma",
                column: "Oculto");

            migrationBuilder.Sql("""
                UPDATE admin."RolesPlataforma" SET "Nivel" = 100, "EsSistema" = true WHERE "Codigo" = 'SuperAdmin';
                UPDATE admin."RolesPlataforma" SET "Nivel" = 80, "EsSistema" = true WHERE "Codigo" = 'AdminPlataforma';
                INSERT INTO admin."RolesPlataforma" ("Id", "Codigo", "Nombre", "Nivel", "EsSistema")
                SELECT 'a1000000-0000-0000-0000-000000000003', 'GerentePlataforma', 'Gerente de plataforma', 50, true
                WHERE NOT EXISTS (SELECT 1 FROM admin."RolesPlataforma" WHERE "Codigo" = 'GerentePlataforma');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UsuariosPlataforma_Oculto",
                schema: "admin",
                table: "UsuariosPlataforma");

            migrationBuilder.DropColumn(
                name: "Oculto",
                schema: "admin",
                table: "UsuariosPlataforma");

            migrationBuilder.DropColumn(
                name: "EsSistema",
                schema: "admin",
                table: "RolesPlataforma");

            migrationBuilder.DropColumn(
                name: "Nivel",
                schema: "admin",
                table: "RolesPlataforma");
        }
    }
}
