using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class TablaPivoteExplicitaTarifas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TarifasCanchas_Canchas_CanchaId",
                table: "TarifasCanchas");

            migrationBuilder.DropIndex(
                name: "IX_TarifasCanchas_CanchaId",
                table: "TarifasCanchas");

            migrationBuilder.DropIndex(
                name: "IX_TarifasCanchas_TenantId_CanchaId",
                table: "TarifasCanchas");

            migrationBuilder.DropColumn(
                name: "CanchaId",
                table: "TarifasCanchas");

            migrationBuilder.AlterColumn<DateTime>(
                name: "HoraInicio",
                table: "Reservas",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "HoraFin",
                table: "Reservas",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.CreateTable(
                name: "CanchasTarifas",
                columns: table => new
                {
                    CanchaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TarifaCanchaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SucursalId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CanchasTarifas", x => new { x.CanchaId, x.TarifaCanchaId });
                    table.ForeignKey(
                        name: "FK_CanchasTarifas_Canchas_CanchaId",
                        column: x => x.CanchaId,
                        principalTable: "Canchas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CanchasTarifas_TarifasCanchas_TarifaCanchaId",
                        column: x => x.TarifaCanchaId,
                        principalTable: "TarifasCanchas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TarifasCanchas_TenantId",
                table: "TarifasCanchas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CanchasTarifas_TarifaCanchaId",
                table: "CanchasTarifas",
                column: "TarifaCanchaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CanchasTarifas");

            migrationBuilder.DropIndex(
                name: "IX_TarifasCanchas_TenantId",
                table: "TarifasCanchas");

            migrationBuilder.AddColumn<Guid>(
                name: "CanchaId",
                table: "TarifasCanchas",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AlterColumn<DateTime>(
                name: "HoraInicio",
                table: "Reservas",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "HoraFin",
                table: "Reservas",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.CreateIndex(
                name: "IX_TarifasCanchas_CanchaId",
                table: "TarifasCanchas",
                column: "CanchaId");

            migrationBuilder.CreateIndex(
                name: "IX_TarifasCanchas_TenantId_CanchaId",
                table: "TarifasCanchas",
                columns: new[] { "TenantId", "CanchaId" });

            migrationBuilder.AddForeignKey(
                name: "FK_TarifasCanchas_Canchas_CanchaId",
                table: "TarifasCanchas",
                column: "CanchaId",
                principalTable: "Canchas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
