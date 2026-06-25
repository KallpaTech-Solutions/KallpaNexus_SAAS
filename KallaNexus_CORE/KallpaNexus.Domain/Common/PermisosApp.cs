namespace KallpaNexus.Domain.Common;

/// <summary>
/// Catálogo estático de permisos atómicos. El backend autoriza solo por estos códigos, nunca por nombre de rol.
/// </summary>
public static class PermisosApp
{
    // --- Plataforma (Kallpa Nexus / superadmin) ---
    public const string PlatformDashboardVer = "platform:dashboard:ver";
    public const string PlatformEmpresasVer = "platform:empresas:ver";
    public const string PlatformEmpresasModificar = "platform:empresas:modificar";
    public const string PlatformTenantsVer = "platform:tenants:ver";
    public const string PlatformTenantsGestionar = "platform:tenants:gestionar";
    public const string PlatformPlanesVer = "platform:planes:ver";
    public const string PlatformPlanesGestionar = "platform:planes:gestionar";
    public const string PlatformConsumidoresVer = "platform:consumidores:ver";

    public const string PlatformPermisosVer = "platform:permisos:ver";
    public const string PlatformRolesVer = "platform:roles:ver";
    public const string PlatformRolesGestionar = "platform:roles:gestionar";

    public const string PlatformUsuariosVer = "platform:usuarios:ver";
    public const string PlatformUsuariosCrear = "platform:usuarios:crear";
    public const string PlatformUsuariosActivar = "platform:usuarios:activar";
    public const string PlatformUsuariosEliminar = "platform:usuarios:eliminar";
    public const string PlatformUsuariosOcultosGestionar = "platform:usuarios:ocultos";

    // --- Nexus Sport (tenant / staff; fase siguiente) ---
    public const string CanchasVer = "sport:canchas:ver";
    public const string CanchasCrear = "sport:canchas:crear";
    public const string CanchasModificar = "sport:canchas:modificar";
    public const string ReservasVer = "sport:reservas:ver";
    public const string ReservasCrear = "sport:reservas:crear";
    public const string ReservasCancelar = "sport:reservas:cancelar";
    public const string ReportesFinancieros = "sport:reportes:financieros";
    public const string ReportesFinancierosEliminar = "sport:reportes:eliminar";
    public const string SportUsuariosVer = "sport:usuarios:ver";
    public const string SportUsuariosCrear = "sport:usuarios:crear";
    public const string SportUsuariosActivar = "sport:usuarios:activar";
    public const string SportUsuariosEliminar = "sport:usuarios:eliminar";
    public const string SportRolesVer = "sport:roles:ver";
    public const string SportRolesGestionar = "sport:roles:gestionar";

    // --- Ventas / Punto de Venta ---
    public const string VentasVer = "sport:ventas:ver";
    public const string VentasCrear = "sport:ventas:crear";
    public const string VentasProductosGestionar = "sport:ventas:productos";

    // --- Compras / Inventario ---
    public const string ComprasVer = "sport:compras:ver";
    public const string ComprasCrear = "sport:compras:crear";

    // --- Egresos / Gastos ---
    public const string EgresosVer = "sport:egresos:ver";
    public const string EgresosCrear = "sport:egresos:crear";
    public const string EgresosEliminar = "sport:egresos:eliminar";

    public static IReadOnlyList<string> TodosSport { get; } =
    [
        CanchasVer,
        CanchasCrear,
        CanchasModificar,
        ReservasVer,
        ReservasCrear,
        ReservasCancelar,
        ReportesFinancieros,
        ReportesFinancierosEliminar,
        SportUsuariosVer,
        SportUsuariosCrear,
        SportUsuariosActivar,
        SportUsuariosEliminar,
        SportRolesVer,
        SportRolesGestionar,
        VentasVer,
        VentasCrear,
        VentasProductosGestionar,
        ComprasVer,
        ComprasCrear,
        EgresosVer,
        EgresosCrear,
        EgresosEliminar,
    ];

    public static IReadOnlyList<string> TodosPlataforma { get; } =
    [
        PlatformDashboardVer,
        PlatformEmpresasVer,
        PlatformEmpresasModificar,
        PlatformTenantsVer,
        PlatformTenantsGestionar,
        PlatformPlanesVer,
        PlatformPlanesGestionar,
        PlatformConsumidoresVer,
        PlatformPermisosVer,
        PlatformRolesVer,
        PlatformRolesGestionar,
        PlatformUsuariosVer,
        PlatformUsuariosCrear,
        PlatformUsuariosActivar,
        PlatformUsuariosEliminar,
        PlatformUsuariosOcultosGestionar
    ];
}
