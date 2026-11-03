"use client";

import { followStation, unfollowStation } from "@/app/actions/follows";
import { saveRoute } from "@/app/actions/routes";
import { LiveStationMap } from "@/components/live-station-map";
import { distanceMeters } from "@/lib/divvy/distance";
import { useFollowedStationIds } from "@/lib/supabase/useFollowedStationIds";
import { useLiveStations } from "@/lib/supabase/useLiveStations";
import { useWorkerFreshness } from "@/lib/supabase/useWorkerFreshness";
import { useAuth } from "@clerk/nextjs";
import {
  Bike,
  Heart,
  LocateFixed,
  Map as MapIcon,
  Scooter,
  SquareParking,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const FRESHNESS_LABEL: Record<string, string> = {
  loading: "Loading live data…",
  fresh: "Live",
  stale: "Data may be out of date",
  down: "Live updates are currently unavailable",
};

const FRESHNESS_DOT: Record<string, string> = {
  loading: "bg-[#0a1f3d]/30",
  fresh: "bg-divvy-green",
  stale: "bg-divvy-amber",
  down: "bg-red-500",
};

export function LiveNearestStation() {
  const { isSignedIn } = useAuth();
  const { stations, loading: stationsLoading, lastUpdate, activityLog } = useLiveStations();
  const { state: freshness } = useWorkerFreshness();
  const followedIds = useFollowedStationIds();

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [isFollowPending, startFollowTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const autoOriginSet = useRef(false);

  // Briefly highlight whichever dot just changed, so a real-time update is
  // something you can actually see happen, not just infer from a number.
  useEffect(() => {
    if (!lastUpdate) return;
    setFlashId(lastUpdate.stationId);
    const timer = setTimeout(() => setFlashId(null), 1200);
    return () => clearTimeout(timer);
  }, [lastUpdate]);

  // Re-render once a second so "N seconds ago" below stays accurate.
  useEffect(() => {
    if (!lastUpdate) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  function findMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported by this browser.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setLocationError("Location access was denied.");
        setIsLocating(false);
      },
    );
  }

  const nearest = useMemo(() => {
    if (!coords || stations.length === 0) return null;
    return stations.reduce<{ station: (typeof stations)[number]; distance: number } | null>(
      (closest, station) => {
        const distance = distanceMeters(coords, station);
        if (!closest || distance < closest.distance) return { station, distance };
        return closest;
      },
      null,
    );
  }, [coords, stations]);

  // Auto-fill the origin from geolocation once, the first time it resolves —
  // but never overwrite a station the person picked for themselves after that.
  useEffect(() => {
    if (nearest && !autoOriginSet.current && !originId) {
      setOriginId(nearest.station.stationId);
      autoOriginSet.current = true;
    }
  }, [nearest, originId]);

  const originStation = stations.find((s) => s.stationId === originId) ?? null;
  const distanceToOrigin =
    coords && originStation ? distanceMeters(coords, originStation) : null;

  const originOptions = useMemo(() => {
    const sorted = [...stations];
    if (coords) {
      sorted.sort((a, b) => distanceMeters(coords, a) - distanceMeters(coords, b));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [stations, coords]);

  const destinationOptions = useMemo(() => {
    const candidates = stations.filter((s) => s.stationId !== originId);
    if (originStation) {
      candidates.sort(
        (a, b) => distanceMeters(originStation, a) - distanceMeters(originStation, b),
      );
    } else {
      candidates.sort((a, b) => a.name.localeCompare(b.name));
    }
    return candidates;
  }, [stations, originId, originStation]);

  // The map only ever shows a nearby cluster around the origin — plotting
  // all ~2000 stations in a small canvas is an unreadable blob with no
  // sense of scale. Always include the chosen destination even if it falls
  // outside that nearby radius, so a selection never just disappears.
  const NEARBY_COUNT = 40;
  const nearbyStations = useMemo(() => {
    if (!originStation) return [];
    const sorted = [...stations].sort(
      (a, b) => distanceMeters(originStation, a) - distanceMeters(originStation, b),
    );
    const nearest = sorted.slice(0, NEARBY_COUNT);
    if (destinationId && !nearest.some((s) => s.stationId === destinationId)) {
      const destination = stations.find((s) => s.stationId === destinationId);
      if (destination) nearest.push(destination);
    }
    return nearest;
  }, [stations, originStation, destinationId]);

  // Only the most recent change per station, and only for stations in the
  // nearby area shown above — a global feed would mostly show changes from
  // stations nowhere near where you're actually looking.
  const nearbyActivity = useMemo(() => {
    const nearbyIds = new Set(nearbyStations.map((s) => s.stationId));
    const seenStationIds = new Set<string>();
    const deduped: typeof activityLog = [];
    for (const entry of activityLog) {
      if (!nearbyIds.has(entry.stationId) || seenStationIds.has(entry.stationId)) continue;
      seenStationIds.add(entry.stationId);
      deduped.push(entry);
      if (deduped.length >= 5) break;
    }
    return deduped;
  }, [activityLog, nearbyStations]);

  const isFollowing = originStation ? followedIds.has(originStation.stationId) : false;

  function toggleFollow() {
    if (!originStation) return;
    const stationId = originStation.stationId;
    startFollowTransition(async () => {
      if (isFollowing) {
        await unfollowStation(stationId);
      } else {
        await followStation(stationId);
      }
    });
  }

  function submitSaveRoute() {
    if (!originStation || !destinationId) return;
    const formData = new FormData();
    formData.set("originStationId", originStation.stationId);
    formData.set("destinationStationId", destinationId);
    startSaveTransition(async () => {
      await saveRoute(formData);
      setSaveMessage("Route saved.");
    });
  }

  return (
    <section className="rounded-lg border border-divvy-blue/20 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-divvy-blue">
          Plan from a station
        </h2>
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#0a1f3d]/60">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${FRESHNESS_DOT[freshness]}`}
          />
          {FRESHNESS_LABEL[freshness]}
        </span>
      </div>

      {nearbyActivity.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 rounded-lg border border-divvy-blue/10 bg-divvy-blue-light/20 p-3">
          <p className="font-heading text-xs font-bold uppercase tracking-wide text-divvy-blue/70">
            Recent activity nearby
          </p>
          <ul className="flex flex-col gap-1" aria-live="polite">
            {nearbyActivity.map((entry) => {
              const secondsAgo = Math.max(0, Math.round((Date.now() - entry.at) / 1000));
              const justUpdated = secondsAgo < 3;
              return (
                <li
                  key={entry.stationId}
                  className="flex items-center justify-between gap-3 rounded px-2 py-1 text-xs"
                >
                  <span className="flex items-center gap-1.5 truncate text-[#0a1f3d]/80">
                    {justUpdated && (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-divvy-amber"
                      />
                    )}
                    {entry.stationName}
                  </span>
                  <span className="shrink-0 text-[#0a1f3d]/60">
                    {entry.bikes} bikes, {entry.docks} docks
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {!coords && (
          <button
            type="button"
            onClick={findMyLocation}
            disabled={isLocating}
            className="font-heading flex items-center gap-2 self-start rounded-full bg-divvy-blue px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-divvy-blue-dark disabled:opacity-60"
          >
            <LocateFixed aria-hidden="true" size={16} />
            {isLocating ? "Finding you…" : "Find my nearest station"}
          </button>
        )}
        {locationError && <p className="text-sm text-[#0a1f3d]/60">{locationError}</p>}

        <label className="flex flex-col gap-1 text-sm font-medium">
          {coords ? "Or choose a different station" : "Station"}
          <select
            value={originId}
            onChange={(event) => setOriginId(event.target.value)}
            disabled={stationsLoading || stations.length === 0}
            className="rounded border border-divvy-blue/30 px-3 py-2 focus:border-divvy-blue focus:outline-none"
          >
            <option value="" disabled>
              Select a station
            </option>
            {originOptions.map((station) => (
              <option key={station.stationId} value={station.stationId}>
                {station.name}
              </option>
            ))}
          </select>
        </label>
        {distanceToOrigin !== null && (
          <p className="text-sm text-[#0a1f3d]/60">
            {(distanceToOrigin / 1000).toFixed(2)} km away
          </p>
        )}
      </div>

      {coords && stationsLoading && (
        <p className="mt-3 text-sm text-[#0a1f3d]/60">Loading station data…</p>
      )}

      {originStation && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-semibold">{originStation.name}</p>

            {isSignedIn ? (
              <button
                type="button"
                disabled={isFollowPending}
                aria-pressed={isFollowing}
                onClick={toggleFollow}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-divvy-blue disabled:opacity-50 ${
                  isFollowing
                    ? "border-divvy-blue bg-divvy-blue text-white"
                    : "border-divvy-blue text-divvy-blue hover:bg-divvy-blue-light"
                }`}
              >
                <Heart aria-hidden="true" size={14} fill={isFollowing ? "currentColor" : "none"} />
                {isFollowing ? "Following" : "Follow"}
              </button>
            ) : (
              <Link
                href="/sign-up"
                className="font-heading shrink-0 rounded-full border border-divvy-blue px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-divvy-blue hover:bg-divvy-blue-light"
              >
                Sign up to follow
              </Link>
            )}
          </div>

          {originStation.isRenting ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1 rounded-lg bg-divvy-blue-light py-5">
                  <Bike aria-hidden="true" size={32} className="text-divvy-blue" />
                  <span className="font-heading text-5xl font-bold leading-none text-divvy-blue">
                    {originStation.bikesAvailable}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#0a1f3d]/60">
                    Bikes available
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-divvy-green-light py-5">
                  <SquareParking aria-hidden="true" size={32} className="text-divvy-green" />
                  <span className="font-heading text-5xl font-bold leading-none text-divvy-green">
                    {originStation.docksAvailable}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#0a1f3d]/60">
                    Docks open
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-sm text-[#0a1f3d]/70">
                <span className="flex items-center gap-1">
                  <Zap aria-hidden="true" size={14} className="text-divvy-amber" />
                  {originStation.ebikesAvailable} e-bike
                  {originStation.ebikesAvailable === 1 ? "" : "s"}
                </span>
                <span aria-hidden="true">|</span>
                <span className="flex items-center gap-1">
                  <Scooter aria-hidden="true" size={14} className="text-divvy-amber" />
                  {originStation.scootersAvailable} scooter
                  {originStation.scootersAvailable === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#0a1f3d]/60">Not currently renting</p>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowMap((prev) => !prev)}
              className="font-heading flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-divvy-blue hover:underline"
            >
              <MapIcon aria-hidden="true" size={16} />
              {showMap ? "Hide live map" : "Show live map"}
            </button>
            {showMap && (
              <div className="mt-2">
                {nearbyStations.length > 0 ? (
                  <LiveStationMap
                    stations={nearbyStations}
                    originId={originStation.stationId}
                    destinationId={destinationId}
                    userCoords={coords}
                    flashId={flashId}
                    onSelectStation={setOriginId}
                  />
                ) : (
                  <p className="text-sm text-[#0a1f3d]/60">No station data to show yet.</p>
                )}
                <p className="mt-1 text-xs text-[#0a1f3d]/50">
                  Showing the {Math.min(NEARBY_COUNT, nearbyStations.length)} stations nearest
                  your origin (blue) and destination (amber), if chosen. Dot size is bikes
                  available right now — watch one grow or shrink as the worker updates it.
                  Click a dot to plan from that station.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-divvy-blue/15 bg-divvy-blue-light/40 p-4">
            <p className="font-heading text-sm font-bold uppercase tracking-wide text-divvy-blue">
              Plan a route from here
            </p>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Destination station
              <select
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
                className="rounded border border-divvy-blue/30 px-3 py-2 focus:border-divvy-blue focus:outline-none"
              >
                <option value="" disabled>
                  Select a station
                </option>
                {destinationOptions.map((station) => (
                  <option key={station.stationId} value={station.stationId}>
                    {station.name}
                  </option>
                ))}
              </select>
            </label>

            {isSignedIn ? (
              <button
                type="button"
                onClick={submitSaveRoute}
                disabled={!destinationId || isSavePending}
                className="font-heading mt-1 self-start rounded-full bg-divvy-blue px-5 py-2 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-divvy-blue-dark disabled:opacity-50"
              >
                {isSavePending ? "Saving…" : "Save route"}
              </button>
            ) : (
              <Link
                href="/sign-up"
                className="font-heading mt-1 self-start rounded-full border border-divvy-blue px-5 py-2 text-sm font-bold uppercase tracking-wide text-divvy-blue hover:bg-divvy-blue-light"
              >
                Sign up to save this route
              </Link>
            )}

            {saveMessage && (
              <p className="text-sm text-divvy-green" aria-live="polite">
                {saveMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
