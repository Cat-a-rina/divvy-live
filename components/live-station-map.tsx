"use client";

import type { LiveStation } from "@/lib/supabase/useLiveStations";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const WIDTH = 360;
const HEIGHT = 300;
const PADDING = 24;
const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 19;
const MIN_RADIUS = 4;
const MAX_RADIUS = 14;

type Point = { lat: number; lon: number };
type Bounds = { minLat: number; maxLat: number; minLon: number; maxLon: number };

// Standard Web Mercator slippy-map projection — the same math every tile
// server (OpenStreetMap included) is built around. Converts a lat/lon into
// a pixel position on an infinite world map at a given zoom level.
function lonToPixelX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToPixelY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2
  ) * TILE_SIZE * 2 ** zoom;
}

// Pick the most zoomed-in level where the bounding box of every point we
// need to show still fits inside the canvas — the same "fit bounds" idea
// a map library would do internally. This is only ever the *starting*
// zoom; the +/- controls can go past it in either direction from there.
function chooseZoom(bounds: Bounds) {
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom--) {
    const pxWidth = lonToPixelX(bounds.maxLon, zoom) - lonToPixelX(bounds.minLon, zoom);
    const pxHeight = latToPixelY(bounds.minLat, zoom) - latToPixelY(bounds.maxLat, zoom);
    if (pxWidth <= WIDTH - PADDING * 2 && pxHeight <= HEIGHT - PADDING * 2) {
      return zoom;
    }
  }
  return MIN_ZOOM;
}

function radiusFor(bikesAvailable: number) {
  return Math.min(MAX_RADIUS, MIN_RADIUS + Math.sqrt(bikesAvailable) * 1.8);
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
  const bounds = useMemo<Bounds>(() => {
    const boundsPoints: Point[] = stations.map((s) => ({ lat: s.lat, lon: s.lon }));
    if (userCoords) boundsPoints.push(userCoords);
    const lats = boundsPoints.map((p) => p.lat);
    const lons = boundsPoints.map((p) => p.lon);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    };
  }, [stations, userCoords]);

  const autoZoom = useMemo(() => chooseZoom(bounds), [bounds]);

  // Manual zoom overrides the auto-fit level until a new origin is chosen,
  // at which point it's worth re-fitting to the new area rather than
  // keeping whatever zoom happened to be set for the old one.
  const [zoomOverride, setZoomOverride] = useState<number | null>(null);
  const prevOriginIdRef = useRef(originId);
  useEffect(() => {
    if (prevOriginIdRef.current !== originId) {
      prevOriginIdRef.current = originId;
      setZoomOverride(null);
    }
  }, [originId]);

  const zoom = zoomOverride ?? autoZoom;

  const { tiles, project } = useMemo(() => {
    const centerLon = (bounds.minLon + bounds.maxLon) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const originPixelX = lonToPixelX(centerLon, zoom) - WIDTH / 2;
    const originPixelY = latToPixelY(centerLat, zoom) - HEIGHT / 2;

    const startTileX = Math.floor(originPixelX / TILE_SIZE);
    const endTileX = Math.floor((originPixelX + WIDTH) / TILE_SIZE);
    const startTileY = Math.floor(originPixelY / TILE_SIZE);
    const endTileY = Math.floor((originPixelY + HEIGHT) / TILE_SIZE);
    const maxTileIndex = 2 ** zoom - 1;

    const tiles: { x: number; y: number; left: number; top: number }[] = [];
    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        if (tx < 0 || ty < 0 || tx > maxTileIndex || ty > maxTileIndex) continue;
        tiles.push({
          x: tx,
          y: ty,
          left: tx * TILE_SIZE - originPixelX,
          top: ty * TILE_SIZE - originPixelY,
        });
      }
    }

    const project = (point: Point) => ({
      x: lonToPixelX(point.lon, zoom) - originPixelX,
      y: latToPixelY(point.lat, zoom) - originPixelY,
    });

    return { tiles, project };
  }, [bounds, zoom]);

  function zoomIn() {
    setZoomOverride(Math.min(MAX_ZOOM, zoom + 1));
  }

  function zoomOut() {
    setZoomOverride(Math.max(MIN_ZOOM, zoom - 1));
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-divvy-blue/15 bg-[#e8ecef]"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      {tiles.map((tile) => (
        <img
          key={`${tile.x}-${tile.y}`}
          src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
          alt=""
          loading="lazy"
          style={{
            position: "absolute",
            left: tile.left,
            top: tile.top,
            width: TILE_SIZE,
            height: TILE_SIZE,
          }}
        />
      ))}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Nearby stations plotted on real streets, sized by how many bikes are currently available. The origin is marked in blue, the destination in amber. Click a dot to plan from that station."
        className="absolute inset-0"
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
                  isOrigin ? "#0057a3" : isDestination ? "#b45309" : "rgba(47, 125, 79, 0.75)"
                }
                stroke={isFlashing ? "#b45309" : "white"}
                strokeWidth={isFlashing ? 2.5 : 1.5}
                onClick={() => onSelectStation(station.stationId)}
              >
                <title>
                  {station.name}: {station.bikesAvailable} bikes, {station.docksAvailable} docks
                </title>
              </circle>
              {label && (
                <text
                  x={x}
                  y={y - radius - 5}
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-[#0a1f3d] text-[9px] font-semibold uppercase tracking-wide"
                  style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}
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
              style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}
            >
              You
            </text>
          </g>
        )}
      </svg>

      <div className="absolute right-1 top-1 flex flex-col overflow-hidden rounded border border-divvy-blue/20 bg-white/90 shadow-sm">
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="flex h-7 w-7 items-center justify-center text-divvy-blue hover:bg-divvy-blue-light disabled:opacity-30"
        >
          <Plus aria-hidden="true" size={14} />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="flex h-7 w-7 items-center justify-center border-t border-divvy-blue/20 text-divvy-blue hover:bg-divvy-blue-light disabled:opacity-30"
        >
          <Minus aria-hidden="true" size={14} />
        </button>
      </div>

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-0.5 right-1 rounded bg-white/80 px-1 text-[9px] text-[#0a1f3d]/70 hover:underline"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
