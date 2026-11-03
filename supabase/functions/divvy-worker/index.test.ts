import { assertEquals } from "jsr:@std/assert@1";
import sample from "./fixtures/station_status_sample.json" with { type: "json" };
import { computeChangedRows, type DivvyStation, type StoredStation } from "./diff.ts";

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
