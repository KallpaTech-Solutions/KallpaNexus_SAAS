using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ConfiguracionNegocioSport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConfiguracionNegocio",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NombreComercial = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RazonSocial = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    TelefonoWhatsAppNegocio = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    MensajeWhatsAppReserva = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracionNegocio", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConfiguracionNegocio_TenantId",
                table: "ConfiguracionNegocio",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConfiguracionNegocio");
        }
    }
}
