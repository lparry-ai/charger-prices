"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { formatMoney, freshness } from "@/lib/format";
import type { StationSummary } from "@/lib/stations";

export type MapView = {
  bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  center: { lat: number; lng: number };
  zoom: number;
};

type Props = {
  initialCenter: [number, number];
  initialZoom: number;
  stations: StationSummary[];
  selectedId: number | null;
  flyTo: { lat: number; lng: number; zoom?: number; key: number } | null;
  onViewChange: (view: MapView) => void;
  onSelect: (id: number) => void;
};

function pinLabel(s: StationSummary) {
  if (s.is_free) return "Free";
  if (s.cheapest_kwh != null) return formatMoney(s.cheapest_kwh);
  return "?";
}

function pinIcon(s: StationSummary, selected: boolean) {
  const fresh = s.cheapest_kwh != null || s.is_free ? freshness(s.price_seen_at) : "none";
  const bolt = s.has_dc ? "⚡" : "";
  return L.divIcon({
    className: "price-pin-wrap",
    html: `<span class="price-pin" data-freshness="${fresh}" data-selected="${selected}">${bolt}${pinLabel(s)}</span>`,
    iconSize: [0, 0],
  });
}

function ViewEvents({ onViewChange }: { onViewChange: Props["onViewChange"] }) {
  const map = useMapEvents({
    moveend: () => report(),
  });

  function report() {
    const b = map.getBounds();
    const c = map.getCenter();
    onViewChange({
      bounds: {
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      },
      center: { lat: c.lat, lng: c.lng },
      zoom: map.getZoom(),
    });
  }

  useEffect(() => {
    report();
    // Report the starting view once; later moves come through moveend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function FlyTo({ target }: { target: Props["flyTo"] }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 13));
  }, [map, target]);
  return null;
}

export default function StationMap({
  initialCenter,
  initialZoom,
  stations,
  selectedId,
  flyTo,
  onViewChange,
  onSelect,
}: Props) {
  const markers = useMemo(
    () =>
      stations
        .filter((s) => s.lat != null && s.lng != null)
        .map((s) => (
          <Marker
            key={s.id}
            position={[s.lat!, s.lng!]}
            icon={pinIcon(s, s.id === selectedId)}
            zIndexOffset={s.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(s.id!) }}
            title={s.name ?? undefined}
          />
        )),
    [stations, selectedId, onSelect],
  );

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      minZoom={4}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ViewEvents onViewChange={onViewChange} />
      <FlyTo target={flyTo} />
      {markers}
    </MapContainer>
  );
}
