import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Station } from "./types";

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
  last_reported: string;
};

// Supabase's REST API caps a single request at 1000 rows no matter what you
// ask for — paginate, or ~half the stations silently vanish from the result.
async function fetchAllRows<T>(table: string): Promise<T[]> {
  const supabase = await createSupabaseServerClient();
  const pageSize = 1000;
  const rows: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

// Every station's live data comes from our own database, kept current by
// the divvy-worker Edge Function on a schedule — nothing in this app calls
// Divvy's API directly. That's the worker's job alone.
export async function getStations(): Promise<Station[]> {
  const [info, status] = await Promise.all([
    fetchAllRows<StationInfoRow>("stations"),
    fetchAllRows<StationStatusRow>("station_status_live"),
  ]);

  const statusById = new Map(status.map((row) => [row.station_id, row]));
  const stations: Station[] = [];

  for (const row of info) {
    const s = statusById.get(row.station_id);
    if (!s) continue;

    stations.push({
      stationId: row.station_id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      capacity: row.capacity,
      bikesAvailable: s.num_bikes_available,
      ebikesAvailable: s.num_ebikes_available,
      scootersAvailable: s.num_scooters_available,
      docksAvailable: s.num_docks_available,
      isRenting: s.is_renting,
      isReturning: s.is_returning,
      lastReported: Math.floor(new Date(s.last_reported).getTime() / 1000),
    });
  }

  return stations;
}
