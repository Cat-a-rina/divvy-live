import { createClient } from "jsr:@supabase/supabase-js@2";

const STATION_STATUS_URL = "https://gbfs.divvybikes.com/gbfs/en/station_status.json";

type DivvyStation = {
  station_id: string;
  num_bikes_available: number | null;
  num_ebikes_available: number | null;
  num_scooters_available: number | null;
  num_docks_available: number | null;
  is_renting: number;
  is_returning: number;
  last_reported: number;
};

type StoredStation = {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_scooters_available: number;
  num_docks_available: number;
  is_renting: boolean;
  is_returning: boolean;
};

function hasChanged(divvy: DivvyStation, stored: StoredStation | undefined): boolean {
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

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const [divvyRes, { data: existingRows, error: fetchError }] = await Promise.all([
      fetch(STATION_STATUS_URL),
      supabase.from("station_status_live").select("*"),
    ]);

    if (!divvyRes.ok) throw new Error(`Divvy request failed: ${divvyRes.status}`);
    if (fetchError) throw fetchError;

    const body = await divvyRes.json() as { data: { stations: DivvyStation[] } };
    const existingById = new Map(
      (existingRows ?? []).map((row) => [row.station_id, row as StoredStation]),
    );

    const changed = body.data.stations
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
        updated_at: new Date().toISOString(),
      }));

    if (changed.length > 0) {
      const { error: upsertError } = await supabase
        .from("station_status_live")
        .upsert(changed, { onConflict: "station_id" });
      if (upsertError) throw upsertError;
    }

    await supabase.from("worker_runs").insert({ success: true, rows_changed: changed.length });

    return new Response(JSON.stringify({ rows_changed: changed.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}));
    console.error("divvy-worker failed:", message);
    await supabase.from("worker_runs").insert({
      success: false,
      rows_changed: 0,
      error_message: message,
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
