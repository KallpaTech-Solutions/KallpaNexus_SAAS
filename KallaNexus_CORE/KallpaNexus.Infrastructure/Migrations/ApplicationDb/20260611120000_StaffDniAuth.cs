using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260611120000_StaffDniAuth")]
    /// <inheritdoc />
    public partial class StaffDniAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UsuariosStaff_TenantId_Email",
                table: "UsuariosStaff");

            migrationBuilder.AddColumn<bool>(
                name: "DebeCambiarPassword",
                table: "UsuariosStaff",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Dni",
                table: "UsuariosStaff",
                type: "character varying(8)",
                maxLength: 8,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "UsuariosStaff"
                SET "Dni" = LPAD((ABS(hashtext("Id"::text)) % 100000000)::text, 8, '0')
                WHERE "Dni" IS NULL OR "Dni" = '';
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Dni",
                table: "UsuariosStaff",
                type: "character varying(8)",
                maxLength: 8,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(8)",
                oldMaxLength: 8,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "UsuariosStaff",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosStaff_TenantId_Dni",
                table: "UsuariosStaff",
                columns: new[] { "TenantId", "Dni" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UsuariosStaff_TenantId_Dni",
                table: "UsuariosStaff");

            migrationBuilder.DropColumn(
                name: "DebeCambiarPassword",
                table: "UsuariosStaff");

            migrationBuilder.DropColumn(
                name: "Dni",
                table: "UsuariosStaff");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "UsuariosStaff",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosStaff_TenantId_Email",
                table: "UsuariosStaff",
                columns: new[] { "TenantId", "Email" },
                unique: true);
        }
    }
}
