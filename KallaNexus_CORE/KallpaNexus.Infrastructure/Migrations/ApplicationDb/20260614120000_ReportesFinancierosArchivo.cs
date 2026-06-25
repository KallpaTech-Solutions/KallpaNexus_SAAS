using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260614120000_ReportesFinancierosArchivo")]
public partial class ReportesFinancierosArchivo : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ReportesFinancierosArchivo",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                Codigo = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                SucursalId = table.Column<Guid>(type: "uuid", nullable: false),
                SucursalNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                Ciudad = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                DesdeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                HastaUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                GeneradoEnUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                GeneradoPorStaffId = table.Column<Guid>(type: "uuid", nullable: true),
                GeneradoPorNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                DatosJson = table.Column<string>(type: "text", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ReportesFinancierosArchivo", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_ReportesFinancierosArchivo_TenantId",
            table: "ReportesFinancierosArchivo",
            column: "TenantId");

        migrationBuilder.CreateIndex(
            name: "IX_ReportesFinancierosArchivo_TenantId_Codigo",
            table: "ReportesFinancierosArchivo",
            columns: new[] { "TenantId", "Codigo" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_ReportesFinancierosArchivo_GeneradoEnUtc",
            table: "ReportesFinancierosArchivo",
            column: "GeneradoEnUtc");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ReportesFinancierosArchivo");
    }
}
