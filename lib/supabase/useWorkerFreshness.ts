"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "./client";

export type FreshnessState = "loading" | "fresh" | "stale" | "down";

type WorkerRunRow = {
  id: number;
  ran_at: string;
  success: boolean;
  rows_changed: number;
  error_message: string | null;
};

// The worker runs every ~10s. Three missed runs without a successful one
// means something's actually wrong, not just normal jitter between ticks.
const STALE_AFTER_MS = 30_000;

export function useWorkerFreshness() {
  const supabase = useSupabaseClient();
  const [latestRun, setLatestRun] = useState<WorkerRunRow | null>(null);
  const [state, setState] = useState<FreshnessState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      const { data } = await supabase
        .from("worker_runs")
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setLatestRun(data as WorkerRunRow);
    }

    loadLatest();

    const channel = supabase
      .channel("worker_runs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "worker_runs" },
        (payload) => setLatestRun(payload.new as WorkerRunRow),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    function recompute() {
      if (!latestRun) {
        setState("loading");
        return;
      }
      if (!latestRun.success) {
        setState("down");
        return;
      }
      const age = Date.now() - new Date(latestRun.ran_at).getTime();
      setState(age > STALE_AFTER_MS ? "stale" : "fresh");
    }

    recompute();
    const interval = setInterval(recompute, 5_000);
    return () => clearInterval(interval);
  }, [latestRun]);

  return { state, latestRun };
}
