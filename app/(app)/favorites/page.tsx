import { removeFavoriteStation, renameFavoriteStation } from "@/app/actions/stations";
import { getStations } from "@/lib/divvy/gbfs";
import { getFavoriteStations } from "@/lib/supabase/queries";

// Reads per-request Supabase data scoped to the signed-in user.
export const instant = false;

export default async function FavoritesPage() {
  const [stations, favorites] = await Promise.all([
    getStations(),
    getFavoriteStations(),
  ]);
  const stationById = new Map(stations.map((station) => [station.stationId, station]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">
        Favorites
      </h1>

      {favorites.length === 0 && (
        <p className="text-sm text-[#0a1f3d]/60">
          You haven&apos;t favorited any stations yet. Favorite a station from
          the Stations page to see it here.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {favorites.map((favorite) => {
          const station = stationById.get(favorite.station_id);
          return (
            <li
              key={favorite.id}
              className="flex flex-col gap-2 rounded-lg border border-divvy-blue/20 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">
                  {favorite.nickname || station?.name || favorite.station_id}
                </p>
                {favorite.nickname && station && (
                  <p className="text-sm text-[#0a1f3d]/60">{station.name}</p>
                )}
                {station ? (
                  <p className="mt-1 text-sm text-[#0a1f3d]/70">
                    {station.isRenting
                      ? `${station.bikesAvailable} bikes (${station.ebikesAvailable} e-bike${station.ebikesAvailable === 1 ? "" : "s"}) · ${station.docksAvailable} docks open`
                      : "Not currently renting"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#0a1f3d]/50">
                    Station data unavailable right now.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <form
                  action={renameFavoriteStation.bind(null, favorite.id)}
                  className="flex items-center gap-2"
                >
                  <input
                    name="nickname"
                    defaultValue={favorite.nickname ?? ""}
                    placeholder="Add a nickname"
                    className="w-36 rounded border border-divvy-blue/30 px-2 py-1 text-sm focus:border-divvy-blue focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="font-heading text-xs font-semibold uppercase tracking-wide text-divvy-blue hover:underline"
                  >
                    Save
                  </button>
                </form>
                <form action={removeFavoriteStation.bind(null, favorite.id)}>
                  <button
                    type="submit"
                    className="font-heading text-xs font-semibold uppercase tracking-wide text-[#0a1f3d]/50 hover:text-divvy-blue"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
