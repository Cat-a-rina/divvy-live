"use client";

import { FavoriteButton } from "@/components/favorite-button";
import type { Station } from "@/lib/divvy/types";
import { Bike, CloudOff, Scooter, SquareParking, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

export function StationBrowser({
  initialStations,
  favoriteStationIds,
}: {
  initialStations: Station[];
  favoriteStationIds: string[];
}) {
  const [stations, setStations] = useState(initialStations);
  const [query, setQuery] = useState("");
  const [pollFailing, setPollFailing] = useState(false);
  const favoriteSet = useMemo(
    () => new Set(favoriteStationIds),
    [favoriteStationIds],
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/stations");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = (await res.json()) as { stations: Station[] };
        setStations(body.stations);
        setPollFailing(false);
      } catch {
        // Keep showing the last known data, but let the user know it may be stale.
        setPollFailing(true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const filteredStations = useMemo(() => {
    if (!query.trim()) return stations;
    const q = query.toLowerCase();
    return stations.filter((station) => station.name.toLowerCase().includes(q));
  }, [stations, query]);

  const limitedStations = filteredStations.slice(0, 50);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="station-search" className="sr-only">
          Search stations by name
        </label>
        <input
          id="station-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stations by name…"
          className="w-full rounded border border-divvy-blue/30 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-divvy-blue"
        />
      </div>

      {pollFailing && (
        <div
          role="status"
          className="flex items-center gap-2 rounded border border-divvy-amber/30 bg-divvy-amber-light px-3 py-2 text-xs text-divvy-amber"
        >
          <CloudOff aria-hidden="true" size={14} />
          Live updates paused — having trouble reaching Divvy. Showing the
          last data we have.
        </div>
      )}

      {stations.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#0a1f3d]/60">
          No station data available right now.
        </p>
      ) : limitedStations.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#0a1f3d]/60">
          No stations match &quot;{query}&quot;.
        </p>
      ) : (
        <ul className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto">
          {limitedStations.map((station) => (
            <li
              key={station.stationId}
              className="rounded border border-divvy-blue/15 bg-white p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{station.name}</span>
                <FavoriteButton
                  stationId={station.stationId}
                  stationName={station.name}
                  isFavorited={favoriteSet.has(station.stationId)}
                />
              </div>
              {station.isRenting ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5">
                    <Bike
                      aria-hidden="true"
                      size={18}
                      className="text-divvy-blue"
                    />
                    <span className="text-lg font-bold text-divvy-blue">
                      {Math.max(
                        station.bikesAvailable - station.ebikesAvailable,
                        0,
                      )}
                    </span>
                    <span className="text-xs text-[#0a1f3d]/50">bikes</span>
                  </span>
                  {station.ebikesAvailable > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Zap
                        aria-hidden="true"
                        size={18}
                        className="text-divvy-amber"
                      />
                      <span className="text-lg font-bold text-divvy-amber">
                        {station.ebikesAvailable}
                      </span>
                      <span className="text-xs text-[#0a1f3d]/50">e-bikes</span>
                    </span>
                  )}
                  {station.scootersAvailable > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Scooter
                        aria-hidden="true"
                        size={18}
                        className="text-divvy-amber"
                      />
                      <span className="text-lg font-bold text-divvy-amber">
                        {station.scootersAvailable}
                      </span>
                      <span className="text-xs text-[#0a1f3d]/50">scooters</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <SquareParking
                      aria-hidden="true"
                      size={18}
                      className="text-divvy-green"
                    />
                    <span className="text-lg font-bold text-divvy-green">
                      {station.docksAvailable}
                    </span>
                    <span className="text-xs text-[#0a1f3d]/50">docks</span>
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-[#0a1f3d]/60">
                  Not currently renting
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
