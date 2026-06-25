using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ConfiguracionWebImagenes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImagenHeroRuta",
                table: "ConfiguracionNegocio",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MensajeWebLanding",
                table: "ConfiguracionNegocio",
                type: "character varying(800)",
                maxLength: 800,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TituloWebLanding",
                table: "ConfiguracionNegocio",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImagenWebRuta",
                table: "Canchas",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImagenHeroRuta",
                table: "ConfiguracionNegocio");

            migrationBuilder.DropColumn(
                name: "MensajeWebLanding",
                table: "ConfiguracionNegocio");

            migrationBuilder.DropColumn(
                name: "TituloWebLanding",
                table: "ConfiguracionNegocio");

            migrationBuilder.DropColumn(
                name: "ImagenWebRuta",
                table: "Canchas");
        }
    }
}
