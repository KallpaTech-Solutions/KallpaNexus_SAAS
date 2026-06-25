using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ReestructuraModulosSport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Telefono",
                table: "Sucursales",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Nombre",
                table: "Sucursales",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Direccion",
                table: "Sucursales",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<bool>(
                name: "Activa",
                table: "Sucursales",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Sucursales_TenantId",
                table: "Sucursales",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sucursales_TenantId",
                table: "Sucursales");

            migrationBuilder.DropColumn(
                name: "Activa",
                table: "Sucursales");

            migrationBuilder.AlterColumn<string>(
                name: "Telefono",
                table: "Sucursales",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "Nombre",
                table: "Sucursales",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150);

            migrationBuilder.AlterColumn<string>(
                name: "Direccion",
                table: "Sucursales",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300);
        }
    }
}
