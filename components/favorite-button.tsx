"use client";

import { toggleFavoriteStation } from "@/app/actions/stations";
import { Heart } from "lucide-react";
import { useTransition } from "react";

export function FavoriteButton({
  stationId,
  stationName,
  isFavorited,
}: {
  stationId: string;
  stationName: string;
  isFavorited: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-pressed={isFavorited}
      aria-label={
        isFavorited
          ? `Remove ${stationName} from favorites`
          : `Add ${stationName} to favorites`
      }
      onClick={() => startTransition(() => toggleFavoriteStation(stationId))}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-divvy-blue disabled:opacity-50 ${
        isFavorited
          ? "border-divvy-blue bg-divvy-blue text-white"
          : "border-divvy-blue text-divvy-blue hover:bg-divvy-blue-light"
      }`}
    >
      <Heart
        aria-hidden="true"
        size={14}
        fill={isFavorited ? "currentColor" : "none"}
      />
      {isFavorited ? "Favorited" : "Favorite"}
    </button>
  );
}
