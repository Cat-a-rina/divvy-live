import { StationBrowser } from "@/components/station-browser";
import { getStations } from "@/lib/divvy/gbfs";
import { getFavoriteStations } from "@/lib/supabase/queries";

// Reads per-request Supabase data scoped to the signed-in user.
export const instant = false;

export default async function StationsPage() {
  const [stations, favorites] = await Promise.all([
    getStations(),
    getFavoriteStations(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">
        Stations
      </h1>
      <StationBrowser
        initialStations={stations}
        favoriteStationIds={favorites.map((f) => f.station_id)}
      />
    </div>
  );
}
