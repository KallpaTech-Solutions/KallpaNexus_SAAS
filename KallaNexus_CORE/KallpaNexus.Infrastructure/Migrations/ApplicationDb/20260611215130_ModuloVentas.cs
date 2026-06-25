using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ModuloVentas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Productos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Categoria = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Precio = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Productos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Ventas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClienteNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    ReservaId = table.Column<Guid>(type: "uuid", nullable: true),
                    MedioPagoId = table.Column<Guid>(type: "uuid", nullable: true),
                    MedioPagoNombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    MontoTotal = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RegistradoPorNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ventas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VentaItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VentaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductoId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProductoNombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PrecioUnitario = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VentaItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VentaItems_Ventas_VentaId",
                        column: x => x.VentaId,
                        principalTable: "Ventas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Productos_SucursalId_Activo",
                table: "Productos",
                columns: new[] { "SucursalId", "Activo" });

            migrationBuilder.CreateIndex(
                name: "IX_VentaItems_VentaId",
                table: "VentaItems",
                column: "VentaId");

            migrationBuilder.CreateIndex(
                name: "IX_Ventas_SucursalId_FechaHora",
                table: "Ventas",
                columns: new[] { "SucursalId", "FechaHora" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Productos");
            migrationBuilder.DropTable(name: "VentaItems");
            migrationBuilder.DropTable(name: "Ventas");
        }
    }
}
