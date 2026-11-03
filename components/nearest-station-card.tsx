"use client";

import { FavoriteButton } from "@/components/favorite-button";
import { distanceMeters } from "@/lib/divvy/distance";
import type { Station } from "@/lib/divvy/types";
import { Bike, Scooter, SquareParking, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// Matches Divvy's own feed TTL (60s) via a short cache on the server; poll at
// the same cadence client-side so bike/dock counts shown here stay live
// without requiring a full page reload.
const POLL_INTERVAL_MS = 30_000;

export function NearestStationCard({
  stations: initialStations,
  favoriteStationIds,
}: {
  stations: Station[];
  favoriteStationIds: string[];
}) {
  const [stations, setStations] = useState(initialStations);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const favoriteSet = useMemo(
    () => new Set(favoriteStationIds),
    [favoriteStationIds],
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/stations");
        if (!res.ok) return;
        const body = (await res.json()) as { stations: Station[] };
        setStations(body.stations);
      } catch {
        // keep showing the last known data if a poll fails
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      queueMicrotask(() =>
        setLocationError("Geolocation isn't supported by this browser."),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => setLocationError("Location access was denied."),
    );
  }, []);

  const nearest = useMemo(() => {
    if (!coords || stations.length === 0) return null;
    return stations.reduce<{ station: Station; distance: number } | null>(
      (closest, station) => {
        const distance = distanceMeters(coords, station);
        if (!closest || distance < closest.distance) {
          return { station, distance };
        }
        return closest;
      },
      null,
    );
  }, [coords, stations]);

  return (
    <section className="rounded-lg border border-divvy-blue/20 bg-white p-5 shadow-sm">
      <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-divvy-blue">
        Nearest station
      </h2>

      <div aria-live="polite">
        {!coords && !locationError && (
          <p className="mt-2 text-sm text-[#0a1f3d]/60">
            Finding your location…
          </p>
        )}
        {locationError && (
          <p className="mt-2 text-sm text-[#0a1f3d]/60">{locationError}</p>
        )}
        {coords && stations.length === 0 && (
          <p className="mt-2 text-sm text-[#0a1f3d]/60">
            No station data available right now.
          </p>
        )}
      </div>

      {nearest && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{nearest.station.name}</p>
              <p className="text-sm text-[#0a1f3d]/60">
                {(nearest.distance / 1000).toFixed(2)} km away
              </p>
            </div>
            <FavoriteButton
              stationId={nearest.station.stationId}
              stationName={nearest.station.name}
              isFavorited={favoriteSet.has(nearest.station.stationId)}
            />
          </div>

          {nearest.station.isRenting ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1 rounded-lg bg-divvy-blue-light py-5">
                  <Bike
                    aria-hidden="true"
                    size={32}
                    className="text-divvy-blue"
                  />
                  <span className="font-heading text-5xl font-bold leading-none text-divvy-blue">
                    {nearest.station.bikesAvailable}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#0a1f3d]/60">
                    Bikes available
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-divvy-green-light py-5">
                  <SquareParking
                    aria-hidden="true"
                    size={32}
                    className="text-divvy-green"
                  />
                  <span className="font-heading text-5xl font-bold leading-none text-divvy-green">
                    {nearest.station.docksAvailable}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#0a1f3d]/60">
                    Docks open
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-sm text-[#0a1f3d]/70">
                <span className="flex items-center gap-1">
                  <Zap aria-hidden="true" size={14} className="text-divvy-amber" />
                  {nearest.station.ebikesAvailable} e-bike
                  {nearest.station.ebikesAvailable === 1 ? "" : "s"}
                </span>
                <span aria-hidden="true">|</span>
                <span className="flex items-center gap-1">
                  <Bike aria-hidden="true" size={14} className="text-divvy-blue" />
                  {Math.max(
                    nearest.station.bikesAvailable - nearest.station.ebikesAvailable,
                    0,
                  )}{" "}
                  classic
                </span>
                <span aria-hidden="true">|</span>
                <span className="flex items-center gap-1">
                  <Scooter
                    aria-hidden="true"
                    size={14}
                    className="text-divvy-amber"
                  />
                  {nearest.station.scootersAvailable} scooter
                  {nearest.station.scootersAvailable === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#0a1f3d]/60">Not currently renting</p>
          )}

          <Link
            href={`/routes?from=${encodeURIComponent(nearest.station.stationId)}`}
            className="self-start font-heading text-sm font-semibold uppercase tracking-wide text-divvy-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-divvy-blue"
          >
            Plan a route from here →
          </Link>
        </div>
      )}
    </section>
  );
}
