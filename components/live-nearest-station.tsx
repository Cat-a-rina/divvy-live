"use client";

import { followStation, unfollowStation } from "@/app/actions/follows";
import { saveRoute } from "@/app/actions/routes";
import { LiveStationMap } from "@/components/live-station-map";
import { StationSelect } from "@/components/station-select";
import { distanceMeters } from "@/lib/divvy/distance";
import type { LiveStation } from "@/lib/supabase/useLiveStations";
import { useFollowedStationIds } from "@/lib/supabase/useFollowedStationIds";
import { useLiveStations } from "@/lib/supabase/useLiveStations";
import { useWorkerFreshness } from "@/lib/supabase/useWorkerFreshness";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import {
  Bike,
  Heart,
  LocateFixed,
  Map as MapIcon,
  Scooter,
  SquareParking,
  X,
  Zap,
} from "lucide-react";
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
  const [waypointIds, setWaypointIds] = useState<string[]>([""]);
  const [showMap, setShowMap] = useState(false);
  const [isFollowPending, startFollowTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Reading the clock has to happen as state, not a bare Date.now() call
  // during render — render must stay pure, so "now" is only ever updated
  // from inside an effect/interval, never read live off the wall clock.
  const [now, setNow] = useState(() => Date.now());
  const autoOriginSet = useRef(false);

  // Tick once a second so "N seconds ago" and the flash below stay accurate.
  useEffect(() => {
    if (!lastUpdate) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Briefly highlight whichever dot just changed, so a real-time update is
  // something you can actually see happen, not just infer from a number.
  // Derived rather than its own state+effect, since it's fully determined
  // by values we already have.
  const flashId = lastUpdate && now - lastUpdate.at < 1200 ? lastUpdate.stationId : null;

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

  // Waypoints are kept as an ordered list of slots (some possibly still
  // empty while being picked); only the filled-in ones form the real route.
  const validWaypointIds = waypointIds.filter((id): id is string => Boolean(id));
  const waypointStations = validWaypointIds
    .map((id) => stations.find((s) => s.stationId === id))
    .filter((s): s is LiveStation => Boolean(s));
  const finalDestinationId = waypointStations.at(-1)?.stationId ?? "";

  const totalRouteDistance = (() => {
    if (!originStation || waypointStations.length === 0) return null;
    const chain = [originStation, ...waypointStations];
    let total = 0;
    for (let i = 0; i < chain.length - 1; i++) {
      total += distanceMeters(chain[i], chain[i + 1]);
    }
    return total;
  })();

  function optionsForWaypoint(index: number): LiveStation[] {
    const referenceStation = index === 0
      ? originStation
      : stations.find((s) => s.stationId === waypointIds[index - 1]) ?? null;
    const excludeIds = new Set(
      [originId, ...waypointIds.filter((id, i) => i !== index)].filter(Boolean),
    );
    const candidates = stations.filter((s) => !excludeIds.has(s.stationId));
    if (referenceStation) {
      candidates.sort(
        (a, b) => distanceMeters(referenceStation, a) - distanceMeters(referenceStation, b),
      );
    } else {
      candidates.sort((a, b) => a.name.localeCompare(b.name));
    }
    return candidates;
  }

  function updateWaypoint(index: number, stationId: string) {
    setWaypointIds((prev) => prev.map((id, i) => (i === index ? stationId : id)));
  }

  function addWaypoint() {
    setWaypointIds((prev) => [...prev, ""]);
  }

  function removeWaypoint(index: number) {
    setWaypointIds((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  // The map only ever shows a nearby cluster around the origin — plotting
  // all ~2000 stations in a small canvas is an unreadable blob with no
  // sense of scale. Always include chosen stops even if they fall outside
  // that nearby radius, so a selection never just disappears.
  const NEARBY_COUNT = 40;
  const validWaypointKey = validWaypointIds.join(",");
  const nearbyStations = useMemo(() => {
    if (!originStation) return [];
    const sorted = [...stations].sort(
      (a, b) => distanceMeters(originStation, a) - distanceMeters(originStation, b),
    );
    const nearest = sorted.slice(0, NEARBY_COUNT);
    const nearestIds = new Set(nearest.map((s) => s.stationId));
    for (const id of validWaypointIds) {
      if (!nearestIds.has(id)) {
        const station = stations.find((s) => s.stationId === id);
        if (station) {
          nearest.push(station);
          nearestIds.add(id);
        }
      }
    }
    return nearest;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, originStation, validWaypointKey]);

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
    if (!originStation || waypointStations.length === 0) return;
    const destination = waypointStations.at(-1)!;
    const stops = waypointStations.slice(0, -1).map((s) => s.stationId);
    const formData = new FormData();
    formData.set("originStationId", originStation.stationId);
    formData.set("destinationStationId", destination.stationId);
    formData.set("stops", JSON.stringify(stops));
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
              const secondsAgo = Math.max(0, Math.round((now - entry.at) / 1000));
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

        <div className="flex items-center justify-between gap-3">
          <StationSelect
            ariaLabel="Choose a station"
            value={originId}
            onChange={setOriginId}
            disabled={stationsLoading || stations.length === 0}
            options={originOptions.map((s) => ({ id: s.stationId, label: s.name }))}
            className="flex-1"
          />

          {originStation && (
            isSignedIn ? (
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
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="font-heading shrink-0 rounded-full border border-divvy-blue px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-divvy-blue hover:bg-divvy-blue-light"
                >
                  Sign up to follow
                </button>
              </SignUpButton>
            )
          )}
        </div>

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
                  <Bike aria-hidden="true" size={14} className="text-divvy-blue" />
                  {Math.max(originStation.bikesAvailable - originStation.ebikesAvailable, 0)}{" "}
                  classic
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
                    destinationId={finalDestinationId}
                    userCoords={coords}
                    flashId={flashId}
                    onSelectStation={setOriginId}
                  />
                ) : (
                  <p className="text-sm text-[#0a1f3d]/60">No station data to show yet.</p>
                )}
                <p className="mt-1 text-xs text-[#0a1f3d]/50">
                  Showing the {Math.min(NEARBY_COUNT, nearbyStations.length)} stations nearest
                  your origin (blue) and final stop (amber), if chosen. Dot size is bikes
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

            {waypointIds.map((waypointId, index) => (
              <div key={index} className="flex items-center gap-2">
                <StationSelect
                  ariaLabel={index === 0 ? "Destination station" : `Stop ${index + 1}`}
                  value={waypointId}
                  onChange={(id) => updateWaypoint(index, id)}
                  options={optionsForWaypoint(index).map((s) => ({ id: s.stationId, label: s.name }))}
                  className="flex-1"
                />
                {waypointIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWaypoint(index)}
                    aria-label={`Remove stop ${index + 1}`}
                    className="shrink-0 text-[#0a1f3d]/50 hover:text-[#0a1f3d]"
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addWaypoint}
              className="font-heading self-start text-xs font-semibold uppercase tracking-wide text-divvy-blue hover:underline"
            >
              + Add another stop
            </button>

            {totalRouteDistance !== null && (
              <p className="text-sm text-[#0a1f3d]/60">
                Total: {(totalRouteDistance / 1000).toFixed(2)} km across{" "}
                {waypointStations.length + 1} stations (straight-line estimate)
              </p>
            )}

            {isSignedIn ? (
              <button
                type="button"
                onClick={submitSaveRoute}
                disabled={waypointStations.length === 0 || isSavePending}
                className="font-heading mt-1 self-start rounded-full bg-divvy-blue px-5 py-2 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-divvy-blue-dark disabled:opacity-50"
              >
                {isSavePending ? "Saving…" : "Save route"}
              </button>
            ) : (
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="font-heading mt-1 self-start rounded-full border border-divvy-blue px-5 py-2 text-sm font-bold uppercase tracking-wide text-divvy-blue hover:bg-divvy-blue-light"
                >
                  Sign up to save this route
                </button>
              </SignUpButton>
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
