using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class InicialMuloDeportes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sucursales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Direccion = table.Column<string>(type: "text", nullable: false),
                    Telefono = table.Column<string>(type: "text", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sucursales", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Canchas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    PrecioPorHora = table.Column<decimal>(type: "numeric", nullable: false),
                    TieneIluminacion = table.Column<bool>(type: "boolean", nullable: false),
                    EstaActiva = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Canchas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Canchas_Sucursales_SucursalId",
                        column: x => x.SucursalId,
                        principalTable: "Sucursales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reservas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CanchaId = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioClienteId = table.Column<Guid>(type: "uuid", nullable: false),
                    HoraInicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HoraFin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    MontoTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    Observaciones = table.Column<string>(type: "text", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reservas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reservas_Canchas_CanchaId",
                        column: x => x.CanchaId,
                        principalTable: "Canchas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Canchas_SucursalId",
                table: "Canchas",
                column: "SucursalId");

            migrationBuilder.CreateIndex(
                name: "IX_Reservas_CanchaId",
                table: "Reservas",
                column: "CanchaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Reservas");

            migrationBuilder.DropTable(
                name: "Canchas");

            migrationBuilder.DropTable(
                name: "Sucursales");
        }
    }
}
