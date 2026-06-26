/** Etiqueta DNI/RUC según TipoPersona del API (0/1 o PersonaNatural/Empresa). */
export function platformEmpresaDocCodigo(tipo: unknown): "DNI" | "RUC" {
  if (tipo === 1 || tipo === "1") return "RUC";
  const t = String(tipo ?? "").toLowerCase();
  if (t === "empresa") return "RUC";
  return "DNI";
}

export function platformEmpresaDocTexto(tipo: unknown, numero: string): string {
  const n = numero.trim();
  if (!n) return "—";
  return `${platformEmpresaDocCodigo(tipo)} ${n}`;
}
