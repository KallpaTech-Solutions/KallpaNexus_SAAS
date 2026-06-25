/** Superficies del panel en tema claro (fondo blanco / gris muy suave). */
export const panel = {
  card: "rounded-xl border border-slate-200 bg-white shadow-sm",
  cardMuted: "rounded-xl border border-slate-200 bg-slate-50",
  cardAccent: "rounded-xl border border-sport-orange/25 bg-orange-50/50 shadow-sm",
  input:
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sport-orange/50 focus:outline-none focus:ring-2 focus:ring-sport-orange/15",
  heading: "text-2xl font-semibold text-slate-900",
  subheading: "text-sm text-slate-600",
  sectionTitle: "text-sm font-semibold text-sport-navy",
  tableWrap: "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm",
  tableHead: "bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600",
  tableRow: "border-t border-slate-100 even:bg-slate-50/80",
  btnPrimary:
    "rounded-lg bg-sport-green px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sport-green/90 disabled:opacity-50",
  btnSecondary:
    "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:border-sport-orange/40",
  infoBox: "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600",
  linkEdit: "text-sport-green hover:underline",
  linkDanger: "text-red-600 hover:underline",
} as const;
