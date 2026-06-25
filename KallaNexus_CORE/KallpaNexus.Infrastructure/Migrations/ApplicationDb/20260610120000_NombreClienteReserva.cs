using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class NombreClienteReserva : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NombreClienteReserva",
                table: "Reservas",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Reservas" r
                SET "NombreClienteReserva" = c."NombreCompleto"
                FROM "Clientes" c
                WHERE r."ClienteId" = c."Id"
                  AND r."NombreClienteReserva" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NombreClienteReserva",
                table: "Reservas");
        }
    }
}
