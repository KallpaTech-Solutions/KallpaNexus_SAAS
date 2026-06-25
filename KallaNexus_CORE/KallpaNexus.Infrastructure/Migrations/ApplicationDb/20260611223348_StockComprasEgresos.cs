using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class StockComprasEgresos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ControlStock",
                table: "Productos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PuntoAlerta",
                table: "Productos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StockActual",
                table: "Productos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ComprasProducto",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductoNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Proveedor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    CostoUnitario = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    CostoTotal = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RegistradoPorNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComprasProducto", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Egresos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Categoria = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Monto = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    MedioPagoId = table.Column<Guid>(type: "uuid", nullable: true),
                    MedioPagoNombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RegistradoPorNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Egresos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ComprasProducto_ProductoId",
                table: "ComprasProducto",
                column: "ProductoId");

            migrationBuilder.CreateIndex(
                name: "IX_ComprasProducto_SucursalId_FechaHora",
                table: "ComprasProducto",
                columns: new[] { "SucursalId", "FechaHora" });

            migrationBuilder.CreateIndex(
                name: "IX_Egresos_SucursalId_FechaHora",
                table: "Egresos",
                columns: new[] { "SucursalId", "FechaHora" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComprasProducto");

            migrationBuilder.DropTable(
                name: "Egresos");

            migrationBuilder.DropColumn(
                name: "ControlStock",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "PuntoAlerta",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "StockActual",
                table: "Productos");
        }
    }
}
