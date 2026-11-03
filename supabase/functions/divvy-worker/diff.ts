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

export type DivvyStationInfo = {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
};

export type StoredStationInfo = {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
};

// Lat/lon round-trip through JSON <-> Postgres double precision can shift by
// a tiny amount (around the 13th decimal digit) with no real-world meaning —
// comparing floats with exact equality would flag that as "changed" forever.
const COORDINATE_TOLERANCE_DEGREES = 1e-7; // ~1cm at the equator

function coordinatesDiffer(a: number, b: number): boolean {
  return Math.abs(a - b) > COORDINATE_TOLERANCE_DEGREES;
}

export function hasInfoChanged(
  divvy: DivvyStationInfo,
  stored: StoredStationInfo | undefined,
): boolean {
  if (!stored) return true;
  return (
    divvy.name !== stored.name ||
    coordinatesDiffer(divvy.lat, stored.lat) ||
    coordinatesDiffer(divvy.lon, stored.lon) ||
    divvy.capacity !== stored.capacity
  );
}

export function computeChangedStationInfoRows(
  stations: DivvyStationInfo[],
  existingRows: StoredStationInfo[],
  now: () => Date = () => new Date(),
): (StoredStationInfo & { updated_at: string })[] {
  const existingById = new Map(existingRows.map((row) => [row.station_id, row]));

  return stations
    .filter((s) => hasInfoChanged(s, existingById.get(s.station_id)))
    .map((s) => ({
      station_id: s.station_id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      capacity: s.capacity,
      updated_at: now().toISOString(),
    }));
}

export type DivvyPricingPlan = {
  plan_id: string;
  price: string;
  description: string;
};

export type StoredPricingPlan = {
  plan_id: string;
  unlock_fee: number;
  per_minute_rate: number;
};

const PRICING_TOLERANCE = 1e-6;

function pricingDiffers(a: number, b: number): boolean {
  return Math.abs(a - b) > PRICING_TOLERANCE;
}

function parsePerMinuteRate(description: string): number {
  const match = description.match(/\$([\d.]+) per minute/);
  return match ? Number.parseFloat(match[1]) : 0;
}

export function hasPricingChanged(
  divvy: StoredPricingPlan,
  stored: StoredPricingPlan | undefined,
): boolean {
  if (!stored) return true;
  return (
    pricingDiffers(divvy.unlock_fee, stored.unlock_fee) ||
    pricingDiffers(divvy.per_minute_rate, stored.per_minute_rate)
  );
}

export function computeChangedPricingRows(
  plans: DivvyPricingPlan[],
  existingRows: StoredPricingPlan[],
  now: () => Date = () => new Date(),
): (StoredPricingPlan & { updated_at: string })[] {
  const parsed = plans.map((plan) => ({
    plan_id: plan.plan_id,
    unlock_fee: Number.parseFloat(plan.price),
    per_minute_rate: parsePerMinuteRate(plan.description),
  }));
  const existingById = new Map(existingRows.map((row) => [row.plan_id, row]));

  return parsed
    .filter((plan) => hasPricingChanged(plan, existingById.get(plan.plan_id)))
    .map((plan) => ({ ...plan, updated_at: now().toISOString() }));
}
