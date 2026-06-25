using System;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260612180000_ReservaGrupoWebMedioVisible")]
    public partial class ReservaGrupoWebMedioVisible : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GrupoSolicitudWebId",
                table: "Reservas",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "VisibleEnWeb",
                table: "MediosPago",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                """
                UPDATE "MediosPago"
                SET "VisibleEnWeb" = true
                WHERE "Tipo" IN (2, 3, 1)
                  AND "Activo" = true
                  AND NOT "EsPasarelaExterna";
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GrupoSolicitudWebId",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "VisibleEnWeb",
                table: "MediosPago");
        }
    }
}
