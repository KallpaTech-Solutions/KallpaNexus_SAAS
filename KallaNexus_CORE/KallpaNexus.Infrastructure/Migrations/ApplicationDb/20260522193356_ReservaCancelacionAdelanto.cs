using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ReservaCancelacionAdelanto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AdelantoDevuelto",
                table: "Reservas",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CanceladaEnUtc",
                table: "Reservas",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdelantoDevuelto",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "CanceladaEnUtc",
                table: "Reservas");
        }
    }
}
