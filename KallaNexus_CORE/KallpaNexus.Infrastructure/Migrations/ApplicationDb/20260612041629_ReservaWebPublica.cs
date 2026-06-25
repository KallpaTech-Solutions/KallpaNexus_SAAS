using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ReservaWebPublica : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "HoldExpiraEnUtc",
                table: "Reservas",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Origen",
                table: "Reservas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "VisibleEnWeb",
                table: "Productos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxReservasWebPorDniPorDia",
                table: "ConfiguracionNegocio",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinutosHoldWeb",
                table: "ConfiguracionNegocio",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ReservaWebActiva",
                table: "ConfiguracionNegocio",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ReservaProductosSolicitados",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReservaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductoId = table.Column<Guid>(type: "uuid", nullable: false),
                    NombreProducto = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    PrecioUnitario = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReservaProductosSolicitados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReservaProductosSolicitados_Productos_ProductoId",
                        column: x => x.ProductoId,
                        principalTable: "Productos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReservaProductosSolicitados_Reservas_ReservaId",
                        column: x => x.ReservaId,
                        principalTable: "Reservas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReservaProductosSolicitados_ProductoId",
                table: "ReservaProductosSolicitados",
                column: "ProductoId");

            migrationBuilder.CreateIndex(
                name: "IX_ReservaProductosSolicitados_ReservaId",
                table: "ReservaProductosSolicitados",
                column: "ReservaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReservaProductosSolicitados");

            migrationBuilder.DropColumn(
                name: "HoldExpiraEnUtc",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "Origen",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "VisibleEnWeb",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "MaxReservasWebPorDniPorDia",
                table: "ConfiguracionNegocio");

            migrationBuilder.DropColumn(
                name: "MinutosHoldWeb",
                table: "ConfiguracionNegocio");

            migrationBuilder.DropColumn(
                name: "ReservaWebActiva",
                table: "ConfiguracionNegocio");
        }
    }
}
