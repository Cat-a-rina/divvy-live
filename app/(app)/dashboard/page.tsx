import { NearestStationCard } from "@/components/nearest-station-card";
import { getStations } from "@/lib/divvy/gbfs";
import { getFavoriteStations, getSavedRoutes } from "@/lib/supabase/queries";
import { currentUser } from "@clerk/nextjs/server";
import { Route as RouteIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// Reads per-request auth + Supabase data, so it can't produce a static shell.
export const instant = false;

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user?.publicMetadata.onboarded) {
    redirect("/onboarding");
  }

  const displayName =
    (user.publicMetadata.displayName as string | undefined) || user.firstName;

  const [stations, favorites, savedRoutes] = await Promise.all([
    getStations(),
    getFavoriteStations(),
    getSavedRoutes(),
  ]);

  const stationNameById = new Map(
    stations.map((station) => [station.stationId, station.name]),
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="font-heading text-sm font-semibold uppercase tracking-widest text-divvy-blue">
        Welcome back{displayName ? `, ${displayName}` : ""}
      </p>

      <NearestStationCard
        stations={stations}
        favoriteStationIds={favorites.map((f) => f.station_id)}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-divvy-blue">
            Your routes
          </h2>
          <Link
            href="/routes"
            className="text-sm font-semibold text-divvy-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-divvy-blue"
          >
            Manage →
          </Link>
        </div>

        {savedRoutes.length === 0 ? (
          <p className="rounded-lg border border-divvy-blue/20 bg-white p-4 text-sm text-[#0a1f3d]/60">
            No saved routes yet.{" "}
            <Link href="/routes" className="font-semibold text-divvy-blue hover:underline">
              Plan one
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {savedRoutes.slice(0, 3).map((route) => (
              <li
                key={route.id}
                className="flex items-center gap-3 rounded-lg border border-divvy-blue/20 bg-white p-3 text-sm"
              >
                <RouteIcon
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-divvy-blue"
                />
                <div>
                  {route.label && <p className="font-semibold">{route.label}</p>}
                  <p className="text-[#0a1f3d]/70">
                    {stationNameById.get(route.origin_station_id) ??
                      route.origin_station_id}{" "}
                    →{" "}
                    {stationNameById.get(route.destination_station_id) ??
                      route.destination_station_id}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
