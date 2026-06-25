using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SupabaseMasterSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DiasDuracionDemo",
                schema: "admin",
                table: "PlanesSaaS",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SolicitudesContratoPlan",
                schema: "admin",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClienteEmpresaId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanSaaSId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    Subdomain = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    MensajeCliente = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    NotasPlataforma = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    SolicitanteNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SolicitanteDni = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SolicitanteEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    RespondidoEn = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitudesContratoPlan", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitudesContratoPlan_ClientesEmpresas_ClienteEmpresaId",
                        column: x => x.ClienteEmpresaId,
                        principalSchema: "admin",
                        principalTable: "ClientesEmpresas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SolicitudesContratoPlan_PlanesSaaS_PlanSaaSId",
                        column: x => x.PlanSaaSId,
                        principalSchema: "admin",
                        principalTable: "PlanesSaaS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesContratoPlan_ClienteEmpresaId_Estado",
                schema: "admin",
                table: "SolicitudesContratoPlan",
                columns: new[] { "ClienteEmpresaId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudesContratoPlan_PlanSaaSId",
                schema: "admin",
                table: "SolicitudesContratoPlan",
                column: "PlanSaaSId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SolicitudesContratoPlan",
                schema: "admin");

            migrationBuilder.DropColumn(
                name: "DiasDuracionDemo",
                schema: "admin",
                table: "PlanesSaaS");
        }
    }
}
