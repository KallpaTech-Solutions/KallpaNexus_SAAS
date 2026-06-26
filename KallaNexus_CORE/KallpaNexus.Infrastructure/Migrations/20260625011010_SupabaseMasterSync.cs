using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KallpaNexus.Infrastructure.Migrations;

/// <summary>
/// Migración de alineación con Supabase: cambios ya cubiertos por 20260611180000 (idempotente).
/// Se mantiene el id en el historial para no reordenar el snapshot.
/// </summary>
public partial class SupabaseMasterSync : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Sin operaciones: evita 42701 si la columna/tabla ya existían por scripts manuales.
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
