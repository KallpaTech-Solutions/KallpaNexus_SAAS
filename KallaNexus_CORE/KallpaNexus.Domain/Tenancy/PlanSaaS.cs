namespace KallpaNexus.Domain.Tenancy;

public class PlanSaaS
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal PrecioMensual { get; set; }

    /// <summary>Solo planes demo (precio 0): vigencia en días (ej. 15 o 30). Renovación mensual si hay precio.</summary>
    public int? DiasDuracionDemo { get; set; }

    public int LimiteSucursales { get; set; }
    public int LimiteUsuariosStaff { get; set; }

    /// <summary>Máximo de canchas activas por negocio (Sport). 0 = sin tope en plan.</summary>
    public int LimiteCanchas { get; set; }

    public bool SoportaModuloSport { get; set; }
    public bool SoportaModuloStay { get; set; }
    public bool SoportaModuloCare { get; set; }
    public bool SoportaFidelizacionPuntos { get; set; }

    public bool Activo { get; set; } = true;

    public ICollection<ClienteEmpresa> ClientesEmpresas { get; set; } = new List<ClienteEmpresa>();
}
