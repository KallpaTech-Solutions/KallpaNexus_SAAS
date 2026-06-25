using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260625120000_MediosPagoUniqueTipo")]
    public partial class MediosPagoUniqueTipo : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM "MediosPago" AS a
                USING "MediosPago" AS b
                WHERE a."TenantId" = b."TenantId"
                  AND a."Tipo" = b."Tipo"
                  AND a."Id" > b."Id";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_MediosPago_TenantId_Tipo",
                table: "MediosPago",
                columns: new[] { "TenantId", "Tipo" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MediosPago_TenantId_Tipo",
                table: "MediosPago");
        }
    }
}
