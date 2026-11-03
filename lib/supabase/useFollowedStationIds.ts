"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSupabaseClient } from "./client";

const EMPTY_IDS = new Set<string>();

export function useFollowedStationIds() {
  const { isSignedIn } = useAuth();
  const supabase = useSupabaseClient();
  const [fetchedIds, setFetchedIds] = useState<Set<string>>(EMPTY_IDS);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    supabase
      .from("followed_stations")
      .select("station_id")
      .then(({ data }) => {
        if (!cancelled && data) {
          setFetchedIds(new Set(data.map((row) => row.station_id as string)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, supabase]);

  // Don't render stale fetched ids once signed out — they just stay cached
  // in state until a future sign-in refetches them.
  return isSignedIn ? fetchedIds : EMPTY_IDS;
}
