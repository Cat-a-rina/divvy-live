import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  computeChangedPricingRows,
  computeChangedRows,
  computeChangedStationInfoRows,
  type DivvyPricingPlan,
  type DivvyStation,
  type DivvyStationInfo,
  type StoredPricingPlan,
  type StoredStation,
  type StoredStationInfo,
} from "./diff.ts";

const STATION_STATUS_URL = "https://gbfs.divvybikes.com/gbfs/en/station_status.json";
const STATION_INFORMATION_URL = "https://gbfs.divvybikes.com/gbfs/en/station_information.json";
const SYSTEM_PRICING_PLANS_URL = "https://gbfs.divvybikes.com/gbfs/en/system_pricing_plans.json";

// PostgREST caps a single request at 1000 rows (db-max-rows) no matter what
// you ask for, with no error — silently truncated. With ~2000 stations, an
// unpaginated select only ever sees half of them, so the other half looks
// "missing" (therefore "new") on every run and gets rewritten forever.
async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
): Promise<T[]> {
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

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const [statusRes, infoRes, pricingRes, existingStatus, existingInfo, existingPricing] =
      await Promise.all([
        fetch(STATION_STATUS_URL),
        fetch(STATION_INFORMATION_URL),
        fetch(SYSTEM_PRICING_PLANS_URL),
        fetchAllRows<StoredStation>(supabase, "station_status_live"),
        fetchAllRows<StoredStationInfo>(supabase, "stations"),
        fetchAllRows<StoredPricingPlan>(supabase, "pricing_plans"),
      ]);

    if (!statusRes.ok) throw new Error(`Divvy station_status request failed: ${statusRes.status}`);
    if (!infoRes.ok) throw new Error(`Divvy station_information request failed: ${infoRes.status}`);
    if (!pricingRes.ok) {
      throw new Error(`Divvy system_pricing_plans request failed: ${pricingRes.status}`);
    }

    const statusBody = await statusRes.json() as { data: { stations: DivvyStation[] } };
    const infoBody = await infoRes.json() as { data: { stations: DivvyStationInfo[] } };
    const pricingBody = await pricingRes.json() as { data: { plans: DivvyPricingPlan[] } };

    const changedStatus = computeChangedRows(statusBody.data.stations, existingStatus);
    const changedInfo = computeChangedStationInfoRows(infoBody.data.stations, existingInfo);
    const changedPricing = computeChangedPricingRows(pricingBody.data.plans, existingPricing);

    if (changedStatus.length > 0) {
      const { error } = await supabase
        .from("station_status_live")
        .upsert(changedStatus, { onConflict: "station_id" });
      if (error) throw error;
    }

    if (changedInfo.length > 0) {
      const { error } = await supabase
        .from("stations")
        .upsert(changedInfo, { onConflict: "station_id" });
      if (error) throw error;
    }

    if (changedPricing.length > 0) {
      const { error } = await supabase
        .from("pricing_plans")
        .upsert(changedPricing, { onConflict: "plan_id" });
      if (error) throw error;
    }

    const rowsChanged = changedStatus.length + changedInfo.length + changedPricing.length;
    await supabase.from("worker_runs").insert({ success: true, rows_changed: rowsChanged });

    return new Response(
      JSON.stringify({
        status_rows_changed: changedStatus.length,
        info_rows_changed: changedInfo.length,
        pricing_rows_changed: changedPricing.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
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
