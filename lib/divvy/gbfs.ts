import { cacheLife } from "next/cache";
import type { Station } from "./types";

const STATION_INFORMATION_URL =
  "https://gbfs.divvybikes.com/gbfs/en/station_information.json";
const STATION_STATUS_URL =
  "https://gbfs.divvybikes.com/gbfs/en/station_status.json";

type RawStationInformation = {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
};

type RawStationStatus = {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_scooters_available: number;
  num_docks_available: number;
  is_renting: number;
  is_returning: number;
  last_reported: number;
};

async function getStationInformation(): Promise<
  Map<string, RawStationInformation>
> {
  "use cache";
  cacheLife("hours");

  const res = await fetch(STATION_INFORMATION_URL);
  if (!res.ok) {
    throw new Error(`Divvy station_information request failed: ${res.status}`);
  }
  const body = (await res.json()) as {
    data: { stations: RawStationInformation[] };
  };

  return new Map(body.data.stations.map((station) => [station.station_id, station]));
}

// Divvy's own feed declares a 60s TTL (ttl field in station_status.json) —
// cache no longer than that, since the "minutes" preset's 1-hour expire let
// bike/dock counts go stale far longer than this data is actually live for.
const LIVE_STATUS_CACHE_LIFE = { stale: 30, revalidate: 30, expire: 120 };

async function getStationStatus(): Promise<Map<string, RawStationStatus>> {
  "use cache";
  cacheLife(LIVE_STATUS_CACHE_LIFE);

  const res = await fetch(STATION_STATUS_URL);
  if (!res.ok) {
    throw new Error(`Divvy station_status request failed: ${res.status}`);
  }
  const body = (await res.json()) as {
    data: { stations: RawStationStatus[] };
  };

  return new Map(body.data.stations.map((station) => [station.station_id, station]));
}

export async function getStations(): Promise<Station[]> {
  "use cache";
  cacheLife(LIVE_STATUS_CACHE_LIFE);

  const [information, status] = await Promise.all([
    getStationInformation(),
    getStationStatus(),
  ]);

  const stations: Station[] = [];

  for (const [stationId, info] of information) {
    const stationStatus = status.get(stationId);
    if (!stationStatus) continue;

    stations.push({
      stationId,
      name: info.name,
      lat: info.lat,
      lon: info.lon,
      capacity: info.capacity,
      bikesAvailable: stationStatus.num_bikes_available,
      ebikesAvailable: stationStatus.num_ebikes_available,
      scootersAvailable: stationStatus.num_scooters_available,
      docksAvailable: stationStatus.num_docks_available,
      isRenting: stationStatus.is_renting === 1,
      isReturning: stationStatus.is_returning === 1,
      lastReported: stationStatus.last_reported,
    });
  }

  return stations;
}
