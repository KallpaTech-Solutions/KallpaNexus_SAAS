import type { jsPDF } from "jspdf";

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const LOGO_SPORT_URL = "/brand/Sports/LOGO-NEXUS-SPORTS.png";

const C = {
  navy: [52, 73, 94] as [number, number, number],
  orange: [240, 90, 40] as [number, number, number],
  orangeSoft: [255, 237, 228] as [number, number, number],
  navySoft: [236, 240, 245] as [number, number, number],
  headerBg: [52, 73, 94] as [number, number, number],
  tableHead: [52, 73, 94] as [number, number, number],
  rowAlt: [248, 250, 252] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

export type PdfKpi = {
  label: string;
  value: string;
  /** tinte de la tarjeta */
  tone?: "navy" | "orange" | "green" | "red";
};

export type PdfTablaColumna = {
  titulo: string;
  /** ancho en mm; si se omite se reparte el espacio restante */
  ancho?: number;
  alineacion?: "left" | "right" | "center";
};

export type PdfSeccion = {
  titulo: string;
  columnas: PdfTablaColumna[];
  filas: string[][];
  /** fila final destacada (ej. totales) */
  filaTotal?: string[];
};

export type ReporteModuloPdfOpts = {
  titulo: string;
  subtitulo?: string;
  desde?: string;
  hasta?: string;
  sucursalNombre?: string;
  ciudad?: string | null;
  negocio?: string;
  kpis: PdfKpi[];
  secciones: PdfSeccion[];
  nombreArchivo: string;
  /** Código del reporte archivado en servidor (ej. KN-2026-06-0001). */
  codigoOficial?: string | null;
  /** Fecha de generación del archivo en servidor (ISO). */
  generadoEnUtc?: string | null;
  /** "descargar" guarda el archivo; "abrir" lo muestra en una pestaña nueva. */
  salida?: "descargar" | "abrir";
};

async function cargarLogoDataUrl(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(LOGO_SPORT_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...size };
  } catch {
    return null;
  }
}

