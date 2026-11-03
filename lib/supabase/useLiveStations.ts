"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabaseClient } from "./client";

export type LiveStation = {
  stationId: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  bikesAvailable: number;
  ebikesAvailable: number;
  scootersAvailable: number;
  docksAvailable: number;
  isRenting: boolean;
  isReturning: boolean;
};

type StationInfoRow = {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
};

type StationStatusRow = {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_scooters_available: number;
  num_docks_available: number;
  is_renting: boolean;
  is_returning: boolean;
};

// Supabase's REST API caps a single request at 1000 rows no matter what you
// ask for — fetch in pages so this doesn't silently drop half the stations
// the same way it did inside the worker before that got fixed.
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  let offset = 0;
  while (true) {
    const { data } = await query(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

function mergeStation(
  info: StationInfoRow,
  status: StationStatusRow | undefined,
): LiveStation | null {
  if (!status) return null;
  return {
    stationId: info.station_id,
    name: info.name,
    lat: info.lat,
    lon: info.lon,
    capacity: info.capacity,
    bikesAvailable: status.num_bikes_available,
    ebikesAvailable: status.num_ebikes_available,
    scootersAvailable: status.num_scooters_available,
    docksAvailable: status.num_docks_available,
    isRenting: status.is_renting,
    isReturning: status.is_returning,
  };
}

export type LiveUpdate = { stationId: string; at: number };

export type ActivityLogEntry = {
  stationId: string;
  stationName: string;
  bikes: number;
  docks: number;
  at: number;
};

// Kept generously large because the caller filters this down to just the
// stations near a chosen origin — if this capped at 5 globally, a system
// with ~2000 stations would almost never have any of those 5 land nearby.
const ACTIVITY_LOG_LIMIT = 100;

export function useLiveStations() {
  const supabase = useSupabaseClient();
  const [stations, setStations] = useState<Map<string, LiveStation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<LiveUpdate | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  // The Realtime handler below is created once and closes over whatever
  // `stations` was at subscribe-time — it needs the *current* map to look up
  // "what was this station's value right before this update," so track that
  // separately in a ref instead of relying on the stale closure.
  const stationsRef = useRef(stations);
  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const [info, status] = await Promise.all([
        fetchAllRows<StationInfoRow>((from, to) =>
          supabase.from("stations").select("station_id, name, lat, lon, capacity").range(from, to)
        ),
        fetchAllRows<StationStatusRow>((from, to) =>
          supabase.from("station_status_live").select("*").range(from, to)
        ),
      ]);
      if (cancelled) return;

      const statusById = new Map(status.map((s) => [s.station_id, s]));
      const merged = new Map<string, LiveStation>();
      for (const row of info) {
        const station = mergeStation(row, statusById.get(row.station_id));
        if (station) merged.set(station.stationId, station);
      }
      setStations(merged);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel("station_status_live_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "station_status_live" },
        (payload) => {
          const row = payload.new as StationStatusRow | undefined;
          if (!row) return;
          const existing = stationsRef.current.get(row.station_id);
          if (!existing) return;

          // The worker only ever upserts a row when something genuinely
          // changed (that's the whole point of its diffing) — so every
          // event received here corresponds to a real change, not noise.
          setLastUpdate({ stationId: row.station_id, at: Date.now() });
          setUpdateCount((count) => count + 1);
          setActivityLog((log) =>
            [
              {
                stationId: row.station_id,
                stationName: existing.name,
                bikes: row.num_bikes_available,
                docks: row.num_docks_available,
                at: Date.now(),
              },
              ...log,
            ].slice(0, ACTIVITY_LOG_LIMIT)
          );
          setStations((prev) => {
            const next = new Map(prev);
            next.set(row.station_id, {
              ...existing,
              bikesAvailable: row.num_bikes_available,
              ebikesAvailable: row.num_ebikes_available,
              scootersAvailable: row.num_scooters_available,
              docksAvailable: row.num_docks_available,
              isRenting: row.is_renting,
              isReturning: row.is_returning,
            });
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return {
    stations: Array.from(stations.values()),
    loading,
    lastUpdate,
    updateCount,
    activityLog,
  };
}
