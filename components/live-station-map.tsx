"use client";

import type { LiveStation } from "@/lib/supabase/useLiveStations";
import { useMemo } from "react";

const WIDTH = 360;
const HEIGHT = 300;
const PADDING = 24;
const MIN_RADIUS = 4;
const MAX_RADIUS = 18;

type Point = { lat: number; lon: number };

function buildProjector(boundsPoints: Point[]) {
  const lats = boundsPoints.map((p) => p.lat);
  const lons = boundsPoints.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;

  return (point: Point) => ({
    x: PADDING + (maxLon === minLon
      ? innerWidth / 2
      : ((point.lon - minLon) / (maxLon - minLon)) * innerWidth),
    // Flip vertically: latitude increases northward, screen y increases downward.
    y: PADDING + (maxLat === minLat
      ? innerHeight / 2
      : ((maxLat - point.lat) / (maxLat - minLat)) * innerHeight),
  });
}

function radiusFor(bikesAvailable: number) {
  return Math.min(MAX_RADIUS, MIN_RADIUS + Math.sqrt(bikesAvailable) * 2.2);
}

export function LiveStationMap({
  stations,
  originId,
  destinationId,
  userCoords,
  flashId,
  onSelectStation,
}: {
  stations: LiveStation[];
  originId: string;
  destinationId: string;
  userCoords?: { lat: number; lon: number } | null;
  flashId?: string | null;
  onSelectStation: (stationId: string) => void;
}) {
  const project = useMemo(() => {
    const boundsPoints: Point[] = stations.map((s) => ({ lat: s.lat, lon: s.lon }));
    if (userCoords) boundsPoints.push(userCoords);
    return buildProjector(boundsPoints);
  }, [stations, userCoords]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Nearby stations plotted by location, sized by how many bikes are currently available. The origin is marked in blue, the destination in amber. Click a dot to plan from that station."
      className="h-auto w-full rounded-lg border border-divvy-blue/15 bg-divvy-blue-light/30"
    >
      {stations.map((station) => {
        const { x, y } = project(station);
        const isOrigin = station.stationId === originId;
        const isDestination = station.stationId === destinationId;
        const label = isOrigin ? "Origin" : isDestination ? "Destination" : null;
        const isFlashing = station.stationId === flashId;
        const radius = radiusFor(station.bikesAvailable);
        return (
          <g key={station.stationId}>
            {isFlashing && (
              <circle
                cx={x}
                cy={y}
                r={radius + 6}
                fill="none"
                stroke="#b45309"
                strokeWidth={2}
                className="animate-ping"
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={radius}
              className="cursor-pointer transition-[r] duration-500 ease-out"
              fill={
                isOrigin ? "#0057a3" : isDestination ? "#b45309" : "rgba(47, 125, 79, 0.55)"
              }
              stroke={isFlashing ? "#b45309" : isOrigin || isDestination ? "white" : "none"}
              strokeWidth={isFlashing ? 2.5 : isOrigin || isDestination ? 1.5 : 0}
              onClick={() => onSelectStation(station.stationId)}
            >
              <title>
                {station.name}: {station.bikesAvailable} bikes, {station.docksAvailable} docks
              </title>
            </circle>
            {label && (
              <text
                x={x}
                y={y - radiusFor(station.bikesAvailable) - 5}
                textAnchor="middle"
                className="pointer-events-none select-none fill-[#0a1f3d] text-[9px] font-semibold uppercase tracking-wide"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}

      {userCoords && (
        <g>
          <circle
            cx={project(userCoords).x}
            cy={project(userCoords).y}
            r={5}
            fill="white"
            stroke="#0057a3"
            strokeWidth={2}
          >
            <title>Your location</title>
          </circle>
          <text
            x={project(userCoords).x}
            y={project(userCoords).y - 10}
            textAnchor="middle"
            className="pointer-events-none select-none fill-[#0a1f3d] text-[9px] font-semibold uppercase tracking-wide"
          >
            You
          </text>
        </g>
      )}
    </svg>
  );
}
