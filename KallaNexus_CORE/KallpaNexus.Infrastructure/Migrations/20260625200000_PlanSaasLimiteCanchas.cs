using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using KallpaNexus.Infrastructure.Persistence;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations;

[DbContext(typeof(MasterDbContext))]
[Migration("20260625200000_PlanSaasLimiteCanchas")]
public partial class PlanSaasLimiteCanchas : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE admin."PlanesSaaS"
                ADD COLUMN IF NOT EXISTS "LimiteCanchas" integer NOT NULL DEFAULT 0;

            UPDATE admin."PlanesSaaS"
            SET "LimiteCanchas" = CASE
                WHEN "PrecioMensual" <= 0 THEN 5
                WHEN "SoportaModuloSport" THEN 50
                ELSE 0
            END
            WHERE "LimiteCanchas" = 0;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "LimiteCanchas", schema: "admin", table: "PlanesSaaS");
    }
}
