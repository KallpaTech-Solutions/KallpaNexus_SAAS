using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ConsultasIntegracionCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConsultasReniecDni",
                columns: table => new
                {
                    NumeroDocumento = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    FirstLastName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    SecondLastName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ConsultadoEnUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsultasReniecDni", x => x.NumeroDocumento);
                });

            migrationBuilder.CreateTable(
                name: "ConsultasSunatRuc",
                columns: table => new
                {
                    NumeroRuc = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    RazonSocial = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Condicion = table.Column<string>(type: "text", nullable: false),
                    Direccion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Distrito = table.Column<string>(type: "text", nullable: false),
                    Provincia = table.Column<string>(type: "text", nullable: false),
                    Departamento = table.Column<string>(type: "text", nullable: false),
                    EsDatosCompletos = table.Column<bool>(type: "boolean", nullable: false),
                    ConsultadoEnUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PayloadBasicoJson = table.Column<string>(type: "text", nullable: true),
                    PayloadCompletoJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsultasSunatRuc", x => x.NumeroRuc);
                });

            migrationBuilder.CreateTable(
                name: "TiposCambioSunat",
                columns: table => new
                {
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    BuyPrice = table.Column<string>(type: "text", nullable: false),
                    SellPrice = table.Column<string>(type: "text", nullable: false),
                    BaseCurrency = table.Column<string>(type: "text", nullable: false),
                    QuoteCurrency = table.Column<string>(type: "text", nullable: false),
                    ConsultadoEnUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TiposCambioSunat", x => x.Fecha);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConsultasReniecDni");

            migrationBuilder.DropTable(
                name: "ConsultasSunatRuc");

            migrationBuilder.DropTable(
                name: "TiposCambioSunat");
        }
    }
}
