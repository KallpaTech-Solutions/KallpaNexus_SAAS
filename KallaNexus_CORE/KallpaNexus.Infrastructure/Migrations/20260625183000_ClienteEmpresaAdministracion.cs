using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using KallpaNexus.Infrastructure.Persistence;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations;

[DbContext(typeof(MasterDbContext))]
[Migration("20260625183000_ClienteEmpresaAdministracion")]
public partial class ClienteEmpresaAdministracion : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE admin."ClientesEmpresas"
                ADD COLUMN IF NOT EXISTS "LimiteSucursalesOverride" integer NULL;

            ALTER TABLE admin."ClientesEmpresas"
                ADD COLUMN IF NOT EXISTS "LimiteUsuariosStaffOverride" integer NULL;

            ALTER TABLE admin."ClientesEmpresas"
                ADD COLUMN IF NOT EXISTS "LimiteCanchasOverride" integer NULL;

            ALTER TABLE admin."ClientesEmpresas"
                ADD COLUMN IF NOT EXISTS "PrecioMensualAcordado" numeric NULL;

            ALTER TABLE admin."ClientesEmpresas"
                ADD COLUMN IF NOT EXISTS "ReservaWebPermitida" boolean NOT NULL DEFAULT true;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "LimiteCanchasOverride", schema: "admin", table: "ClientesEmpresas");
        migrationBuilder.DropColumn(name: "LimiteSucursalesOverride", schema: "admin", table: "ClientesEmpresas");
        migrationBuilder.DropColumn(name: "LimiteUsuariosStaffOverride", schema: "admin", table: "ClientesEmpresas");
        migrationBuilder.DropColumn(name: "PrecioMensualAcordado", schema: "admin", table: "ClientesEmpresas");
        migrationBuilder.DropColumn(name: "ReservaWebPermitida", schema: "admin", table: "ClientesEmpresas");
    }
}