function formatFechaCorta(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toneColors(tone: PdfKpi["tone"]): { tint: [number, number, number]; text: [number, number, number] } {
  switch (tone) {
    case "orange": return { tint: C.orangeSoft, text: C.orange };
    case "green":  return { tint: [231, 247, 240], text: C.green };
    case "red":    return { tint: [253, 235, 235], text: C.red };
    default:       return { tint: C.navySoft, text: C.navy };
  }
}

export async function descargarReporteModuloPdf(opts: ReporteModuloPdfOpts): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await cargarLogoDataUrl();

  let pagina = 1;

  const dibujarHeader = () => {
    const headerH = logo ? 36 : 28;
    doc.setFillColor(...C.headerBg);
    doc.rect(0, 0, PAGE_W, headerH, "F");
    doc.setFillColor(...C.orange);
    doc.rect(0, headerH, PAGE_W, 1.2, "F");

    let titleX = MARGIN;
    if (logo) {
      const ratio = logo.w / logo.h;
      let h = 26;
      let w = h * ratio;
      if (w > 38) { w = 38; h = w / ratio; }
      doc.setFillColor(...C.white);
      doc.roundedRect(MARGIN - 1, 4, w + 2, h + 2, 1.5, 1.5, "F");
      doc.addImage(logo.dataUrl, "PNG", MARGIN, 5, w, h);
      titleX = MARGIN + w + 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(logo ? 12 : 13);
    doc.setTextColor(...C.white);
    doc.text(opts.titulo.toUpperCase(), titleX, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(230, 236, 245);
    doc.text(opts.subtitulo ?? "Nexus Sport · Gestión deportiva", titleX, 21);

    return headerH;
  };

  const dibujarFooter = () => {
    const footerY = PAGE_H - 12;
    doc.setDrawColor(...C.orange);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.navy);
    doc.text(`Página ${pagina} · Nexus Sport`, MARGIN, footerY);
    doc.setTextColor(...C.orange);
    doc.text("Kallpa Nexus", PAGE_W - MARGIN, footerY, { align: "right" });
  };

  const nuevaPagina = () => {
    dibujarFooter();
    doc.addPage();
    pagina += 1;
    const h = dibujarHeader();
    return h + 8;
  };

  let y = dibujarHeader() + 6;

  // ── Metadatos ──
  const col2X = MARGIN + CONTENT_W / 2 + 4;
  const metaLine = (label: string, value: string, my: number, x: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    const labelText = `${label}:`;
    doc.text(labelText, x, my);
    const labelW = doc.getTextWidth(labelText);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + labelW + 3, my);
  };

  const generado = (opts.generadoEnUtc ? new Date(opts.generadoEnUtc) : new Date()).toLocaleString(
    "es-PE",
    { dateStyle: "medium", timeStyle: "short" }
  );
  metaLine("Negocio", opts.negocio?.trim() || "—", y, MARGIN);
  metaLine("Generado", generado, y, col2X);
  y += 5.5;
  if (opts.desde && opts.hasta) {
    metaLine("Período", `${formatFechaCorta(opts.desde)} – ${formatFechaCorta(opts.hasta)}`, y, MARGIN);
  }
  if (opts.codigoOficial) {
    metaLine("Código", opts.codigoOficial, y, opts.desde && opts.hasta ? col2X : MARGIN);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("Vista en pantalla (no archivado)", opts.desde && opts.hasta ? col2X : MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.text);
  }
  y += 5.5;
  metaLine("Sucursal", opts.sucursalNombre?.trim() || "Todas", y, MARGIN);
  y += 5.5;
  if (opts.ciudad) {
    metaLine("Ciudad", opts.ciudad.trim(), y, MARGIN);
    y += 5.5;
  }
  y += 4;

  // ── KPIs ──
  if (opts.kpis.length > 0) {
    doc.setFillColor(...C.orange);
    doc.roundedRect(MARGIN, y - 1, 3, 6, 0.5, 0.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.navy);
    doc.text("Resumen", MARGIN + 5, y + 4);
    y += 8;

    const perRow = Math.min(3, opts.kpis.length);
    const cardW = (CONTENT_W - (perRow - 1) * 4) / perRow;
    const cardH = 18;
    opts.kpis.forEach((k, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = MARGIN + col * (cardW + 4);
      const cy = y + row * (cardH + 4);
      const { tint, text } = toneColors(k.tone);
      doc.setFillColor(...tint);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, cy, cardW, cardH, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(k.label, x + 4, cy + 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...text);
      doc.text(k.value, x + 4, cy + 14);
    });
    const rows = Math.ceil(opts.kpis.length / perRow);
    y += rows * (18 + 4) + 6;
  }

  // ── Secciones de tabla ──
  const rowH = 7;
  const headH = 8;
  const maxY = PAGE_H - 22;

  for (const sec of opts.secciones) {
    if (y + headH + rowH * 2 > maxY) y = nuevaPagina();

    doc.setFillColor(...C.orange);
    doc.roundedRect(MARGIN, y - 1, 3, 6, 0.5, 0.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.navy);
    doc.text(sec.titulo, MARGIN + 5, y + 4);
    y += 8;

    // Calcular anchos
    const fijos = sec.columnas.reduce((s, c) => s + (c.ancho ?? 0), 0);
    const flexibles = sec.columnas.filter((c) => !c.ancho).length;
    const anchoFlex = flexibles > 0 ? (CONTENT_W - fijos) / flexibles : 0;
    const anchos = sec.columnas.map((c) => c.ancho ?? anchoFlex);

    const dibujarHead = () => {
      doc.setFillColor(...C.tableHead);
      doc.rect(MARGIN, y, CONTENT_W, headH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      let cx = MARGIN;
      sec.columnas.forEach((c, i) => {
        const align = c.alineacion ?? "left";
        const tx = align === "right" ? cx + anchos[i] - 3 : align === "center" ? cx + anchos[i] / 2 : cx + 3;
        doc.text(c.titulo, tx, y + 5.5, { align });
        cx += anchos[i];
      });
      y += headH;
    };

    dibujarHead();

    const pintarFila = (fila: string[], idx: number, esTotal = false) => {
      if (y + rowH > maxY) {
        y = nuevaPagina();
        dibujarHead();
      }
      if (esTotal) {
        doc.setFillColor(241, 245, 249);
        doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
        doc.setFont("helvetica", "bold");
      } else {
        if (idx % 2 === 1) {
          doc.setFillColor(...C.rowAlt);
          doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
        }
        doc.setFont("helvetica", "normal");
      }
      doc.setFontSize(8);
      doc.setTextColor(...C.text);
      let cx = MARGIN;
      fila.forEach((celda, i) => {
        const col = sec.columnas[i];
        const align = col?.alineacion ?? "left";
        const w = anchos[i] ?? 20;
        let texto = celda;
        const maxChars = Math.floor(w / 1.7);
        if (texto.length > maxChars) texto = `${texto.slice(0, maxChars - 1)}…`;
        const tx = align === "right" ? cx + w - 3 : align === "center" ? cx + w / 2 : cx + 3;
        doc.text(texto, tx, y + 5, { align });
        cx += w;
      });
      y += rowH;
    };

    if (sec.filas.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text("Sin datos en el período.", MARGIN + 3, y + 5);
      y += rowH;
    } else {
      sec.filas.forEach((f, i) => pintarFila(f, i));
      if (sec.filaTotal) pintarFila(sec.filaTotal, 0, true);
    }
    y += 6;
  }

  dibujarFooter();

  if (opts.salida === "abrir") {
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  } else {
    doc.save(`${opts.nombreArchivo}.pdf`);
  }
}
