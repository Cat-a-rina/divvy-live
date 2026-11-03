import { createClient } from "jsr:@supabase/supabase-js@2";
import { computeChangedRows, type DivvyStation } from "./diff.ts";

const STATION_STATUS_URL = "https://gbfs.divvybikes.com/gbfs/en/station_status.json";

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
    const changed = computeChangedRows(body.data.stations, existingRows ?? []);

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
