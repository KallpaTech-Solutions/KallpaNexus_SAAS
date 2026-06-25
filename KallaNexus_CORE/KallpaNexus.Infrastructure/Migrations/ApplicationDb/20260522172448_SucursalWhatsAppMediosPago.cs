using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class SucursalWhatsAppMediosPago : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UsuariosStaff",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AddColumn<string>(
                name: "TelefonoWhatsApp",
                table: "Sucursales",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

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

            migrationBuilder.CreateTable(
                name: "MediosPago",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    RequiereVoucherOnline = table.Column<bool>(type: "boolean", nullable: false),
                    PermiteSinVoucherPresencial = table.Column<bool>(type: "boolean", nullable: false),
                    EsPasarelaExterna = table.Column<bool>(type: "boolean", nullable: false),
                    ConfiguracionIntegracionJson = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Orden = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediosPago", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PagosReserva",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReservaId = table.Column<Guid>(type: "uuid", nullable: false),
                    MedioPagoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Monto = table.Column<decimal>(type: "numeric", nullable: false),
                    CodigoOperacion = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    VoucherUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RegistradoSinVoucher = table.Column<bool>(type: "boolean", nullable: false),
                    Canal = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PagosReserva", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PagosReserva_MediosPago_MedioPagoId",
                        column: x => x.MedioPagoId,
                        principalTable: "MediosPago",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PagosReserva_Reservas_ReservaId",
                        column: x => x.ReservaId,
                        principalTable: "Reservas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MediosPago_TenantId",
                table: "MediosPago",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PagosReserva_MedioPagoId",
                table: "PagosReserva",
                column: "MedioPagoId");

            migrationBuilder.CreateIndex(
                name: "IX_PagosReserva_ReservaId",
                table: "PagosReserva",
                column: "ReservaId");

            migrationBuilder.CreateIndex(
                name: "IX_PagosReserva_TenantId",
                table: "PagosReserva",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PagosReserva");

            migrationBuilder.DropTable(
                name: "MediosPago");

            migrationBuilder.DropColumn(
                name: "TelefonoWhatsApp",
                table: "Sucursales");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UsuariosStaff",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

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
        }
    }
}
