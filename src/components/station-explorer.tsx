"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  connectorLabels,
  formatAge,
  formatMoney,
  formatPower,
  freshness,
} from "@/lib/format";
import { distanceKm, formatDistance, type StationSummary } from "@/lib/stations";
import type { MapView } from "./station-map";

const StationMap = dynamic(() => import("./station-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-border/40" />,
});

// Sydney CBD until the user shares their location or moves the map.
const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093];
const DEFAULT_ZOOM = 12;
const MIN_ZOOM_FOR_PINS = 9;
const VIEW_STORAGE_KEY = "chargerprices:view";

type Filter = "all" | "dc" | "ccs2" | "chademo" | "type2";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dc", label: "Fast (DC)" },
  { id: "ccs2", label: "CCS2" },
  { id: "chademo", label: "CHAdeMO" },
  { id: "type2", label: "Type 2" },
];

function readSavedView(): { center: [number, number]; zoom: number } | null {
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (Array.isArray(v.center) && typeof v.zoom === "number") return v;
  } catch {
    // Storage can be unavailable; the default view is fine.
  }
  return null;
}

export function StationExplorer() {
  const supabase = useMemo(() => createClient(), []);
  const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [view, setView] = useState<MapView | null>(null);
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const requestId = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Read after mount so server and client render the same markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialView(readSavedView() ?? { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  }, []);

  const onViewChange = useCallback((v: MapView) => {
    setView(v);
    try {
      localStorage.setItem(
        VIEW_STORAGE_KEY,
        JSON.stringify({ center: [v.center.lat, v.center.lng], zoom: v.zoom }),
      );
    } catch {
      // Ignore storage failures.
    }
  }, []);

  useEffect(() => {
    if (!view || view.zoom < MIN_ZOOM_FOR_PINS) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("stations_in_bbox", {
        min_lat: view.bounds.minLat,
        min_lng: view.bounds.minLng,
        max_lat: view.bounds.maxLat,
        max_lng: view.bounds.maxLng,
      });
      if (id !== requestId.current) return;
      setLoading(false);
      if (error) {
        setError("Couldn't load chargers. Try moving the map again.");
        return;
      }
      setError(null);
      setStations(data ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [supabase, view]);

  const visible = useMemo(() => {
    const origin = userLocation ?? view?.center;
    return stations
      .filter((s) => {
        if (filter === "all") return true;
        if (filter === "dc") return s.has_dc;
        return s.connector_types?.includes(filter);
      })
      .map((s) => ({
        station: s,
        distance: origin && s.lat != null && s.lng != null ? distanceKm(origin, { lat: s.lat, lng: s.lng }) : null,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [stations, filter, userLocation, view]);

  const onSelect = useCallback((id: number) => {
    setSelectedId(id);
    listRef.current
      ?.querySelector(`[data-station-id="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function locate() {
    if (!navigator.geolocation) {
      setError("Your browser can't share your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(here);
        setFlyTo({ ...here, zoom: 13, key: Date.now() });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. You can still move the map.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  const zoomedOut = view != null && view.zoom < MIN_ZOOM_FOR_PINS;

  return (
    <div className="flex flex-1 flex-col md:grid md:h-[calc(100dvh-3.5rem)] md:grid-cols-[minmax(0,1fr)_400px]">
      <div className="relative h-[55dvh] md:h-auto">
        {initialView && (
          <StationMap
            initialCenter={initialView.center}
            initialZoom={initialView.zoom}
            stations={zoomedOut ? [] : visible.map((v) => v.station)}
            selectedId={selectedId}
            flyTo={flyTo}
            onViewChange={onViewChange}
            onSelect={onSelect}
          />
        )}
        <div className="absolute inset-x-0 top-0 z-[500] flex gap-1.5 overflow-x-auto p-3 [scrollbar-width:none]">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition ${
                filter === f.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-foreground hover:border-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute right-3 bottom-8 z-[500] rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-md hover:border-muted disabled:opacity-60"
        >
          {locating ? "Locating…" : "◎ Near me"}
        </button>
        {zoomedOut && (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-[500] flex justify-center">
            <p className="rounded-full bg-foreground px-4 py-2 text-sm text-background shadow">
              Zoom in to see chargers
            </p>
          </div>
        )}
      </div>

      <section className="flex min-h-0 flex-col border-t border-border bg-surface md:border-t-0 md:border-l">
        <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {zoomedOut ? "Chargers" : `${visible.length} charger${visible.length === 1 ? "" : "s"} here`}
          </h1>
          <span className="text-xs text-muted">{loading ? "Updating…" : "Cheapest casual price"}</span>
        </div>
        {error && <p className="mx-4 mb-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <ul ref={listRef} className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {!zoomedOut && !loading && visible.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">
              No chargers in this area yet. Try moving the map.
            </li>
          )}
          {!zoomedOut &&
            visible.map(({ station: s, distance }) => (
              <li key={s.id} data-station-id={s.id}>
                <Link
                  href={`/stations/${s.id}`}
                  onMouseEnter={() => setSelectedId(s.id)}
                  className={`flex items-start gap-3 px-4 py-3 transition hover:bg-accent-soft/60 ${
                    selectedId === s.id ? "bg-accent-soft/60" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-sm text-muted">
                      {[s.operator_name, s.suburb].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {[
                        s.max_power_kw != null ? `Up to ${formatPower(s.max_power_kw)}` : null,
                        s.connector_types?.map((c) => connectorLabels[c]).join(", "),
                        distance != null ? formatDistance(distance) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <PriceBadge station={s} />
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function PriceBadge({ station: s }: { station: StationSummary }) {
  if (s.cheapest_kwh == null && !s.is_free) {
    return <span className="shrink-0 rounded-lg bg-background px-2.5 py-1.5 text-sm text-muted">No price</span>;
  }
  const fresh = freshness(s.price_seen_at);
  const tone =
    fresh === "fresh"
      ? "bg-accent-soft text-accent-strong"
      : fresh === "aging"
        ? "bg-warn-soft text-warn"
        : "bg-background text-muted";
  return (
    <span className={`shrink-0 rounded-lg px-2.5 py-1.5 text-right ${tone}`}>
      <span className="block text-base leading-tight font-semibold">
        {s.is_free ? "Free" : `${formatMoney(s.cheapest_kwh)}/kWh`}
      </span>
      <span className="block text-[11px] opacity-80">{formatAge(s.price_seen_at)}</span>
    </span>
  );
}
