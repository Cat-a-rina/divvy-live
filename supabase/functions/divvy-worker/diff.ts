export type DivvyStation = {
  station_id: string;
  num_bikes_available: number | null;
  num_ebikes_available: number | null;
  num_scooters_available: number | null;
  num_docks_available: number | null;
  is_renting: number;
  is_returning: number;
  last_reported: number;
};

export type StoredStation = {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_scooters_available: number;
  num_docks_available: number;
  is_renting: boolean;
  is_returning: boolean;
};

export type UpsertRow = StoredStation & {
  last_reported: string;
  updated_at: string;
};

export function hasChanged(divvy: DivvyStation, stored: StoredStation | undefined): boolean {
  if (!stored) return true;
  return (
    (divvy.num_bikes_available ?? 0) !== stored.num_bikes_available ||
    (divvy.num_ebikes_available ?? 0) !== stored.num_ebikes_available ||
    (divvy.num_scooters_available ?? 0) !== stored.num_scooters_available ||
    (divvy.num_docks_available ?? 0) !== stored.num_docks_available ||
    (divvy.is_renting === 1) !== stored.is_renting ||
    (divvy.is_returning === 1) !== stored.is_returning
  );
}

export function computeChangedRows(
  stations: DivvyStation[],
  existingRows: StoredStation[],
  now: () => Date = () => new Date(),
): UpsertRow[] {
  const existingById = new Map(existingRows.map((row) => [row.station_id, row]));

  return stations
    .filter((s) => hasChanged(s, existingById.get(s.station_id)))
    .map((s) => ({
      station_id: s.station_id,
      num_bikes_available: s.num_bikes_available ?? 0,
      num_ebikes_available: s.num_ebikes_available ?? 0,
      num_scooters_available: s.num_scooters_available ?? 0,
      num_docks_available: s.num_docks_available ?? 0,
      is_renting: s.is_renting === 1,
      is_returning: s.is_returning === 1,
      last_reported: new Date(s.last_reported * 1000).toISOString(),
      updated_at: now().toISOString(),
    }));
}
