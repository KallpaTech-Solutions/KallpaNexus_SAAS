namespace KallpaNexus.Domain.Modulos.Sport.Tenancy;

public class UsuarioStaffSucursal
{
    public Guid UsuarioStaffId { get; set; }
    public UsuarioStaff UsuarioStaff { get; set; } = null!;
    public Guid SucursalId { get; set; }
}
