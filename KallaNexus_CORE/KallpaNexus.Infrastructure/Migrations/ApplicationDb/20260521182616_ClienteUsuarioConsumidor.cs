using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class ClienteUsuarioConsumidor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UsuarioConsumidorId",
                table: "Clientes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_UsuarioConsumidorId",
                table: "Clientes",
                column: "UsuarioConsumidorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Clientes_UsuarioConsumidorId",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "UsuarioConsumidorId",
                table: "Clientes");
        }
    }
}
