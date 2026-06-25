using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddTarifasCanchas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TarifasCanchas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CanchaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    HoraInicio = table.Column<int>(type: "integer", nullable: false),
                    HoraFin = table.Column<int>(type: "integer", nullable: false),
                    AplicaLunesAViernes = table.Column<bool>(type: "boolean", nullable: false),
                    AplicaFinDeSemana = table.Column<bool>(type: "boolean", nullable: false),
                    PrecioPorHora = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    Activa = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TarifasCanchas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TarifasCanchas_Canchas_CanchaId",
                        column: x => x.CanchaId,
                        principalTable: "Canchas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TarifasCanchas_CanchaId",
                table: "TarifasCanchas",
                column: "CanchaId");

            migrationBuilder.CreateIndex(
                name: "IX_TarifasCanchas_TenantId_CanchaId",
                table: "TarifasCanchas",
                columns: new[] { "TenantId", "CanchaId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TarifasCanchas");
        }
    }
}
