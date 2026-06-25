using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UsuariosConsumidor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UsuariosConsumidor",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Dni = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    NombreCompleto = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuariosConsumidor", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosConsumidor_Dni",
                schema: "admin",
                table: "UsuariosConsumidor",
                column: "Dni",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosConsumidor_Email",
                schema: "admin",
                table: "UsuariosConsumidor",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UsuariosConsumidor",
                schema: "admin");
        }
    }
}
