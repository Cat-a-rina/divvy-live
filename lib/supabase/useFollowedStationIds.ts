"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSupabaseClient } from "./client";

export function useFollowedStationIds() {
  const { isSignedIn } = useAuth();
  const supabase = useSupabaseClient();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn) {
      setIds(new Set());
      return;
    }

    let cancelled = false;
    supabase
      .from("followed_stations")
      .select("station_id")
      .then(({ data }) => {
        if (!cancelled && data) {
          setIds(new Set(data.map((row) => row.station_id as string)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, supabase]);

  return ids;
}
