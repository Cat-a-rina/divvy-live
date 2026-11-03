"use client";

import { CloudOff } from "lucide-react";
import { useEffect } from "react";

export function RouteError({
  error,
  retry,
  message = "Couldn't load this page",
}: {
  error: unknown;
  retry: () => void;
  message?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-divvy-blue/20 bg-white p-10 text-center">
      <CloudOff aria-hidden="true" size={32} className="text-divvy-blue/50" />
      <p className="font-heading text-lg font-bold uppercase tracking-wide text-divvy-blue">
        {message}
      </p>
      <p className="max-w-xs text-sm text-[#0a1f3d]/60">
        Divvy&apos;s live data (or our own servers) might be temporarily
        unavailable. Give it a moment and try again.
      </p>
      <button
        type="button"
        onClick={retry}
        className="font-heading mt-1 rounded-full bg-divvy-blue px-6 py-2 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-divvy-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-divvy-blue"
      >
        Try again
      </button>
    </div>
  );
}
