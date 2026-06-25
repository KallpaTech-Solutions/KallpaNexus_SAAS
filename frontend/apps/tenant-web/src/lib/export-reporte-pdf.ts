import { formatMoneyPEN } from "@kallpanexus/shared";
import type { ReporteFinanciero } from "@kallpanexus/types";
import type { jsPDF } from "jspdf";

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Marca Nexus Sport (logo LOGO-NEXUS-SPORTS.png) */
const LOGO_SPORT_URL = "/brand/Sports/LOGO-NEXUS-SPORTS.png";

const C = {
  navy: [52, 73, 94] as [number, number, number],
  orange: [240, 90, 40] as [number, number, number],
  orangeSoft: [255, 237, 228] as [number, number, number],
  navySoft: [236, 240, 245] as [number, number, number],
  slate: [100, 116, 139] as [number, number, number],
  headerBg: [52, 73, 94] as [number, number, number],
  tableHead: [52, 73, 94] as [number, number, number],
  rowAlt: [248, 250, 252] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

async function cargarLogoSportDataUrl(): Promise<{ dataUrl: string; w: number; h: number } | null> {
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

function dibujarLogoSportEnPdf(
  doc: jsPDF,
  logo: { dataUrl: string; w: number; h: number },
  x: number,
  y: number,
  maxH: number,
  maxW: number
): number {
  const ratio = logo.w / logo.h;
  let h = maxH;
  let w = h * ratio;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  doc.setFillColor(...C.white);
  doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 1.5, 1.5, "F");
  doc.addImage(logo.dataUrl, "PNG", x, y, w, h);
  return w;
}

function formatFechaCorta(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type IconoKpi = "calendario" | "monedas" | "billete" | "reloj" | "tarjeta" | "cobro";

function dibujarIconoKpi(
  doc: jsPDF,
  tipo: IconoKpi,
  cx: number,
  cy: number,
  color: [number, number, number]
) {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  const r = 3.2;
  doc.circle(cx, cy, r, "S");
  doc.setFontSize(7);
  doc.setTextColor(...color);
  const glyph =
    tipo === "calendario"
      ? "31"
      : tipo === "monedas"
        ? "S/"
        : tipo === "billete"
          ? "$"
          : tipo === "reloj"
            ? "h"
            : tipo === "tarjeta"
              ? "#"
              : "8";
  doc.text(glyph, cx - 1.4, cy + 1.2, { align: "left" });
}

function tarjetaKpi(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  tint: [number, number, number],
  icon: IconoKpi,
  iconColor: [number, number, number],
  etiqueta: string,
  valor: string
) {
  doc.setFillColor(tint[0], tint[1], tint[2]);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  dibujarIconoKpi(doc, icon, x + 7, y + h / 2, iconColor);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(etiqueta, x + 14, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.text(valor, x + 14, y + 14);
}

function dibujarGraficoBarras(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  filas: { etiqueta: string; monto: number; color: [number, number, number] }[]
) {
  const max = Math.max(...filas.map((f) => f.monto), 1);
  const chartH = h - 14;
  const barW = Math.min(22, (w - 16) / Math.max(filas.length, 1) - 6);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  for (let i = 0; i <= 4; i++) {
    const gy = y + 4 + (chartH * i) / 4;
    doc.line(x + 4, gy, x + w - 4, gy);
  }

  const baseY = y + 4 + chartH;
  filas.forEach((f, i) => {
    const barH = (f.monto / max) * (chartH - 4);
    const bx = x + 8 + i * (barW + 10);
    doc.setFillColor(...f.color);
    doc.roundedRect(bx, baseY - barH, barW, barH, 1, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    const lab = f.etiqueta.length > 12 ? `${f.etiqueta.slice(0, 11)}…` : f.etiqueta;
    doc.text(lab, bx + barW / 2, baseY + 5, { align: "center" });
  });
}

export async function descargarReporteFinancieroPdf(
  data: ReporteFinanciero,
  opts: {
    desde: string;
    hasta: string;
    sucursalNombre?: string;
    ciudad?: string | null;
    negocio?: string;
    /** Solo reportes archivados en servidor (KN-2026-06-0001). Vista previa / descarga sin guardar: omitir. */
    codigoOficial?: string | null;
    generadoEnUtc?: string | null;
    /** "descargar" guarda el archivo; "abrir" lo muestra en una pestaña nueva. */
    salida?: "descargar" | "abrir";
  }
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await cargarLogoSportDataUrl();

  const headerH = logo ? 36 : 28;
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, PAGE_W, headerH, "F");
  doc.setFillColor(...C.orange);
  doc.rect(0, headerH, PAGE_W, 1.2, "F");

  const logoY = 5;
  let titleX = MARGIN;
  if (logo) {
    const logoW = dibujarLogoSportEnPdf(doc, logo, MARGIN, logoY, 26, 38);
    titleX = MARGIN + logoW + 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(logo ? 12 : 13);
  doc.setTextColor(...C.white);
  doc.text("REPORTE FINANCIERO", titleX, logoY + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 236, 245);
  doc.text("Nexus Sport · Gestión de reservas y caja", titleX, logoY + 16);

  let y = headerH + 6;
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

  const periodo = `${formatFechaCorta(opts.desde)} – ${formatFechaCorta(opts.hasta)}`;
  const generado = opts.generadoEnUtc
    ? new Date(opts.generadoEnUtc).toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  metaLine("Negocio", opts.negocio?.trim() || "—", y, MARGIN);
  metaLine("Generado", generado, y, col2X);
  y += 5.5;
  metaLine("Período", periodo, y, MARGIN);
  if (opts.codigoOficial) {
    metaLine("Código", opts.codigoOficial, y, col2X);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("Vista en pantalla (no archivado)", col2X, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.text);
  }
  y += 5.5;
  metaLine("Sucursal", opts.sucursalNombre?.trim() || "Todas", y, MARGIN);
  y += 5.5;
  metaLine("Ciudad", opts.ciudad?.trim() || "—", y, MARGIN);
  y += 10;

  doc.setFillColor(...C.orange);
  doc.roundedRect(MARGIN, y - 1, 3, 6, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.navy);
  doc.text("Resumen", MARGIN + 5, y + 4);
  y += 8;

  const cardW = (CONTENT_W - 8) / 3;
  const cardH = 18;
  const gap = 4;
  const kpis: {
    tint: [number, number, number];
    icon: "calendario" | "monedas" | "billete" | "reloj" | "tarjeta" | "cobro";
    color: [number, number, number];
    label: string;
    value: string;
  }[] = [
    {
      tint: C.navySoft,
      icon: "calendario",
      color: C.navy,
      label: "Reservas activas:",
      value: String(data.reservasActivas),
    },
    {
      tint: C.orangeSoft,
      icon: "monedas",
      color: C.orange,
      label: "Monto total reservas:",
      value: formatMoneyPEN(data.totalMontoReservas),
    },
    {
      tint: C.orangeSoft,
      icon: "billete",
      color: C.orange,
      label: "Cobrado confirmado:",
      value: formatMoneyPEN(data.totalCobradoConfirmado),
    },
    {
      tint: C.navySoft,
      icon: "reloj",
      color: C.navy,
      label: "Pendiente estimado:",
      value: formatMoneyPEN(data.pendienteCobroEstimado),
    },
    {
      tint: C.navySoft,
      icon: "tarjeta",
      color: C.navy,
      label: "Pagos confirmados:",
      value: String(data.pagosConfirmados),
    },
    {
      tint: C.orangeSoft,
      icon: "cobro",
      color: C.orange,
      label: "Reservas con cobro:",
      value: String(data.reservasConAlMenosUnPago),
    },
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const k = kpis[row * 3 + col];
      const x = MARGIN + col * (cardW + gap);
      const cy = y + row * (cardH + gap);
      tarjetaKpi(doc, x, cy, cardW, cardH, k.tint, k.icon, k.color, k.label, k.value);
    }
  }
  y += 2 * (cardH + gap) + 8;

  doc.setFillColor(...C.orange);
  doc.roundedRect(MARGIN, y - 1, 3, 6, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.navy);
  doc.text("Por medio de pago", MARGIN + 5, y + 4);
  y += 8;

  const medios = data.porMedio ?? [];
  const totalMonto = medios.reduce((a, m) => a + m.monto, 0);
  const tableX = MARGIN;
  const tableW = 118;
  const chartX = tableX + tableW + 6;
  const chartW = CONTENT_W - tableW - 6;
  const rowH = 7;
  const headH = 8;

  doc.setFillColor(...C.tableHead);
  doc.rect(tableX, y, tableW, headH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Medio", tableX + 3, y + 5.5);
  doc.text("Ops", tableX + 62, y + 5.5);
  doc.text("Monto", tableX + 78, y + 5.5);
  doc.text("% Total", tableX + 98, y + 5.5);

  let ty = y + headH;
  const barColors: [number, number, number][] = [C.orange, C.navy, C.orange, C.navy];
  const barData: { etiqueta: string; monto: number; color: [number, number, number] }[] = [];

  if (medios.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("Sin pagos confirmados en el período.", tableX + 3, ty + 5);
    ty += rowH;
  } else {
    medios.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...C.rowAlt);
        doc.rect(tableX, ty, tableW, rowH, "F");
      }
      const pct = totalMonto > 0 ? (row.monto / totalMonto) * 100 : 0;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.text);
      const medioTxt = row.medio.length > 28 ? `${row.medio.slice(0, 27)}…` : row.medio;
      doc.text(medioTxt, tableX + 3, ty + 5);
      doc.text(String(row.cantidad), tableX + 64, ty + 5);
      doc.text(formatMoneyPEN(row.monto), tableX + 78, ty + 5);
      doc.text(`${pct.toFixed(1)}%`, tableX + 100, ty + 5);
      barData.push({
        etiqueta: row.medio,
        monto: row.monto,
        color: barColors[idx % barColors.length],
      });
      ty += rowH;
    });

    doc.setFillColor(241, 245, 249);
    doc.rect(tableX, ty, tableW, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Total", tableX + 3, ty + 5);
    doc.text(String(medios.reduce((a, m) => a + m.cantidad, 0)), tableX + 64, ty + 5);
    doc.text(formatMoneyPEN(totalMonto), tableX + 78, ty + 5);
    doc.text("100%", tableX + 100, ty + 5);
    ty += rowH;
  }

  const chartH = Math.max(ty - y, 42);
  dibujarGraficoBarras(doc, chartX, y, chartW, chartH, barData);

  const footerY = 285;
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.navy);
  doc.text("Página 1 de 1 · Nexus Sport", MARGIN, footerY);
  doc.setTextColor(...C.orange);
  doc.text("Kallpa Nexus", PAGE_W - MARGIN, footerY, { align: "right" });

  const slug = `${opts.desde}_${opts.hasta}`.replace(/[^\d-]/g, "");
  if (opts.salida === "abrir") {
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  } else {
    doc.save(`reporte-financiero-${slug}.pdf`);
  }
}
