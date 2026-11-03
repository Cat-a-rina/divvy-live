import { assertEquals } from "jsr:@std/assert@1";
import sample from "./fixtures/station_status_sample.json" with { type: "json" };
import infoSample from "./fixtures/station_information_sample.json" with { type: "json" };
import {
  computeChangedRows,
  computeChangedStationInfoRows,
  type DivvyStation,
  type DivvyStationInfo,
  type StoredStation,
  type StoredStationInfo,
} from "./diff.ts";

const stations = sample.data.stations as DivvyStation[];
const FIXED_NOW = () => new Date("2026-01-01T00:00:00.000Z");

const existingRows: StoredStation[] = [
  {
    station_id: "unchanged-station",
    num_bikes_available: 3,
    num_ebikes_available: 0,
    num_scooters_available: 0,
    num_docks_available: 7,
    is_renting: true,
    is_returning: true,
  },
  {
    station_id: "changed-station",
    num_bikes_available: 9,
    num_ebikes_available: 0,
    num_scooters_available: 0,
    num_docks_available: 8,
    is_renting: true,
    is_returning: true,
  },
];

Deno.test("saves only new or changed stations", () => {
  const changed = computeChangedRows(stations, existingRows, FIXED_NOW);
  assertEquals(
    changed.map((r) => r.station_id).sort(),
    ["changed-station", "new-station", "null-scooters-station"],
  );
});

Deno.test("never re-writes an unchanged station", () => {
  const changed = computeChangedRows(stations, existingRows, FIXED_NOW);
  assertEquals(changed.some((r) => r.station_id === "unchanged-station"), false);
});

Deno.test("a missing scooter count is saved as 0, not null", () => {
  const changed = computeChangedRows(stations, existingRows, FIXED_NOW);
  const row = changed.find((r) => r.station_id === "null-scooters-station");
  assertEquals(row?.num_scooters_available, 0);
});

const infoStations = infoSample.data.stations as DivvyStationInfo[];

const existingInfoRows: StoredStationInfo[] = [
  { station_id: "unchanged-station", name: "Unchanged St", lat: 41.89, lon: -87.62, capacity: 12 },
  { station_id: "renamed-station", name: "Old Name Plaza", lat: 41.90, lon: -87.61, capacity: 20 },
];

Deno.test("station info: saves only new or changed stations", () => {
  const changed = computeChangedStationInfoRows(infoStations, existingInfoRows, FIXED_NOW);
  assertEquals(changed.map((r) => r.station_id).sort(), ["new-station", "renamed-station"]);
});

Deno.test("station info: never re-writes an unchanged station", () => {
  const changed = computeChangedStationInfoRows(infoStations, existingInfoRows, FIXED_NOW);
  assertEquals(changed.some((r) => r.station_id === "unchanged-station"), false);
});

Deno.test("station info: a renamed station is picked up by name, not just id", () => {
  const changed = computeChangedStationInfoRows(infoStations, existingInfoRows, FIXED_NOW);
  const row = changed.find((r) => r.station_id === "renamed-station");
  assertEquals(row?.name, "New Name Plaza");
});

Deno.test("station info: a sub-centimeter lat/lon float round-trip difference is not a real change", () => {
  const divvyStation = {
    station_id: "float-noise-station",
    name: "Float Noise St",
    lat: 41.83068856472101,
    lon: -87.65621066093445,
    capacity: 10,
  };
  const stored = {
    station_id: "float-noise-station",
    name: "Float Noise St",
    // same coordinates, but as if they round-tripped through Postgres and
    // lost a digit of precision in the 13th decimal place
    lat: 41.830688564721,
    lon: -87.6562106609344,
    capacity: 10,
  };
  const changed = computeChangedStationInfoRows([divvyStation], [stored], FIXED_NOW);
  assertEquals(changed.length, 0);
});
