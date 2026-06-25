"use client";

import {
  esEnlaceGoogleMapsValido,
  esEnlaceGoogleMapsCorto,
  googleMapsPinFromEnlace,
  parseGoogleMapsShareLink,
} from "@/lib/google-maps-link";
import { MapPin } from "lucide-react";
import { useState } from "react";

export type SucursalUbicacionForm = {
  direccion: string;
  ciudad: string;
  enlaceGoogleMaps: string;
  latitud: number | null;
  longitud: number | null;
};

type Props = {
  value: SucursalUbicacionForm;
  onChange: (patch: Partial<SucursalUbicacionForm>) => void;
};

export function SucursalEnlaceMaps({ value, onChange }: Props) {
  const [aviso, setAviso] = useState<string | null>(null);

  function alPegarEnlace(raw: string) {
    const parsed = parseGoogleMapsShareLink(raw);
    const pin = googleMapsPinFromEnlace(raw);
    const patch: Partial<SucursalUbicacionForm> = { enlaceGoogleMaps: raw };

    if (pin.lat != null && pin.lng != null) {
      patch.latitud = pin.lat;
      patch.longitud = pin.lng;
      setAviso("Pin del negocio detectado en el enlace (no la vista del mapa).");
    } else if (parsed.placeQuery) {
      patch.latitud = null;
      patch.longitud = null;
      setAviso(
        `Lugar: «${parsed.placeQuery}». El mapa público usará ese nombre; «Cómo llegar» abrirá tu enlace.`
      );
    } else if (raw.trim() && esEnlaceGoogleMapsValido(raw)) {
      if (esEnlaceGoogleMapsCorto(raw)) {
        setAviso(
          "Enlace corto guardado. Para vista previa exacta, copia también el enlace largo (google.com/maps/place/…) si puedes."
        );
      } else {
        setAviso("Enlace guardado. Los clientes abrirán Google Maps con GPS.");
      }
    } else {
      setAviso(null);
    }
    onChange(patch);
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MapPin className="h-4 w-4 text-emerald-600" />
        Ubicación en Google Maps
      </p>

      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">Cómo obtener el enlace</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Abre Google Maps y entra a la ficha de tu negocio (ej. GRASS SINTETICO JEFFTARO).</li>
          <li>Pulsa <span className="font-medium">Compartir</span> → <span className="font-medium">Copiar enlace</span>.</li>
          <li>Pégalo abajo. Puede cambiar el texto del enlace; lo importante es que sea de ese negocio.</li>
          <li>
            Si puedes, usa el enlace largo con <span className="font-medium">google.com/maps/place/Nombre/…</span>{" "}
            (el mapa en la web coincide mejor).
          </li>
        </ol>
        <p className="mt-2 text-slate-500">
          En <span className="font-medium">Dirección</span> escribe lo que verá el cliente (calle, mz, lote). El enlace
          es para GPS y el mapa embebido.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">
          Enlace de compartir de Google Maps
        </label>
        <input
          type="url"
          className="mt-1 w-full panel-input text-sm"
          placeholder="https://maps.app.goo.gl/... o https://www.google.com/maps/place/..."
          value={value.enlaceGoogleMaps}
          onChange={(e) => alPegarEnlace(e.target.value)}
        />
        {aviso && <p className="mt-1.5 text-xs text-emerald-700">{aviso}</p>}
        {value.enlaceGoogleMaps.trim() && !esEnlaceGoogleMapsValido(value.enlaceGoogleMaps) && (
          <p className="mt-1.5 text-xs text-amber-800">
            Debe ser un enlace de Google Maps (google.com/maps, maps.app.goo.gl o goo.gl/maps).
          </p>
        )}
      </div>

      {value.latitud != null && value.longitud != null && (
        <p className="text-[11px] text-slate-400">
          Pin del enlace (vista web): {value.latitud.toFixed(5)}, {value.longitud.toFixed(5)}
        </p>
      )}
    </div>
  );
}
